import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectId: { type: String, required: true, trim: true, maxlength: 40 },
  subjectName: { type: String, required: true, trim: true, maxlength: 80 },
  topicTitle: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 }
}, { timestamps: true });

noteSchema.index({ owner: 1, updatedAt: -1 });

export default mongoose.model('Note', noteSchema);
