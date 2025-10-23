# Google OAuth Setup — Detailed Guide

This guide documents step-by-step instructions for setting up Google OAuth for different application types and OAuth flows. It includes:

- Web server / server-side (OAuth 2.0 Authorization Code)
- Single Page App (SPA) with PKCE (Authorization Code + PKCE)
- Mobile apps (iOS / Android) using PKCE
- Service-to-service (Service Accounts) — for machine-to-machine access
- Common env vars, callback URLs, and troubleshooting

Use this as a reference when configuring Google Cloud Console and integrating with the backend and frontend code in this repository.

---

## Quick overview (which flow to use)

- Web server (standard web app with backend): use Authorization Code flow (server exchanges code for tokens). This is the repository's default (backend uses express + passport). Use when you can keep a client secret on the server.
- SPA (React / Vite): use Authorization Code + PKCE. The app never stores a client secret. The frontend performs PKCE and the backend can optionally perform the token exchange or you can use the backend as a proxy.
- Mobile (iOS/Android): use Authorization Code + PKCE with platform-specific redirect handlers.
- Service accounts: use for server-to-server APIs (no user consent). Not for user authentication.

---

## 1) Create Google Cloud project & OAuth credentials

1. Open Google Cloud Console: https://console.cloud.google.com/
2. Create or select a project.
3. Enable the following APIs (if you need profile/email info the default OAuth scope covers it):
   - People API (optional)
   - (Older instructions mention Google+ API — do not use; Google+ API is deprecated. Use People API and `openid email profile` scopes.)
4. Go to "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID".

Choose the application type and provide redirect/authorized origins:

- Web application
  - Authorized JavaScript origins: e.g., `http://localhost:5173` (frontend)
  - Authorized redirect URIs: e.g., `http://localhost:5000/auth/google/callback` (backend)

- Android / iOS: follow platform-specific instructions and provide reverse-domain style redirect URIs.

- Desktop (for local testing) or Other: provide `urn:ietf:wg:oauth:2.0:oob` or loopback addresses.

After creating credentials, copy:
- Client ID
- Client Secret (only for web server flow)

Important: For SPAs use a client ID that is configured for the appropriate platform and avoid embedding secrets in public code.

---

## 2) Scopes and consent screen

1. Configure OAuth consent screen (required for production):
   - User type: Internal (G Suite org) or External.
   - Add app name, homepage, privacy policy, support email.
   - Add scopes: `openid`, `email`, `profile` are typical.
   - Add test users (if app is external and in testing mode).
2. Publishing the app: if you use sensitive scopes or want public availability, submit the app for verification (may take time).

---

## 3) Environment variables (examples)

Add these to your backend `.env` (do NOT commit secrets):

```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
GOOGLE_OAUTH_SCOPES=openid email profile
```

For frontend (if you need redirect URL or origin):

```
VITE_GOOGLE_OAUTH_REDIRECT_URL=http://localhost:5000/auth/google
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com   # only if using frontend-initiated auth
```

---

## 4) Implementing Authorization Code flow (server-side web apps)

High-level flow:
1. User clicks "Login with Google" on frontend → browser navigates to backend route `/auth/google`.
2. Backend redirects user to Google OAuth endpoint with `client_id`, `redirect_uri`, `scope`, and `state`.
3. Google returns an authorization `code` to the `redirect_uri` endpoint (`/auth/google/callback`).
4. Backend exchanges the `code` + `client_secret` for tokens (access token, id_token, refresh_token if requested).
5. Backend validates `id_token` (verify signature and claims) and creates/updates the application user and session.

Example (Express + Passport.js):
- Install: `npm i passport passport-google-oauth20` on backend.
- Minimal setup (pseudocode):

```js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  // profile contains user info; create/find user in DB
  const user = await findOrCreateUserFromProfile(profile);
  done(null, user);
}));

app.get('/auth/google', passport.authenticate('google', { scope: ['openid', 'profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  // Successful auth
  res.redirect('/');
});
```

Notes:
- Persist sessions using secure cookies and a session store in production.
- Use `state` parameter to prevent CSRF — Passport does this for you.

---

## 5) Implementing PKCE for SPAs (Authorization Code + PKCE)

Why PKCE: SPAs can't keep client secrets. PKCE protects the code exchange by generating a code challenge/verifier pair.

