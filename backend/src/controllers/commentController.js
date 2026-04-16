import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import { logActivity } from '../utils/activity.js';

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

export async function listComments(req, res) {
  try {
    const teamIds = await teamIdsForUser(req.user._id);
    const task = await Task.findById(req.params.taskId);
    if (!task || !(await canAccessTask(req.user._id, task, teamIds))) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const comments = await Comment.find({ taskId: task._id })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email');
    res.json({ comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list comments' });
  }
}

export async function addComment(req, res) {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    const teamIds = await teamIdsForUser(req.user._id);
    const task = await Task.findById(req.params.taskId);
    if (!task || !(await canAccessTask(req.user._id, task, teamIds))) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const comment = await Comment.create({
      taskId: task._id,
      userId: req.user._id,
      text: text.trim(),
    });
    await logActivity({
      actorId: req.user._id,
      taskId: task._id,
      teamId: task.teamId,
      action: 'comment_added',
      details: 'Comment added',
    });
    const populated = await Comment.findById(comment._id).populate('userId', 'name email');
    res.status(201).json({ comment: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add comment' });
  }
}

export async function deleteComment(req, res) {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    const teamIds = await teamIdsForUser(req.user._id);
    const task = await Task.findById(comment.taskId);
    if (!task || !(await canAccessTask(req.user._id, task, teamIds))) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }
    await Comment.deleteOne({ _id: comment._id });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
}
