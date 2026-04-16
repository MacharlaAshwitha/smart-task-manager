import { Router } from 'express';
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController.js';
import { requireAuth } from '../middleware/auth.js';
import { listComments, addComment } from '../controllers/commentController.js';

const router = Router();

router.use(requireAuth);

router.get('/', listTasks);
router.post('/', createTask);

// More specific routes must come before /:id
router.get('/:taskId/comments', listComments);
router.post('/:taskId/comments', addComment);

router.get('/:id', getTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
