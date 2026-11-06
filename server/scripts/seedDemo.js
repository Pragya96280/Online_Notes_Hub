import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Note from '../models/Note.js';
import Resource from '../models/Resource.js';
import subjects from '../data/subjects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const production = process.env.NODE_ENV === 'production';
const studentEmail = (process.env.DEMO_STUDENT_EMAIL || (production ? '' : 'student@noteshub.demo')).trim().toLowerCase();
const studentPassword = process.env.DEMO_STUDENT_PASSWORD || (production ? '' : 'Study@12345');
const adminEmail = (process.env.DEMO_ADMIN_EMAIL || (production ? '' : 'admin@noteshub.demo')).trim().toLowerCase();
const adminPassword = process.env.DEMO_ADMIN_PASSWORD || (production ? '' : 'Admin@12345');

if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI. Add your Atlas URI to the project-root .env file first.');
  process.exit(1);
}
if (production && (!studentEmail || !studentPassword || !adminEmail || !adminPassword)) {
  console.error('In production, set DEMO_STUDENT_EMAIL, DEMO_STUDENT_PASSWORD, DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD before seeding.');
  process.exit(1);
}
if (studentEmail === adminEmail) {
  console.error('Demo student email and admin email must be different.');
  process.exit(1);
}
if ([studentPassword, adminPassword].some((password) => password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))) {
  console.error('Seed passwords must be 8+ characters and contain uppercase, lowercase and a number.');
  process.exit(1);
}

async function ensureUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return User.findOneAndUpdate(
    { email },
    { $set: { name, passwordHash, role }, $setOnInsert: { email } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await User.updateMany({ role: { $exists: false } }, { $set: { role: 'student' } });
  const student = await ensureUser({ name: 'Demo Student', email: studentEmail, password: studentPassword, role: 'student' });
  const admin = await ensureUser({ name: 'NotesHub Admin', email: adminEmail, password: adminPassword, role: 'admin' });

  const sampleNotes = [
    { subjectId: 'mern', topicTitle: 'Node.js Fundamentals', content: 'Node.js is a JavaScript runtime built on the V8 engine. It lets developers run JavaScript outside the browser and build scalable APIs and server applications. Its event loop and non-blocking I/O help it handle many concurrent connections.' },
    { subjectId: 'dm', topicTitle: 'Intro to Data Mining', content: 'Data mining discovers useful patterns, relationships and trends from large datasets. A typical workflow includes data cleaning, transformation, modelling, evaluation and communicating the findings.' },
    { subjectId: 'cyber', topicTitle: 'Intro to Cyber Security', content: 'Cyber security protects systems, networks and information from unauthorised access, misuse or disruption. Remember the CIA triad: confidentiality, integrity and availability.' },
    { subjectId: 'crypto', topicTitle: 'Intro to Cryptography', content: 'Cryptography protects information using mathematical techniques. Encryption provides confidentiality, hashing supports integrity checks, and digital signatures help verify authenticity.' }
  ];

  let noteCount = 0;
  for (const item of sampleNotes) {
    const subject = subjects.find((entry) => entry.id === item.subjectId);
    if (!subject) continue;
    const topic = subject.topics.find((entry) => entry.t.toLowerCase() === item.topicTitle.toLowerCase()) || subject.topics[0];
    if (!topic) continue;
    const exists = await Note.exists({ owner: student._id, subjectId: subject.id, topicTitle: topic.t });
    if (!exists) {
      await Note.create({ owner: student._id, subjectId: subject.id, subjectName: subject.name, topicTitle: topic.t, content: item.content });
      noteCount += 1;
    }
  }

  const sharedResources = [
    {
      title: 'Node.js – Quick Revision Sheet', subjectId: 'mern', topicTitle: 'Node.js Fundamentals',
      content: `MERN stands for MongoDB, Express.js, React.js and Node.js.

• MongoDB stores data as flexible documents.
• Express.js provides routing and middleware for APIs.
• React.js builds reusable, interactive user interfaces.
• Node.js runs JavaScript on the server.

In a typical request, React calls an Express API, Node.js runs the business logic, and Mongoose reads or writes data in MongoDB.`
    },
    {
      title: 'Data Mining – Exam Preparation Notes', subjectId: 'dm', topicTitle: 'Intro to Data Mining',
      content: `Data mining is the process of discovering meaningful patterns, relationships and trends from large datasets.

Main tasks include classification, clustering, association-rule mining, regression and anomaly detection.

A common workflow is: understand the problem → collect data → clean and transform data → build a model → evaluate results → communicate insights.`
    },
    {
      title: 'Cyber Security – CIA Triad', subjectId: 'cyber', topicTitle: 'Intro to Cyber Security',
      content: `The CIA triad is a foundational security model:

1. Confidentiality: only authorised people can access information.
2. Integrity: data remains accurate and is not changed without permission.
3. Availability: systems and information are accessible when required.

Examples include access controls for confidentiality, hashes for integrity and backups or failover systems for availability.`
    }
  ];

  let resourceCount = 0;
  for (const item of sharedResources) {
    const subject = subjects.find((entry) => entry.id === item.subjectId);
    const topic = subject?.topics.find((entry) => entry.t.toLowerCase() === item.topicTitle.toLowerCase()) || subject?.topics[0];
    if (!subject || !topic) continue;
    const exists = await Resource.exists({ createdBy: admin._id, title: item.title });
    if (!exists) {
      await Resource.create({ ...item, subjectName: subject.name, topicTitle: topic.t, createdBy: admin._id, status: 'published' });
      resourceCount += 1;
    }
  }

  console.log('\nNotesHub demo data is ready.');
  console.log(`STUDENT  email: ${studentEmail}`);
  console.log(`         password: ${studentPassword}`);
  console.log(`         user ID: ${student._id}`);
  console.log(`ADMIN    email: ${adminEmail}`);
  console.log(`         password: ${adminPassword}`);
  console.log(`         user ID: ${admin._id}`);
  console.log(`Added ${noteCount} personal demo notes and ${resourceCount} shared study resources (existing seed data was kept).`);
  console.log('For a public deployment, change these demo passwords or remove the demo accounts before sharing the URL.\n');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Demo seeding failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
