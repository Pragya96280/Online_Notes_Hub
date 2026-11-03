# NotesHub QA Checklist

Run `npm run seed:demo` first, then start the project with `npm run dev` and open `http://localhost:5173`.

## 1. Demo accounts and access control
- [ ] Sign in as `student@noteshub.demo` using the password printed by the seed command.
- [ ] Confirm the student opens the Explore page and does not see Admin dashboard.
- [ ] Sign out and sign in as `admin@noteshub.demo`.
- [ ] Confirm the admin sees Admin dashboard.
- [ ] While signed in as a student, request `/api/admin/dashboard` manually with the student's bearer token; it must return HTTP 403.
- [ ] Confirm public signup cannot submit or grant an admin role.

## 2. Seed data
- [ ] Student account has four example personal notes.
- [ ] Admin account has three published shared resources.
- [ ] Admin dashboard displays both account IDs.
- [ ] Running `npm run seed:demo` a second time does not duplicate sample notes/resources.

## 3. Student validations and notes
- [ ] Signup rejects a malformed email address.
- [ ] Signup rejects a name shorter than 2 characters or with invalid characters.
- [ ] Signup rejects a password shorter than 8 characters or missing uppercase/lowercase/number.
- [ ] Signup rejects an email already in use.
- [ ] Login rejects an incorrect password with a clear error.
- [ ] Student can read subjects and topic content.
- [ ] Student can create a personal note of 3–5,000 characters.
- [ ] Blank or 1–2 character notes are rejected.
- [ ] Student can edit and delete only their own notes.
- [ ] Personal notes remain after refresh and are not visible to a different student account.

## 4. Class resources
- [ ] Student can open Class resources and read all published resources.
- [ ] Student cannot call admin resource create/delete endpoints.
- [ ] Admin can publish a resource with a valid subject/topic, title and 20–8,000 character body.
- [ ] Invalid subject/topic, too-short title and too-short body are rejected.
- [ ] Newly published resource appears in the student Class resources page after refresh.
- [ ] Admin can delete a shared resource and it disappears for students.

## 5. Admin dashboard
- [ ] Dashboard displays account, personal note, resource and new-user counts.
- [ ] Latest signups and their IDs are shown.
- [ ] All accounts table displays role and note count.
- [ ] Recent personal-note activity shows metadata only, not private content.
- [ ] Refresh data reloads dashboard metrics, users and resources.

## 6. App and deployment
- [ ] `http://localhost:5000/api/health` returns JSON and reports `database: connected`.
- [ ] `http://localhost:5173` loads the React frontend.
- [ ] Opening `http://localhost:5000/` in development returns a helpful API message rather than an ENOENT for `client/dist/index.html`.
- [ ] Light/dark theme works.
- [ ] Mobile layout works.
- [ ] Production `npm run build` completes before deploying to Render.
- [ ] Render health check `/api/health` reports a connected database.
