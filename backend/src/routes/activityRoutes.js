import { Router } from 'express';
import { listActivity } from '../controllers/activityController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listActivity);

export default router;
