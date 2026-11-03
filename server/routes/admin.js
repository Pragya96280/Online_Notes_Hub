import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Note from '../models/Note.js';
import Resource from '../models/Resource.js';
import subjects from '../data/subjects.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/dashboard', async (_req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [users, notes, resources, newUsers, latestUsers, latestNotes, latestResources] = await Promise.all([
      User.countDocuments(),
      Note.countDocuments(),
      Resource.countDocuments({ status: 'published' }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(8).lean(),
      Note.find().select('owner subjectName topicTitle createdAt updatedAt').populate('owner', 'name email').sort({ updatedAt: -1 }).limit(8).lean(),
      Resource.find().select('title subjectName topicTitle status createdAt updatedAt').sort({ updatedAt: -1 }).limit(8).lean()
    ]);

    res.json({
      stats: { users, personalNotes: notes, publishedResources: resources, newUsersThisWeek: newUsers },
      latestUsers,
      latestNoteActivity: latestNotes.map((note) => ({
        id: note._id,
        subjectName: note.subjectName,
        topicTitle: note.topicTitle,
        updatedAt: note.updatedAt,
        owner: note.owner ? { name: note.owner.name, email: note.owner.email } : null
      })),
      latestResources
    });
  } catch (error) { next(error); }
});

router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'notes', localField: '_id', foreignField: 'owner', as: 'personalNotes' } },
      { $project: { name: 1, email: 1, role: 1, createdAt: 1, noteCount: { $size: '$personalNotes' } } },
      { $limit: 100 }
    ]);
    res.json({ users });
  } catch (error) { next(error); }
});

router.get('/resources', async (_req, res, next) => {
  try {
    const resources = await Resource.find().populate('createdBy', 'name email').sort({ updatedAt: -1 }).lean();
    res.json({ resources });
  } catch (error) { next(error); }
});

router.post('/resources', async (req, res, next) => {
  try {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const subjectId = String(body.subjectId || '').trim();
    const topicTitle = String(body.topicTitle || '').trim();
    const content = String(body.content || '').trim();
    const subject = subjects.find((item) => item.id === subjectId);
    const topicExists = subject?.topics.some((item) => item.t === topicTitle);

    if (title.length < 4 || title.length > 120) {
      return res.status(400).json({ message: 'Resource title must be between 4 and 120 characters.' });
    }
    if (!subject || !topicExists) {
      return res.status(400).json({ message: 'Choose a valid subject and one of its topics.' });
    }
    if (content.length < 20 || content.length > 8000) {
      return res.status(400).json({ message: 'Study material must be between 20 and 8,000 characters.' });
    }

    const resource = await Resource.create({
      title, subjectId, subjectName: subject.name, topicTitle, content,
      status: body.status === 'draft' ? 'draft' : 'published',
      createdBy: req.user._id
    });
    res.status(201).json({ resource });
  } catch (error) { next(error); }
});

router.delete('/resources/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid resource ID.' });
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource was not found.' });
    res.json({ message: 'Study resource deleted.' });
  } catch (error) { next(error); }
});

export default router;
