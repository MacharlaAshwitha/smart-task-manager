import Activity from '../models/Activity.js';

export async function logActivity({ actorId, taskId, teamId, action, details = '', meta = {} }) {
  try {
    await Activity.create({ actorId, taskId, teamId, action, details, meta });
  } catch (e) {
    console.error('Activity log failed:', e.message);
  }
}
