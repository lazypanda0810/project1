# Handover Checklist — Integrate DB, Payments, Authentication

This file lists the minimal, practical steps the implementer must follow to make the application production-ready for the three scope items: Database, Payment Gateway, and Authentication. It also includes quick validation commands and notes about the Docker/CI artifacts already provided.

Important: do NOT commit production secrets. Use an environment/secret manager in your deployment platform.

1) High-level goals
 - Replace the in-memory DB with a persistent MongoDB and validate migrations/seeding.
 - Integrate a payment gateway (Razorpay/Stripe/PayPal) with secure webhooks and idempotency.
 - Implement authentication (session or JWT), secure session secrets, and OAuth if needed.

2) Files & artifacts already prepared for you
 - `docker-compose.yml` — runs backend (port 5000) and frontend (port 8080) with `USE_IN_MEMORY_DB=true` by default.
 - `backend/Dockerfile`, `frontend/Dockerfile`, and `frontend/nginx.conf` — production-ready containers to build and serve the app.
 - `.env.production.example` — list of env variables expected in production.
 - `README_PRODUCTION.md` — quick start build/run instructions.
 - `.github/workflows/ci.yml` — CI that builds images and runs a smoke test on `/health` and `/api/status`.

3) Database (MongoDB)
 - Provision a production MongoDB (Atlas or self-hosted) and copy the connection URI.
 - Set `MONGODB_URI` in your deployment environment (or in `docker-compose.yml` when testing locally).
 - Disable in-memory fallback in production by ensuring `USE_IN_MEMORY_DB` is not set or set to `false`.
 - Optional: implement a migrations tool (recommended): use `migrate-mongoose`, `mongration`, or a custom migration script.
 - Seed initial data (if you need sample admin user or product data): a seed script already exists at `backend/src/scripts/seedData.js` (review and run with `node` in a safe environment).

Validation (after pointing to real DB):
```powershell
# Start containers (or restart backend container)
docker compose up -d --build

# Check health
curl -f http://localhost:5000/health
curl -f http://localhost:5000/api/status

# (Optional) Verify records
node backend/src/scripts/seedData.js  # or a custom script to list products/users
```

4) Authentication
 - Choose JWT or session-based auth. Required envs for sessions/JWT:
   - `SESSION_SECRET` (strong random value)
   - `JWT_SECRET` and `JWT_EXPIRES_IN` (if using JWT)
 - For OAuth (Google) add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and configure callback URLs.
 - Secure cookies and set `secure: true` when running behind HTTPS; set `sameSite` as appropriate.
 - Ensure password storage uses bcrypt (the repo uses bcrypt libraries — verify current controllers).

Validation (auth):
 - Test signup/login endpoints in sandbox or staging (do not use production user accounts for testing):
```powershell
curl -X POST http://localhost:5000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"Test123!"}'
curl -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"Test123!"}'
```

5) Payments & Webhooks
 - Provision the desired payment provider and add the API keys to envs (see `.env.production.example`).
 - Add webhook signing secrets to env and verify incoming webhook signatures in `backend/routes/webhook.js` (or implement secure verification if missing).
 - Implement idempotency for webhook handling and order creation to avoid duplicate charges.
 - Use sandbox/test mode of the payment provider for developing and testing webhook flows.

Validation (payments):
 - Trigger a test checkout flow in the frontend (or call the API) and verify order state in the backend.
 - Use the provider's webhook simulator to send test webhook events and verify the server accepts and processes them.

6) Operational recommendations
 - Secrets: use a secrets manager (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) to inject env variables in production.
 - TLS: terminate TLS at the reverse proxy/Load Balancer (nginx/ALB). Ensure `CORS_ORIGIN` is set to your frontend origin.
 - Logging: forward stdout logs to a central log system (ELK, Loki, Datadog). Keep error logs and set proper log levels.
 - Backups: configure MongoDB backups and a restore test run.
 - Monitoring: add healthchecks, metrics (Prometheus/Grafana) and alerting (pager duty/slack/email).

7) CI/CD and release
 - The repo contains a GitHub Actions workflow (`.github/workflows/ci.yml`) that builds images and runs a smoke test; adapt it to push images to your registry and deploy to your environment.
 - Recommended flow: PR -> run tests -> build images -> push to registry -> deploy to staging -> run smoke tests -> promote to production.

8) Quick checklist for handover (copy/paste for acceptance)
 - [ ] `MONGODB_URI` set and DB reachable from host
 - [ ] `SESSION_SECRET` and any `JWT_*` envs set
 - [ ] Payment API keys and webhook secret set and verified
 - [ ] OAuth credentials (if used) set and tested
 - [ ] App builds and starts via `docker compose up -d` and `/health` returns 200
 - [ ] CI pipeline passes and smoke tests succeed

9) Troubleshooting tips
 - If you see `EADDRINUSE`, check for duplicate node/pm2 processes or other services binding to port 5000.
 - If the app fails to connect to DB, verify `MONGODB_URI` format and network access (VPC/Firewall rules).
 - For webhook issues, enable request logging for a short window and use the provider's delivery history to inspect signatures and payloads.

10) Contact / Handoff notes
 - If you want me to implement automated DB migrations, CI image pushes, or a Helm chart for Kubernetes, I can add those next.

---
Generated: 2025-10-07
