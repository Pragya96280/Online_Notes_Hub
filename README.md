# NotesHub — MERN Study Notes & Admin Platform

NotesHub is a responsive full-stack study workspace built with MongoDB Atlas, Express, React and Node.js. Students can study topics and manage private notes. Administrators get a protected dashboard to monitor registrations and note activity and publish shared study resources for every student.

## Main features

### Student workspace
- Sign up and log in with validated email and password fields.
- Passwords are hashed with bcrypt; JWT-protected APIs secure user data.
- Browse five subject libraries: .NET, MERN, Data Mining, Cybersecurity and Cryptography.
- Read topic material, move between topics and search the library.
- Create, edit and delete personal notes. Each student's notes remain private to that account.
- Read admin-published resources in **Class resources**.
- Responsive layout and light/dark theme.

### Administrator workspace
- Admin access is assigned by the seed script, not by public signup.
- Dashboard cards show total accounts, personal-note count, published resources and new accounts in the last seven days.
- Review recent registrations and user IDs, all account IDs/roles/note counts, and recent note metadata.
- Private note content is not shown to administrators; dashboard activity only shows topic, owner and timestamps.
- Create and publish study resources linked to a valid subject/topic. All signed-in students can read published resources.
- Delete shared resources from the admin dashboard.

### Validation and security
- Signup checks name, email and password requirements on both client and server.
- Password must be at least 8 characters and include uppercase, lowercase and a number (bcrypt input is limited to 72 UTF-8 bytes).
- Note content must be 3–5,000 characters. Shared resources require a 4–120 character title and 20–8,000 character body.
- Authenticated routes validate JWTs. Admin APIs additionally check the database user's `admin` role.
- Public signup cannot assign an admin role.
- Personal notes are scoped to their owner; shared resources are stored separately.
- In development, Vite serves the frontend at port 5173. Express serves the built frontend only in production, so it no longer tries to load `client/dist/index.html` during local development.

## Project structure

```text
notes-hub-render-ready/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx          # All frontend screens and interactions in one component
│       ├── main.jsx
│       └── styles.css
├── server/
│   ├── data/subjects.js
│   ├── middleware/auth.js
│   ├── models/User.js
│   ├── models/Note.js
│   ├── models/Resource.js
│   ├── routes/auth.js
│   ├── routes/notes.js
│   ├── routes/resources.js
│   ├── routes/admin.js
│   ├── scripts/seedDemo.js
│   └── index.js
├── .env.example
├── package.json
└── render.yaml
```

## Run locally with MongoDB Atlas

1. Open the extracted project root in VS Code. It must directly contain `package.json`, `client` and `server`.
2. Install dependencies:

   ```bash
   npm install
   npm install --prefix client
   ```

3. Copy `.env.example` to `.env` in the project root. Put your real MongoDB Atlas connection string in `MONGODB_URI` and set a unique `JWT_SECRET` of at least 32 characters. The root `.env` must not be placed inside `client` or `server`.
4. Confirm the Atlas database user and Network Access IP allowlist are configured.
5. Seed the demo accounts and sample content once:

   ```bash
   npm run seed:demo
   ```

   This command is idempotent: existing demo accounts are updated with the configured seed password and existing sample notes/resources are not duplicated. It prints the two MongoDB user IDs in the terminal.
6. Start both servers:

   ```bash
   npm run dev
   ```

7. Open the frontend at **http://localhost:5173**. The Express health endpoint is **http://localhost:5000/api/health** and should return `{"status":"ok","database":"connected"}`.

## Demo login accounts

By default, when `NODE_ENV=development`, `npm run seed:demo` creates:

| Role | Email | Password |
|---|---|---|
| Student | `student@noteshub.demo` | `Study@12345` |
| Admin | `admin@noteshub.demo` | `Admin@12345` |

The demo student receives four personal example notes. The admin account publishes three shared study resources. Sign in as the student to test personal notes and Class resources; log out and sign in as admin to inspect the dashboard and publish more class material.

You can change these values in the project-root `.env` before running the seed command:

```env
DEMO_STUDENT_EMAIL=student@noteshub.demo
DEMO_STUDENT_PASSWORD=Study@12345
DEMO_ADMIN_EMAIL=admin@noteshub.demo
DEMO_ADMIN_PASSWORD=Admin@12345
```

**Before deploying or sharing a public URL:** change both demo passwords to strong unique values, run `npm run seed:demo` again so the hashes are updated, and preferably rename the demo email addresses. Do not leave the default admin password on a public site. Never commit `.env` to GitHub.

## Production / Render deployment

1. Push the project root contents to GitHub. Do not upload `.env` or `node_modules`.
2. In Render, create a Blueprint from the repository. `render.yaml` builds the Vite client and starts the Express server.
3. Set `MONGODB_URI` and `JWT_SECRET` as Render environment variables.
4. If you want demo records in the deployed database, set `DEMO_STUDENT_EMAIL`, `DEMO_STUDENT_PASSWORD`, `DEMO_ADMIN_EMAIL`, and `DEMO_ADMIN_PASSWORD` as Render environment variables, then run `npm run seed:demo` once from the Render Shell. Do not add a seed command to each deploy.
5. Open the Render URL and check `/api/health`.

`npm run seed:demo` refuses to use its built-in demo credentials when `NODE_ENV=production`; production credentials must be explicitly supplied. Ensure the admin password is private and unique.

## API overview

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | Service and database status | Public |
| POST | `/api/auth/register` | Create student account | Public |
| POST | `/api/auth/login` | Sign in | Public |
| GET | `/api/auth/me` | Current user profile | Signed in |
| GET | `/api/subjects` | Subject and topic library | Signed in |
| GET/POST | `/api/notes` | List/create personal notes | Owner |
| PATCH/DELETE | `/api/notes/:id` | Edit/delete own note | Owner |
| GET | `/api/resources` | List published shared resources | Signed in |
| GET | `/api/admin/dashboard` | Dashboard metrics and recent activity metadata | Admin |
| GET | `/api/admin/users` | User ID, role and personal note count | Admin |
| GET/POST | `/api/admin/resources` | List/create shared study resources | Admin |
| DELETE | `/api/admin/resources/:id` | Delete shared resource | Admin |

## Checks

Run backend syntax checks:

```bash
npm run check
```

Run the full manual test plan in [`QA_CHECKLIST.md`](./QA_CHECKLIST.md). The demo seed command requires a reachable MongoDB Atlas database; a successful syntax check does not prove a live Atlas deployment works.

## Important notes

- All frontend pages and interactions are kept in `client/src/App.jsx` as requested. `main.jsx` remains the React entry point.
- For production-grade use with real students, consider email verification, password reset, audit logs, secure httpOnly cookie sessions, backups and rate-limit monitoring.
- The admin dashboard intentionally shows note metadata rather than private note text.

# Online_Notes_Hub