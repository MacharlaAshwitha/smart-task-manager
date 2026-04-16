# Advanced Smart Task Manager

Full-stack task manager with JWT auth, MongoDB (Atlas), teams, comments, activity log, Kanban with drag-and-drop, dashboard charts, and dark/light mode.

## Project structure

```
smart-task-manager/
├── backend/                 # Express + Mongoose API
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── controllers/
│   │   ├── middleware/      # JWT auth
│   │   ├── models/          # User, Task, Team, Comment, Activity, Notification
│   │   ├── routes/
│   │   └── server.js
│   └── .env.example
├── frontend/                # React (Vite) SPA
│   └── src/
│       ├── api/
│       ├── context/         # Auth + theme
│       ├── pages/
│       └── components/
└── README.md
```

## MongoDB Atlas setup

1. Sign in at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a **free** cluster (any region).
3. **Database Access** → add a database user (username + password). Remember the password.
4. **Network Access** → add IP address `0.0.0.0/0` (allow from anywhere) for development, or your current IP for tighter security.
5. **Database** → **Browse Collections** → **Connect** → **Drivers** → copy the connection string.
6. Replace `<password>` with your user’s password (URL-encode special characters if needed).
7. Append a database name, e.g. `...mongodb.net/smart_tasks?retryWrites=true&w=majority`.

Example:

`mongodb+srv://dbuser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/smart_tasks?retryWrites=true&w=majority`

## Backend setup

```bash
cd backend
copy .env.example .env
```

Edit `.env`: set `MONGODB_URI` and a long random `JWT_SECRET` (e.g. `openssl rand -hex 32` on Mac/Linux, or any 32+ character random string on Windows).

```bash
npm install
npm run dev
```

API default: `http://localhost:5000`  
Health check: `GET http://localhost:5000/api/health`

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App default: `http://localhost:5173`  
Vite proxies `/api` to `http://localhost:5000`, so the UI calls `/api/...` without CORS issues during development.

Optional: create `frontend/.env` with `VITE_API_URL=http://localhost:5000/api` if you prefer not to use the proxy.

## Features implemented

- **Auth:** Register, login, bcrypt passwords, JWT in `Authorization: Bearer`, token stored in `localStorage`, protected API routes and React routes.
- **Tasks:** CRUD, per-owner `userId`, filters (status, priority, due range, tag), text search, sort, subtasks, tags, team + assignee.
- **Teams:** Create team, invite by email, accept invite (pending list), assign tasks to members.
- **Comments** on tasks; **activity** log for main actions; **notifications** for assignments + due/overdue summaries on dashboard.
- **Dashboard:** Stats + pie/bar charts (Recharts).
- **UI:** Dashboard, Tasks, Kanban (drag-and-drop via `@hello-pangea/dnd`), Teams, dark/light toggle.

## API overview

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register`, `/api/auth/login` | No |
| GET | `/api/auth/me` | Yes |
| CRUD | `/api/tasks`, `/api/tasks/:id` | Yes |
| GET/POST | `/api/tasks/:taskId/comments` | Yes |
| DELETE | `/api/comments/:commentId` | Yes |
| CRUD-ish | `/api/teams`, `/api/teams/:id/invite`, `/api/teams/:id/accept` | Yes |
| GET | `/api/dashboard/stats` | Yes |
| GET | `/api/notifications` | Yes |
| GET | `/api/activity` | Yes |

Admins may pass `?scope=all` on `GET /api/tasks` to list all tasks (demo / viva).

## Production notes

- Set `CLIENT_ORIGIN` in backend `.env` to your deployed frontend URL.
- Serve the built frontend (`npm run build` in `frontend/`) from a static host or the same origin as the API.
- Use strong secrets, restrict Atlas IP allowlist, and prefer HTTPS everywhere.
