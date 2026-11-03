import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 4, maxlength: 120 },
  subjectId: { type: String, required: true, trim: true, maxlength: 40 },
  subjectName: { type: String, required: true, trim: true, maxlength: 80 },
  topicTitle: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
  content: { type: String, required: true, trim: true, minlength: 20, maxlength: 8000 },
  status: { type: String, enum: ['published', 'draft'], default: 'published', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

resourceSchema.index({ status: 1, updatedAt: -1 });

export default mongoose.model('Resource', resourceSchema);
