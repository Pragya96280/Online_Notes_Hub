import { Router } from 'express';
import Resource from '../models/Resource.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Published study resources are shared with every signed-in student.
router.get('/', async (_req, res, next) => {
  try {
    const resources = await Resource.find({ status: 'published' })
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name')
      .lean();
    res.json({ resources });
  } catch (error) { next(error); }
});

export default router;
