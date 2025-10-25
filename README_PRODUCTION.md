# Production Handover Notes

This project is prepared for handover. The recipient will implement database, payment gateway, and authentication.

What I've prepared:
- Dockerfiles for `backend` and `frontend`.
- `docker-compose.yml` to run both services locally in a production-like configuration (frontend proxy to backend).
- `frontend/nginx.conf` to serve the built frontend and proxy `/api` to the backend.
- `.env.production.example` with variables the implementer should set.

How to run locally (for smoke testing):

1. Build and start services (requires Docker and Docker Compose):

```powershell
docker compose build
docker compose up -d
```

2. Check services:

 - Backend health: http://localhost:5000/health
 - API status: http://localhost:5000/api/status
 - Frontend: http://localhost:8080/

Notes for implementer:
- Replace `USE_IN_MEMORY_DB=true` with a real `MONGODB_URI` in compose or use a secret manager.
- Add secrets (session tokens, OAuth keys, payment provider keys) to environment or secret store — do NOT commit secrets.
- Update Nginx config if serving under a domain; enable TLS termination at load balancer or reverse proxy.
 
Further setup steps and validation instructions are in `INTEGRATION_SETUP.md` and system requirements are listed in `REQUIREMENTS.md`.

Webhooks & local testing:
- Use `ngrok` to expose local backend when testing webhooks.
- Example: `ngrok http 5000` and set provider webhook URL to the ngrok URL + `/api/webhook`.
