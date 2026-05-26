import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/database.js';
import authRoutes from './routes/auth.js';
import programsRoutes from './routes/programs.js';
import projectsRoutes from './routes/projects.js';
import tasksRoutes from './routes/tasks.js';
import teamMembersRoutes from './routes/teamMembers.js';
import milestonesRoutes from './routes/milestones.js';
import dependenciesRoutes from './routes/dependencies.js';
import dashboardRoutes from './routes/dashboard.js';
import usersRoutes from './routes/users.js';
import commentsRoutes from './routes/comments.js';
import sprintsRoutes from './routes/sprints.js';
import aiRoutes from './routes/ai.js';
import activityRoutes from './routes/activity.js';
import adminRoutes from './routes/admin.js';
import phaseRoutes from './modules/phaseTracker/phaseRoutes.js';
import { startReminderJobs } from './jobs/reminders.js';
import { join } from 'path';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/programas', programsRoutes);
app.use('/api/proyectos', projectsRoutes);
app.use('/api/tareas', tasksRoutes);
app.use('/api/responsables', teamMembersRoutes);
app.use('/api/hitos', milestonesRoutes);
app.use('/api/dependencias', dependenciesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usersRoutes);
app.use('/api/comentarios', commentsRoutes);
app.use('/api/sprints', sprintsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/actividad', activityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/phases', phaseRoutes);

// Static file serving for uploads
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server after DB init
async function start() {
  try {
    await initializeDatabase();

    if (process.env.ENABLE_EMAIL === 'true') {
      startReminderJobs();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
