import Activity from '../models/Activity.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';

async function teamIdsForUser(userId) {
  const teams = await Team.find({ 'members.userId': userId }).select('_id');
  return teams.map((t) => t._id);
}

async function canAccessTask(userId, task, teamIds) {
  if (!task) return false;
  if (task.userId.toString() === userId.toString()) return true;
  if (task.assigneeId && task.assigneeId.toString() === userId.toString()) return true;
  if (task.teamId && teamIds.some((id) => id.toString() === task.teamId.toString())) return true;
  return false;
}

/** Activity for tasks the user can see, or team-scoped. */
export async function listActivity(req, res) {
  try {
    const { taskId, teamId, limit = 50 } = req.query;
    const teamIds = await teamIdsForUser(req.user._id);

    const filter = {};

    if (taskId) {
      const task = await Task.findById(taskId);
      if (!task || !(await canAccessTask(req.user._id, task, teamIds))) {
        return res.status(404).json({ message: 'Task not found' });
      }
      filter.taskId = taskId;
    } else if (teamId) {
      const team = await Team.findById(teamId);
      if (!team || !team.members.some((m) => m.userId.toString() === req.user._id.toString())) {
        return res.status(404).json({ message: 'Team not found' });
      }
      filter.teamId = teamId;
    } else {
      const tasks = await Task.find({
        $or: [
          { userId: req.user._id },
          { assigneeId: req.user._id },
          ...(teamIds.length ? [{ teamId: { $in: teamIds } }] : []),
        ],
      }).select('_id');
      const ids = tasks.map((t) => t._id);
      filter.$or = [{ taskId: { $in: ids } }, { actorId: req.user._id }];
    }

    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200))
      .populate('actorId', 'name email');

    res.json({ activities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load activity' });
  }
}
