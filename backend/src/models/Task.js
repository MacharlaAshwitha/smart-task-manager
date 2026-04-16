import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    dueDate: { type: Date, default: null },
    tags: [{ type: String, trim: true }],
    subtasks: [subtaskSchema],
    /** Owner: always the user who created the task */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Optional team context */
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    /** Assigned team member (must be in team if teamId set) */
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Task', taskSchema);
