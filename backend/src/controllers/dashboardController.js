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
 * Summary stats and simple series for charts (status breakdown, priority breakdown).
 */
export async function getDashboard(req, res) {
  try {
    const userId = req.user._id;
    const teamIds = await teamIdsForUser(userId);
    const match = buildVisibilityQuery(userId, teamIds);

    const tasks = await Task.find(match);

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const pending = tasks.filter((t) => t.status === 'Pending').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;

    const byPriority = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
    tasks.forEach((t) => {
      if (byPriority[t.priority] !== undefined) byPriority[t.priority] += 1;
    });

    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const dueSoon = tasks.filter(
      (t) =>
        t.dueDate &&
        t.status !== 'Completed' &&
        new Date(t.dueDate) >= now &&
        new Date(t.dueDate) <= soon
    ).length;
    const overdue = tasks.filter(
      (t) => t.dueDate && t.status !== 'Completed' && new Date(t.dueDate) < now
    ).length;

    res.json({
      stats: {
        total,
        completed,
        pending,
        inProgress,
        dueSoon,
        overdue,
      },
      charts: {
        byStatus: [
          { name: 'Pending', value: pending },
          { name: 'In Progress', value: inProgress },
          { name: 'Completed', value: completed },
        ],
        byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
}
