import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['due_soon', 'overdue', 'task_assigned', 'invite', 'generic'],
      default: 'generic',
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
