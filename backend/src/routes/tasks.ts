import { Router, Response } from 'express';
import { getOne, getAll, run } from '../db/database.js';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.js';
import { sendTaskAssignedEmail } from '../services/mail.js';
import { logActividad } from '../utils/actividad.js';
import { recalcularProgresoProyecto } from '../utils/progreso.js';

const router = Router();
router.use(authMiddleware);

router.get('/proyecto/:proyectoId', async (req: AuthRequest, res: Response) => {
  const tasks = await getAll(`
    SELECT t.*, r.nombre as responsable_nombre, r.color as responsable_color, r.email as responsable_email, s.nombre as sprint_nombre
    FROM tareas t
    LEFT JOIN responsables r ON t.responsable_id = r.id
    LEFT JOIN sprints s ON t.sprint_id = s.id
    WHERE t.proyecto_id = $1
    ORDER BY t.orden ASC
  `, [req.params.proyectoId]);
  res.json(tasks);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const task = await getOne(`
    SELECT t.*, r.nombre as responsable_nombre, r.color as responsable_color
    FROM tareas t
    LEFT JOIN responsables r ON t.responsable_id = r.id
    WHERE t.id = $1
  `, [req.params.id]);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json(task);
});

router.post('/', requireRole('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  const { proyecto_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, duracion_dias, responsable_id, tarea_padre_id, orden, sprint_id, prioridad, porcentaje_avance, story_points, peso } = req.body;
  if (!nombre || !proyecto_id) { res.status(400).json({ error: 'Name and project_id are required' }); return; }

  // Strict Task Creation Logic
  const lastTask = await getOne(`
    SELECT estado, porcentaje_avance FROM tareas
    WHERE proyecto_id = $1
    ORDER BY orden DESC LIMIT 1
  `, [proyecto_id]);

  if (lastTask && (lastTask.porcentaje_avance < 100 || lastTask.estado !== 'completada')) {
    res.status(403).json({ error: 'Cannot create a new task until the preceding task is 100% completed.' });
    return;
  }

  const finalState = estado || 'pendiente';
  const finalProgress = finalState === 'completada' ? 100 : finalState === 'pendiente' ? 0 : (porcentaje_avance ?? 0);

  const createdTask = await getOne(
    'INSERT INTO tareas (proyecto_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, duracion_dias, responsable_id, tarea_padre_id, orden, sprint_id, prioridad, porcentaje_avance, story_points, peso) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
    [proyecto_id, nombre, descripcion || null, finalState, fecha_inicio || null, fecha_fin || null, duracion_dias || null, responsable_id || null, tarea_padre_id || null, orden || 0, sprint_id || null, prioridad || 'media', finalProgress, story_points || null, peso ?? 1]
  );

  // Send email notification if assigned
  if (responsable_id) {
    const resp = await getOne('SELECT email FROM responsables WHERE id = $1', [responsable_id]);
    const proy = await getOne('SELECT nombre FROM proyectos WHERE id = $1', [proyecto_id]);
    if (resp?.email && proy) {
      sendTaskAssignedEmail(resp.email, nombre, proy.nombre, fecha_fin || 'Sin fecha').catch(() => {});
    }
  }

  await logActividad(proyecto_id, req.user!, 'tarea_creada', `Task created: ${nombre}`, 'tarea', createdTask.id);
  recalcularProgresoProyecto(proyecto_id).catch(() => {});

  res.status(201).json(createdTask);
});

router.put('/:id', requireRole('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  const { nombre, descripcion, estado, fecha_inicio, fecha_fin, duracion_dias, responsable_id, tarea_padre_id, orden, sprint_id, prioridad, porcentaje_avance, story_points, peso } = req.body;

  const finalProgress = estado === 'completada' ? 100 : estado === 'pendiente' ? 0 : (porcentaje_avance ?? 0);

  // Phase Tracker: Sequential Logic Validation
  const currentTask = await getOne('SELECT estado, orden, proyecto_id FROM tareas WHERE id = $1', [req.params.id]);
  if (currentTask && currentTask.estado === 'pendiente' && (estado === 'en_progreso' || estado === 'completada' || finalProgress > 0)) {
    const prevTask = await getOne(`
      SELECT estado, porcentaje_avance FROM tareas 
      WHERE proyecto_id = $1 AND orden < $2
      ORDER BY orden DESC LIMIT 1
    `, [currentTask.proyecto_id, currentTask.orden]);

    if (prevTask && (prevTask.porcentaje_avance < 100 || prevTask.estado !== 'completada')) {
      res.status(403).json({ error: 'Cannot start this task until the previous task is 100% completed.' });
      return;
    }
  }

  const updatedTask = await getOne(`
    UPDATE tareas SET nombre=$1, descripcion=$2, estado=$3, fecha_inicio=$4, fecha_fin=$5, duracion_dias=$6, responsable_id=$7, tarea_padre_id=$8, orden=$9, sprint_id=$10, prioridad=$11, porcentaje_avance=$12, story_points=$13, peso=$14, updated_at=NOW() WHERE id=$15
    RETURNING *
  `, [nombre, descripcion, estado, fecha_inicio, fecha_fin, duracion_dias, responsable_id, tarea_padre_id, orden, sprint_id, prioridad, finalProgress, story_points, peso ?? 1, req.params.id]);

  if (updatedTask) {
    await logActividad(updatedTask.proyecto_id, req.user!, 'tarea_actualizada', `Task updated: ${nombre}`, 'tarea', parseInt(req.params.id as string));
    recalcularProgresoProyecto(updatedTask.proyecto_id).catch(() => {});
    const taskWithJoin = await getOne(`
      SELECT t.*, r.nombre as responsable_nombre, r.color as responsable_color
      FROM tareas t LEFT JOIN responsables r ON t.responsable_id = r.id
      WHERE t.id = $1
    `, [req.params.id]);
    res.json(taskWithJoin);
  } else {
    res.json(updatedTask);
  }
});

