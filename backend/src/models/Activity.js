import mongoose from 'mongoose';

/**
 * Audit trail for tasks and teams (created, updated, assigned, commented, etc.).
 */
const activitySchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    action: {
      type: String,
      required: true,
      enum: [
        'task_created',
        'task_updated',
        'task_deleted',
        'task_assigned',
        'status_changed',
        'comment_added',
        'team_created',
        'member_invited',
        'member_joined',
      ],
    },
    details: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activitySchema.index({ taskId: 1, createdAt: -1 });
activitySchema.index({ teamId: 1, createdAt: -1 });
activitySchema.index({ actorId: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
