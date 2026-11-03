# NotesHub sign-in fix and UI update

## What changed

- Removed the two decorative promo cards from the left side of the sign-in screen: “Learn at your pace / One topic at a time” and “Your notes stay yours / Saved to your account”.
- Kept the rest of the sign-in/signup layout and app features unchanged.
- Improved frontend API errors so a stopped backend, a non-JSON response, and an API error are reported with actionable messages.
- Normalized email addresses before submitting signup or login.
- Improved backend errors for MongoDB connectivity and duplicate account cases.
- Express now listens on port 5000 before opening the MongoDB connection. This allows `/api/health` to return a readable JSON status even when Atlas credentials/network access are not configured yet.
- Vite's `/api` proxy now explicitly targets `127.0.0.1:5000`.
- Non-JSON API errors now include the HTTP status and a short response preview to make the cause easier to identify.

## Run locally

1. Open this project folder (the folder that contains the root `package.json`, `client/`, and `server/`).
2. Ensure `.env` is in this same root folder. It must contain a real MongoDB Atlas URI and a JWT secret of at least 32 characters.
3. In the terminal, run `npm install`, then `npm install --prefix client`.
4. Run `npm run dev` from the project root. Keep both processes running.
5. Open `http://localhost:5000/api/health`. Expected JSON: `{"status":"ok","database":"connected"}`.
6. Open `http://localhost:5173` and try signup/login again.

## If health check fails

- If the page cannot open: the Express backend is not running. Run `npm run dev` from the project root, not from `client/`.
- If it says `database: disconnected`: check the backend terminal and the MongoDB Atlas connection string, database-user password, and Network Access IP allowlist.
- If it says `MONGODB_URI is missing`: put `.env` beside the root `package.json`, not inside `client/` or `server/`.
- If the email already has an account: switch to the Log in tab and use the existing password.

Never share or commit `.env`, your MongoDB password, or your JWT secret.
