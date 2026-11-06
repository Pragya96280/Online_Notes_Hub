import { Router } from 'express';
import mongoose from 'mongoose';
import Note from '../models/Note.js';
import subjects from '../data/subjects.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const notes = await Note.find({ owner: req.user._id }).sort({ updatedAt: -1 }).lean();
    res.json({ notes });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const subjectId = String(body.subjectId || '').trim();
    const topicTitle = String(body.topicTitle || '').trim();
    const content = String(body.content || '').trim();
    const subject = subjects.find((item) => item.id === subjectId);
    const topicExists = subject?.topics.some((item) => item.t === topicTitle);

    if (!subject || !topicExists) {
      return res.status(400).json({ message: 'Choose a valid subject and topic before saving.' });
    }
    if (content.length < 3) return res.status(400).json({ message: 'A note must contain at least 3 characters.' });
    if (content.length > 5000) return res.status(400).json({ message: 'Notes can be up to 5,000 characters.' });

    const note = await Note.create({ owner: req.user._id, subjectId, subjectName: subject.name, topicTitle, content });
    res.status(201).json({ note });
  } catch (error) { next(error); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'That note could not be found.' });
    const content = String((req.body || {}).content || '').trim();
    if (content.length < 3) return res.status(400).json({ message: 'A note must contain at least 3 characters.' });
    if (content.length > 5000) return res.status(400).json({ message: 'Notes can be up to 5,000 characters.' });

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: { content } },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ message: 'This note no longer exists.' });
    res.json({ note });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'That note could not be found.' });
    const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!note) return res.status(404).json({ message: 'This note no longer exists.' });
    res.json({ message: 'Note deleted.' });
  } catch (error) { next(error); }
});

export default router;
