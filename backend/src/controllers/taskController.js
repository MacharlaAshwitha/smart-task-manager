import Task from '../models/Task.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';
import { logActivity } from '../utils/activity.js';

const PRIORITY_ORDER = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

/** Team IDs where the user is a member (for shared task visibility). */
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

/** Combines visibility with filters (Mongo needs $and when using $text). */
function buildListFilter(userId, teamIds, adminScopeAll, queryParams) {
  const { status, priority, dueBefore, dueAfter, search, tag } = queryParams;
  const visibility = buildVisibilityQuery(userId, teamIds);
  const base = adminScopeAll ? {} : visibility;

  const parts = [];
  if (!adminScopeAll) parts.push(visibility);
  if (status) parts.push({ status });
  if (priority) parts.push({ priority });
  const dueParts = {};
  if (dueBefore) dueParts.$lte = new Date(dueBefore);
  if (dueAfter) dueParts.$gte = new Date(dueAfter);
  if (Object.keys(dueParts).length) parts.push({ dueDate: dueParts });
  if (tag) parts.push({ tags: tag });

  const q = String(search || '').trim();
  if (q) parts.push({ $text: { $search: q } });

  if (parts.length === 0) return base;
  if (adminScopeAll && parts.length === 1) return parts[0];
  if (adminScopeAll) return { $and: parts };
  return { $and: parts };
}

export async function listTasks(req, res) {
  try {
    const userId = req.user._id;
    const teamIds = await teamIdsForUser(userId);
    const adminScopeAll = req.user.role === 'admin' && req.query.scope === 'all';

    const {
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = buildListFilter(userId, teamIds, adminScopeAll, req.query);

    let sort = {};
    if (sortBy === 'dueDate') {
      sort = { dueDate: sortOrder === 'asc' ? 1 : -1 };
    } else if (['createdAt', 'updatedAt', 'title'].includes(sortBy)) {
      sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    } else {
      sort = { updatedAt: -1 };
    }

    let tasks = await Task.find(filter).sort(sort).populate('assigneeId', 'name email');

    if (sortBy === 'priority') {
      const mul = sortOrder === 'asc' ? 1 : -1;
      tasks = tasks.sort(
        (a, b) => mul * ((PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0))
      );
    }

    res.json({ tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list tasks' });
  }
}

async function canAccessTask(userId, task, teamIds) {
  if (!task) return false;
  if (task.userId.toString() === userId.toString()) return true;
  if (task.assigneeId && task.assigneeId.toString() === userId.toString()) return true;
  if (task.teamId && teamIds.some((id) => id.toString() === task.teamId.toString())) return true;
  return false;
}

export async function getTask(req, res) {
  try {
    const teamIds = await teamIdsForUser(req.user._id);
    const task = await Task.findById(req.params.id).populate('assigneeId', 'name email');
    if (!task || !(await canAccessTask(req.user._id, task, teamIds))) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get task' });
  }
}

export async function createTask(req, res) {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      tags,
      subtasks,
      teamId,
      assigneeId,
    } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team || !team.members.some((m) => m.userId.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Not a member of this team' });
      }
      if (assigneeId) {
        const ok = team.members.some((m) => m.userId.toString() === assigneeId.toString());
        if (!ok) {
          return res.status(400).json({ message: 'Assignee must be a team member' });
        }
      }
    } else if (assigneeId && assigneeId !== req.user._id.toString()) {
      return res.status(400).json({ message: 'Assign tasks to others only within a team' });
    }

    const task = await Task.create({
      title,
      description: description ?? '',
      status: status || 'Pending',
      priority: priority || 'Medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: Array.isArray(tags) ? tags : [],
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      userId: req.user._id,
      teamId: teamId || null,
      assigneeId: assigneeId || null,
    });

    await logActivity({
      actorId: req.user._id,
      taskId: task._id,
      teamId: task.teamId,
      action: 'task_created',
      details: `Created task "${task.title}"`,
    });

    if (assigneeId && assigneeId !== req.user._id.toString()) {
      await Notification.create({
        userId: assigneeId,
        type: 'task_assigned',
        title: 'New task assignment',
        message: `You were assigned: ${task.title}`,
        taskId: task._id,
      });
      await logActivity({
        actorId: req.user._id,
        taskId: task._id,
        teamId: task.teamId,
        action: 'task_assigned',
        details: `Assigned to user`,
        meta: { assigneeId },
      });
    }

    const populated = await Task.findById(task._id).populate('assigneeId', 'name email');
    res.status(201).json({ task: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create task' });
  }
}

export async function updateTask(req, res) {
  try {
    const teamIds = await teamIdsForUser(req.user._id);
    const task = await Task.findById(req.params.id);
    if (!task || !(await canAccessTask(req.user._id, task, teamIds))) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const prevAssignee = task.assigneeId?.toString();
    const prevStatus = task.status;
    const fields = ['title', 'description', 'status', 'priority', 'dueDate', 'tags', 'subtasks', 'teamId', 'assigneeId'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'dueDate') task.dueDate = req.body[f] ? new Date(req.body[f]) : null;
        else if (f === 'tags' && !Array.isArray(req.body.tags)) continue;
        else if (f === 'subtasks' && !Array.isArray(req.body.subtasks)) continue;
        else if (f === 'teamId' && (req.body.teamId === '' || req.body.teamId === null)) {
          task.teamId = null;
          task.assigneeId = null;
        } else task[f] = req.body[f];
      }
    }

    if (req.body.teamId !== undefined && req.body.teamId) {
      const newTeam = await Team.findById(req.body.teamId);
      if (!newTeam || !newTeam.members.some((m) => m.userId.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Not a member of this team' });
      }
    }

    if (task.teamId) {
      const team = await Team.findById(task.teamId);
      if (!team) {
        return res.status(400).json({ message: 'Invalid team' });
      }
      if (task.assigneeId && !team.members.some((m) => m.userId.toString() === task.assigneeId.toString())) {
        return res.status(400).json({ message: 'Assignee must be a team member' });
      }
    }

    await task.save();

    const statusChanged =
      req.body.status !== undefined && String(req.body.status) !== String(prevStatus);
    await logActivity({
      actorId: req.user._id,
      taskId: task._id,
      teamId: task.teamId,
      action: statusChanged ? 'status_changed' : 'task_updated',
      details: `Updated task "${task.title}"`,
    });

    const newAssignee = task.assigneeId?.toString();
    if (newAssignee && newAssignee !== prevAssignee && newAssignee !== req.user._id.toString()) {
      await Notification.create({
        userId: task.assigneeId,
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: task.title,
        taskId: task._id,
      });
      await logActivity({
        actorId: req.user._id,
        taskId: task._id,
        teamId: task.teamId,
        action: 'task_assigned',
        details: 'Assignment changed',
      });
    }

    const populated = await Task.findById(task._id).populate('assigneeId', 'name email');
    res.json({ task: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update task' });
  }
}

export async function deleteTask(req, res) {
  try {
    const teamIds = await teamIdsForUser(req.user._id);
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    // Only owner or admin can delete
    if (task.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the task owner can delete' });
    }
    if (!(await canAccessTask(req.user._id, task, teamIds))) {
      return res.status(404).json({ message: 'Task not found' });
    }
    await Task.deleteOne({ _id: task._id });
    await logActivity({
      actorId: req.user._id,
      taskId: task._id,
      teamId: task.teamId,
      action: 'task_deleted',
      details: `Deleted task "${task.title}"`,
    });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete task' });
  }
}
