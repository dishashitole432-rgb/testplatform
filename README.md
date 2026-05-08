# MERN Test Platform

Full-stack online test system with admin and candidate flows:
- Admin creates tests and adds timed MCQ questions.
- Candidate attempts tests with per-question timers.
- Platform stores answers, computes score, and shows review.

## Tech
- Frontend: React + Vite
- Backend: Node.js + Express + MongoDB (Mongoose)
- Auth: JWT + bcrypt

## Local Setup

### 1) Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Key API Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/tests/admin`
- `POST /api/tests/:id/questions`
- `PATCH /api/tests/:id/publish`
- `POST /api/attempts/start/:testId`
- `POST /api/attempts/:attemptId/answer`
- `POST /api/attempts/:attemptId/submit`
- `GET /api/attempts/:attemptId/result`

## Deployment

### MongoDB Atlas
1. Create a free Atlas cluster.
2. Create DB user and get `MONGODB_URI`.

### Railway (Backend)
1. Create new Railway project from `server` folder.
2. Add env vars: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`.
3. Deploy and copy backend URL, e.g. `https://your-api.up.railway.app`.

### Vercel (Frontend)
1. Import `client` folder as a project.
2. Add env var: `VITE_API_BASE_URL=https://your-api.up.railway.app/api`.
3. Deploy.

## Production Smoke Test
1. Register admin.
2. Create test with timed MCQ questions.
3. Publish test.
4. Register candidate and attempt test.
5. Submit and verify score + answer review.
