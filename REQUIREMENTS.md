# System & Project Requirements

This file lists the recommended system packages, runtimes, and service accounts required to run the project in development and production.

1) System (host)
 - OS: Ubuntu 22.04 LTS (or Windows Server 2019+, macOS Monterey+ for dev)
 - CPU: 2 vCPU (min) for small deployments
 - RAM: 4GB (min); 8GB recommended
 - Disk: 10GB free for logs and data (plus DB storage)

2) Software
 - Docker Engine: 20.10+ (if using Docker)
 - Docker Compose: v2+
 - Node.js: 18.x or newer (LTS)
 - npm: 9.x
 - pm2: latest (for process supervision, optional)

3) Services / Accounts
 - MongoDB Atlas cluster or self-hosted replica set
 - (Payment) Razorpay account or Stripe account for payments and webhooks
 - (Auth/OAuth) Google Cloud OAuth credentials if using Google OAuth

4) Environment variables (summary)
 - General: NODE_ENV, PORT, CORS_ORIGIN
 - Database: MONGODB_URI
 - Auth: JWT_SECRET, JWT_EXPIRES_IN, SESSION_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 - Payments (Razorpay): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
 - Payments (Stripe): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

5) CI
 - GitHub Actions (provided) or similar CI that can build Docker images.

6) Optional Tools
 - ngrok (for webhook testing)
 - mongo shell / mongosh

Maintenance
 - Backups: Schedule nightly backups for MongoDB (Atlas snapshots or mongodump)
 - Monitoring: Set up logs (ELK/Cloudwatch) and SLOs
