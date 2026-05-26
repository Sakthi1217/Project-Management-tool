import { Router, Request, Response } from 'express';
import { requireRole, authMiddleware } from '../middleware/auth.js';
import { getTeamWorkload } from '../services/jira.js';
import { getOne } from '../db/database.js';

const router = Router();

// Endpoint to fetch all active Jira workload for the team
router.get('/workload', authMiddleware, requireRole('admin', 'editor', 'viewer'), async (req: Request, res: Response) => {
  try {
    const workload = await getTeamWorkload();
    res.json(workload);
  } catch (err: any) {
    console.error('Error fetching Jira workload:', err);
    res.status(500).json({ error: 'Failed to fetch Jira workload' });
  }
});

// Endpoint for Jira Webhook to update local task progress when Jira issue status changes
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { webhookEvent, issue } = req.body;
    
    if (webhookEvent === 'jira:issue_updated' && issue && issue.key) {
      const statusName = issue.fields?.status?.name?.toLowerCase();
      let progress = 0;
      let estado = 'pendiente';
      
      if (statusName === 'done' || statusName === 'completed') {
        progress = 100;
        estado = 'completada';
      } else if (statusName === 'in progress' || statusName === 'active') {
        progress = 50; // default for in progress
        estado = 'en_progreso';
      }

      // Find local task linked to this Jira issue
      const localTask = await getOne('SELECT id FROM tareas WHERE jira_issue_key = $1', [issue.key]);
      
      if (localTask) {
        await getOne(
          'UPDATE tareas SET porcentaje_avance = $1, estado = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
          [progress, estado, localTask.id]
        );
        console.log(`Successfully synced Jira issue ${issue.key} status to local task ${localTask.id}`);
      }
    }
    
    res.status(200).send('OK');
  } catch (err) {
    console.error('Jira webhook error:', err);
    res.status(500).send('Webhook processing failed');
  }
});

// Endpoint for Jira Automation to validate if a task can be started (Phase Lock)
router.get('/validate-phase/:issueKey', async (req: Request, res: Response) => {
  try {
    const issueKey = req.params.issueKey;
    const currentTask = await getOne('SELECT id, proyecto_id, orden FROM tareas WHERE jira_issue_key = $1', [issueKey]);
    
    if (!currentTask) {
      // If it's not linked to a local task, we allow the transition by default
      res.json({ allowed: true });
      return;
    }

    const prevTask = await getOne(`
      SELECT estado, porcentaje_avance FROM tareas 
      WHERE proyecto_id = $1 AND orden < $2
      ORDER BY orden DESC LIMIT 1
    `, [currentTask.proyecto_id, currentTask.orden]);

    if (prevTask && (prevTask.porcentaje_avance < 100 || prevTask.estado !== 'completada')) {
      res.json({ 
        allowed: false, 
        message: 'Cannot start this task until the previous phase/task is 100% completed.' 
      });
      return;
    }

    res.json({ allowed: true });
  } catch (err) {
    console.error('Phase validation error:', err);
    res.status(500).json({ allowed: false, error: 'Internal server error' });
  }
});

export default router;