// Batch reorder — must come before /:id routes
router.patch('/reorder', requireRole('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  const { items } = req.body as { items: { id: number; orden: number }[] };
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items requeridos' });
    return;
  }
  for (const { id, orden } of items) {
    await run('UPDATE tareas SET orden=$1 WHERE id=$2', [orden, id]);
  }
  res.json({ ok: true });
});

router.patch('/:id/dates', requireRole('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  const { fecha_inicio, fecha_fin } = req.body;
  const updatedTask = await getOne(
    'UPDATE tareas SET fecha_inicio=$1, fecha_fin=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
    [fecha_inicio, fecha_fin, req.params.id]
  );
  res.json(updatedTask);
});

router.patch('/:id/progress', requireRole('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  const { porcentaje_avance } = req.body;
  // Only allow manual progress if the task is in_progress or blocked
  const current = await getOne('SELECT estado, proyecto_id, orden FROM tareas WHERE id = $1', [req.params.id]);
  
  // Sequential Logic Validation
  if (current && current.estado === 'pendiente' && porcentaje_avance > 0) {
    const prevTask = await getOne(`
      SELECT estado, porcentaje_avance FROM tareas 
      WHERE proyecto_id = $1 AND orden < $2
      ORDER BY orden DESC LIMIT 1
    `, [current.proyecto_id, current.orden]);

    if (prevTask && (prevTask.porcentaje_avance < 100 || prevTask.estado !== 'completada')) {
      res.status(403).json({ error: 'Cannot advance this task until the previous task is 100% completed.' });
      return;
    }
  }

  const finalProgress = current?.estado === 'completada' ? 100 : current?.estado === 'pendiente' ? 0 : porcentaje_avance;
  const updatedTask = await getOne(
    'UPDATE tareas SET porcentaje_avance=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [finalProgress, req.params.id]
  );
  if (updatedTask) recalcularProgresoProyecto(updatedTask.proyecto_id).catch(() => {});
  res.json(updatedTask);
});

router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const task = await getOne('SELECT * FROM tareas WHERE id = $1', [req.params.id]);
  await run('DELETE FROM tareas WHERE id = $1', [req.params.id]);
  if (task) {
    await logActividad(task.proyecto_id, req.user!, 'tarea_eliminada', `Task deleted: ${task.nombre}`, 'tarea', task.id);
    recalcularProgresoProyecto(task.proyecto_id).catch(() => {});
  }
  res.json({ message: 'Task deleted successfully' });
});

// --- Task Members Endpoints ---
router.get('/:id/miembros', async (req: AuthRequest, res: Response) => {
  const members = await getAll(`
    SELECT tm.*, r.nombre as responsable_nombre, r.email as responsable_email, r.avatar_url, r.color 
    FROM tarea_miembros tm 
    JOIN responsables r ON tm.responsable_id = r.id 
    WHERE tm.tarea_id = $1
  `, [req.params.id]);
  res.json(members);
});

router.post('/:id/miembros', requireRole('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  const { responsable_id, fecha_inicio, fecha_fin, dias_laborables } = req.body;
  const createdMember = await getOne(`
    INSERT INTO tarea_miembros (tarea_id, responsable_id, fecha_inicio, fecha_fin, dias_laborables)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [req.params.id, responsable_id, fecha_inicio, fecha_fin, JSON.stringify(dias_laborables)]);
  res.status(201).json(createdMember);
});
// -----------------------------------------------

export default router;
