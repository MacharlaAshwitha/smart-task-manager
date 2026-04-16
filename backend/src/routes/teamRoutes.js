import { Router } from 'express';
import {
  createTeam,
  listTeams,
  getTeam,
  inviteToTeam,
  acceptInvite,
  listPendingInvites,
} from '../controllers/teamController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', listTeams);
router.post('/', createTeam);
router.get('/invites/pending', listPendingInvites);
router.get('/:id', getTeam);
router.post('/:id/invite', inviteToTeam);
router.post('/:id/accept', acceptInvite);

export default router;
