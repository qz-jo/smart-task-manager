# Smart Task Manager

A full-stack task manager with JWT authentication, reminders, filtering, and PostgreSQL persistence. The Express server serves both the API and the static frontend, so the project can be deployed as one web service.

## Requirements

- Node.js 20 or newer
- PostgreSQL

## Local setup

```bash
cd server
cp .env.example .env
npm ci
npm start
```

Create the PostgreSQL database referenced by `DATABASE_URL` before starting. Tables and indexes are created automatically. Open `http://localhost:3000` after startup.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `JWT_SECRET` | Yes | Random secret containing at least 32 characters |
| `PORT` | No | HTTP port; defaults to `3000` |
| `DATABASE_SSL` | No | Set to `true` when the database provider requires SSL |
| `CLIENT_ORIGIN` | No | Allowed CORS origin when the frontend is hosted separately |

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Generic deployment

Create one Node web service with:

- Root directory: `server`
- Install command: `npm ci`
- Start command: `npm start`
- Health endpoint: `/health`

Attach a managed PostgreSQL database, then set `DATABASE_URL`, `JWT_SECRET`, and `DATABASE_SSL` according to the provider. The frontend uses the same origin as the API and needs no separate URL configuration.

## AI status

AI suggestions are intentionally disabled for production. The authenticated `/ai/suggest` endpoint returns `503` until a hosted provider is implemented; it no longer depends on a local Ollama process.

## Security notes

- Do not commit `.env` or real secrets.
- Restrict `CLIENT_ORIGIN` if the frontend is deployed separately.
- Use HTTPS in production.