Flow options:
- Frontend performs PKCE and exchanges code directly with Google's token endpoint (recommended for pure-SPA using Google OAuth endpoints).
- Or: Frontend performs PKCE and sends the authorization `code` to the backend, and backend does the exchange (backend does not need client secret if you rely on PKCE, but using a backend for token storage helps with session management).

Frontend libraries:
- Use `@openid/appauth` or Auth SDKs (e.g., `google-auth-library` or `oidc-client-ts`).

PKCE steps (brief):
1. Frontend creates `code_verifier` (random string) and `code_challenge = base64url(SHA256(code_verifier))`.
2. Redirect to Google auth endpoint with `code_challenge` and `code_challenge_method=S256`.
3. After user authorizes, Google redirects back with `code`.
4. Frontend POSTs to Google's token endpoint with `code_verifier`, `client_id` (no secret for PKCE), `grant_type=authorization_code`, and `redirect_uri`.

Example token request (fetch):
```js
const body = new URLSearchParams({
  client_id: VITE_GOOGLE_CLIENT_ID,
  code: codeFromQuery,
  redirect_uri: VITE_GOOGLE_OAUTH_REDIRECT_URL,
  grant_type: 'authorization_code',
  code_verifier: storedCodeVerifier,
});

const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
const tokens = await r.json();
```

Security notes:
- Use secure storage for `code_verifier` (in-memory or sessionStorage for browsers), avoid localStorage.
- Use HTTPS in production.

---

## 6) Mobile apps (iOS / Android)

- Use Authorization Code + PKCE.
- Register platform-specific redirect URIs in Google Console (e.g., `com.example.app:/oauth2redirect`).
- Use platform-native libraries (Google Sign-In SDKs or AppAuth).

---

## 7) Service Accounts (machine-to-machine)

Service Accounts are for server-to-server authentication, not user login. Create service account credentials in Google Cloud Console and download JSON key; use `googleapis` or `google-auth-library` to obtain JWT access tokens.

Example uses:
- Accessing Google Cloud APIs from a backend service.

---

## 8) Optional: Email double-check (verification after OAuth)

The repository implements an email double-check after OAuth. The flow typically is:
1. User signs in with Google and provides an email via OAuth tokens.
2. The app sends a 6-digit verification code to the user's email and requires the user to enter it before granting full access.

Why: Avoids account takeover and ensures the user owns the email.

Implementation hints:
- Use a mail provider (SendGrid, SMTP) to send codes.
- Generate time-limited codes and store hashed versions in DB with expiration.
- Mark user as verified after successful code entry.

---

## 9) Common troubleshooting

- "redirect_uri_mismatch" — The callback URL registered in Google Console must exactly match the `redirect_uri` used in the OAuth request.
- "invalid_client" — Check `client_id` and `client_secret`; ensure they match the created OAuth credentials and the type (web vs. other).
- Tokens missing refresh token on repeated auth attempts in testing: add `access_type=offline` and `prompt=consent` to force refresh token during development.

Example auth URL params to request offline access and force consent:
```
access_type=offline&prompt=consent
```

- PKCE failures: ensure `code_verifier` is the same used to generate the `code_challenge` and that the exchange includes `code_verifier`.

---

## 10) Example env snippets and commands

Backend `.env` snippet:
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
GOOGLE_OAUTH_SCOPES=openid email profile
```

Frontend `.env` snippet:
```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_GOOGLE_OAUTH_REDIRECT_URL=http://localhost:5000/auth/google
```

Testing endpoints from PowerShell:

```powershell
# Check backend oauth config endpoint if available
Invoke-WebRequest -Uri 'http://127.0.0.1:5000/auth/config' -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## 11) Security & production notes

- Never commit client secrets.
- Use HTTPS and secure cookie flags for sessions.
- Use CSP and other browser security headers.
- If you require user data (profile/email), request only necessary scopes.

---

## 12) Appendix — sample quick checklist for local testing

1. Create OAuth credentials (web application) and set redirect URI to `http://localhost:5000/auth/google/callback`.
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to backend `.env`.
3. Ensure backend `routes/auth.js` and `passport` setup exists (this repo contains `routes/auth.js`).
4. Start backend and frontend.
5. In browser visit the login page and click "Continue with Google".
6. Complete consent; confirm callback and session creation.

---

Saved as `GOOGLE_OAUTH_SETUP_DETAILED.md` in repo root.
