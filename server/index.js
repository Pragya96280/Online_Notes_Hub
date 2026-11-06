import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import noteRoutes from './routes/notes.js';
import resourceRoutes from './routes/resources.js';
import adminRoutes from './routes/admin.js';
import { requireAuth } from './middleware/auth.js';
import subjects from './data/subjects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
// CORS configuration for Vercel frontend
const allowedOrigins = [
  'https://online-notes-elg4sdfpr-pragya-omers-projects.vercel.app',
  'https://online-notes-hub.vercel.app',
  'http://localhost:5173'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected'
  });
});
app.use('/api/auth', authRoutes);
app.get('/api/subjects', requireAuth, (_req, res) => res.json({ subjects }));
app.use('/api/notes', noteRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ message: 'API route not found.' }));

// In development Vite serves the React app on port 5173. Express must not
// try to read client/dist until the production build has been created.
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ message: 'NotesHub API is running. Open the Vite frontend at http://localhost:5173.' });
  });
}

app.use((err, _req, res, _next) => {
  console.error('[NotesHub API error]', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((item) => item.message).join(' ') });
  }

  if (err?.code === 11000) {
    return res.status(409).json({ message: 'An account with this email already exists. Try logging in instead.' });
  }

  const databaseUnavailable =
    mongoose.connection.readyState !== 1 ||
    /MongoServerSelectionError|MongoNetworkError|MongoServerError|server selection timed out|ECONNREFUSED|ENOTFOUND/i.test(`${err.name || ''} ${err.message || ''}`);

  if (databaseUnavailable) {
    return res.status(503).json({
      message: 'MongoDB Atlas is not reachable. Check the MONGODB_URI in your root .env file, the database username/password, and Atlas Network Access IP allowlist.'
    });
  }

  const safeMessage = process.env.NODE_ENV === 'production'
    ? 'The server could not complete this request. Please check the backend logs and try again.'
    : (err.message || 'Internal server error.');
  res.status(err.status || 500).json({ message: safeMessage });
});

// Start Express before connecting to Atlas. This keeps /api/health reachable even
// when the database URI, credentials, or Atlas IP allowlist need attention.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NotesHub API is listening on http://localhost:${PORT}`);
  if (!process.env.MONGODB_URI) {
    console.error('[NotesHub] MONGODB_URI is missing. Add it to the root .env file.');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('[NotesHub] JWT_SECRET is missing or shorter than 32 characters.');
  }
});

async function connectDatabase() {
  if (!process.env.MONGODB_URI) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('[NotesHub] Connected to MongoDB Atlas.');
  } catch (error) {
    console.error(`[NotesHub] MongoDB connection failed: ${error.message}`);
    console.error('[NotesHub] Check the root .env MONGODB_URI, database username/password, and Atlas Network Access. Retrying in 10 seconds.');
    setTimeout(connectDatabase, 10000).unref();
  }
}

connectDatabase();
