# Integration Setup: Database, Payments, Authentication

This document gives step-by-step instructions (including sample code snippets and validation commands) for integrating a production MongoDB, a payment gateway (Razorpay/Stripe example), and authentication (JWT or session-based). It's written for the engineer who will implement these subsystems.

Table of contents
- Database (MongoDB)
- Authentication (JWT / Sessions / OAuth)
- Payment gateway (Razorpay / Stripe) and webhooks
- Local testing & validation

------------------------

Database (MongoDB)
------------------

1) Provision
 - Option A: MongoDB Atlas (recommended): create cluster, create user, whitelist IPs or configure VPC peering.
 - Option B: Self-hosted MongoDB with backups and replica set.

2) Connection string
 - Format (Atlas):
   - mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
 - Set env variable `MONGODB_URI` with the production connection string.

3) Migrations & seeds
 - Add a migration tool (recommended): e.g., `migrate-mongoose` or `migrate-mongo`.
 - Keep migration scripts under `backend/migrations` and run them during deploy.
 - Seed initial data with `backend/src/scripts/seedData.js` (review before running).

4) TLS/Networking
 - Ensure MongoDB connections use TLS; set `?ssl=true` if needed and restrict network access.

Validation
```powershell
# Verify DB connectivity from the backend container
docker compose up -d backend
docker logs <backend_container_id> --follow
# Or run a node script to list collections
node backend/src/scripts/seedData.js --list
```

------------------------

Authentication
------------------

Approach choices
 - Session-based: good for server-rendered apps. Requires `SESSION_SECRET` and secure cookies.
 - JWT-based: good for SPA + mobile clients. Requires `JWT_SECRET` and token rotation/refresh logic.

Implementation steps (JWT example)
1. Add envs (already added to `.env.production.example`):
   - JWT_SECRET=replace_with_strong_secret
   - JWT_EXPIRES_IN=1h

2. Implement token issuance in `authController.register` and `authController.login`:
   - Sign a token: `const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })`

3. Protect routes via middleware `auth.js` (exists in `backend/src/middleware`): verify token and attach `req.user`.

4. Refresh tokens (recommended): issue short-lived access tokens and long-lived refresh tokens (store refresh tokens securely: httpOnly cookie or DB table with rotation).

5. OAuth (Google) — quick steps:
 - Create OAuth credentials in Google Cloud Console.
 - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in env.
 - Configure callback URL to `https://yourdomain.com/api/auth/google/callback`.

Validation
```powershell
# Register
curl -X POST http://localhost:5000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"Test123!"}'

# Login (get JWT)
curl -s -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"Test123!"}' | jq

# Access protected route
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/admin/some-protected
```

------------------------

Payment Gateway (Razorpay / Stripe)
----------------------------------

Razorpay Quick integration steps
1. Create account in Razorpay and get Key ID and Key Secret (test and live keys).
2. Add envs:
   - RAZORPAY_KEY_ID
   - RAZORPAY_KEY_SECRET
   - RAZORPAY_WEBHOOK_SECRET

3. Client flow (frontend): Create order via backend /api/checkout (backend calls Razorpay Orders API), then use Razorpay checkout on the client.
4. Webhook (backend): Implement `/webhook` endpoint to handle payment verification. Verify signature using the webhook secret.

Stripe Quick integration steps (alternate)
1. Create Stripe account; get `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
2. Add envs:
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
3. Implement checkout session creation in backend and handle webhooks.

Webhook security
 - Validate the webhook signature (Razorpay: `X-Razorpay-Signature`; Stripe: `Stripe-Signature`).
 - Use idempotency keys to avoid duplicate order processing.

Validation
 - Use provider sandbox / test mode to create test payments.
 - Use provider dashboard to replay webhooks.

------------------------

Local testing & CI tips
 - Use Docker Compose to spin up backend & frontend; for DB use a local MongoDB container or pass the Atlas URI.
 - Use ngrok for testing webhooks on local machine and set webhook URL in provider dashboard to the ngrok URL.

NGROK example
```powershell
ngrok http 5000
# Set webhook url to https://<ngrok-id>.ngrok.io/api/webhook
```

------------------------

Notes & warnings
 - Never check secrets into git.
 - Use HTTPS in production and ensure cookies marked secure.
 - Test failure modes (webhook retries, partial failures during payment) and implement compensating transactions.
