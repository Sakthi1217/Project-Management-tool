import { Router } from 'express';
import { PhaseTrackerService } from './PhaseService.js';

const router = Router();

// Get all phases for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const phases = await PhaseTrackerService.getPhasesByProjectId(Number(req.params.projectId));
    res.json(phases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get members for a phase
router.get('/:phaseId/members', async (req, res) => {
  try {
    const members = await PhaseTrackerService.getMembersByPhaseId(Number(req.params.phaseId));
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a phase
router.post('/', async (req, res) => {
  try {
    const phase = await PhaseTrackerService.createPhase(req.body);
    res.status(201).json(phase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start a phase (Validates previous phase is 100% complete)
router.post('/:phaseId/start', async (req, res) => {
  try {
    const phase = await PhaseTrackerService.startPhase(Number(req.params.phaseId));
    res.json(phase);
  } catch (error: any) {
    if (error.message.includes('Cannot start')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update phase progress
router.put('/:phaseId/progress', async (req, res) => {
  try {
    const { progress } = req.body;
    const phase = await PhaseTrackerService.updatePhaseProgress(Number(req.params.phaseId), Number(progress));
    res.json(phase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Assign member to a phase
router.post('/:phaseId/members', async (req, res) => {
  try {
    const member = await PhaseTrackerService.assignMemberToPhase({
      ...req.body,
      fase_id: Number(req.params.phaseId)
    });
    res.status(201).json(member);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
