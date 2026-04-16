import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js'; 

import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import commentRoutes from './routes/commentRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'smart-task-manager-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/comments', commentRoutes);

// Central error handler (respect status from body-parser JSON errors, etc.)
app.use((err, req, res, next) => {
  console.error(err);
  const status = Number(err.statusCode || err.status) || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ message });
});

async function start() {
  try {
    await connectDB();
    const jwt = process.env.JWT_SECRET;
    if (!jwt || jwt === 'your_super_secret_jwt_key_change_this') {
      console.warn(
        '\n⚠️  Set JWT_SECRET in backend/.env to a long random string (registration/login will fail until you do).\n'
      );
    }
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Failed to start:', e.message);
    process.exit(1);
  }
}

start();
