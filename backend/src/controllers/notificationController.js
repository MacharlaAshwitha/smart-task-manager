import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';

async function teamIdsForUser(userId) {
  const teams = await Team.find({ 'members.userId': userId }).select('_id');
  return teams.map((t) => t._id);
}

function buildVisibilityQuery(userId, teamIds) {
  const or = [{ userId }, { assigneeId: userId }];
  if (teamIds.length) {
    or.push({ teamId: { $in: teamIds } });
  }
  return { $or: or };
}

/**
 * Stored notifications plus lightweight due-date reminders derived from tasks.
 */
export async function listNotifications(req, res) {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('taskId', 'title status dueDate');

    const teamIds = await teamIdsForUser(userId);
    const match = buildVisibilityQuery(userId, teamIds);
    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 2);

    const dueTasks = await Task.find({
      ...match,
      status: { $ne: 'Completed' },
      dueDate: { $gte: now, $lte: horizon },
    })
      .select('title dueDate status')
      .sort({ dueDate: 1 })
      .limit(20);

    const overdueTasks = await Task.find({
      ...match,
      status: { $ne: 'Completed' },
      dueDate: { $lt: now },
    })
      .select('title dueDate status')
      .sort({ dueDate: 1 })
      .limit(20);

    res.json({
      notifications,
      dueReminders: dueTasks.map((t) => ({
        taskId: t._id,
        title: t.title,
        dueDate: t.dueDate,
        kind: 'due_soon',
      })),
      overdueReminders: overdueTasks.map((t) => ({
        taskId: t._id,
        title: t.title,
        dueDate: t.dueDate,
        kind: 'overdue',
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
}

export async function markRead(req, res) {
  try {
    const n = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!n) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    n.read = true;
    await n.save();
    res.json({ notification: n });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update notification' });
  }
}

export async function markAllRead(req, res) {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ message: 'All marked read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark all read' });
  }
}
