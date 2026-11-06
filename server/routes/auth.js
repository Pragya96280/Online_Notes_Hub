import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please take a short break and try again.' }
});

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role || 'student' });
const makeToken = (user) => jwt.sign(
  { sub: user._id.toString() },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (name.length < 2 || name.length > 60 || !/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,59}$/u.test(name)) {
      return res.status(400).json({ message: 'Enter a valid name using 2–60 letters, spaces, dots, apostrophes or hyphens.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Use at least 8 characters with one uppercase letter, one lowercase letter and one number.' });
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Please use a password up to 72 bytes long.' });
    }

    const alreadyExists = await User.exists({ email });
    if (alreadyExists) return res.status(409).json({ message: 'An account with this email already exists. Try logging in.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    return res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password) {
      return res.status(400).json({ message: 'Enter a valid email address and your password.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordMatches = user && await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return res.status(401).json({ message: 'That email and password do not match. Please try again.' });

    return res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
