PLEASE READ — Development handoff & next steps

This file summarizes what I changed, what is left to do, and exact step-by-step instructions (PowerShell) to finish verification and troubleshoot the remaining issues.

---

1) Quick summary (what I changed)

- Commit: 6ef47d6 (pushed to `master`) — message: "fix(auth): tolerate /api/auth/me shapes; avoid premature redirects; preload products; clear loading; update vite config"
- Files changed (frontend):
  - `src/context/AuthContext.tsx` — now accepts both response shapes from `/api/auth/me` and sets `isDoubleChecked` safely.
  - `src/components/ProtectedRoute.tsx` — waits for auth check to complete before redirecting to `/login`.
  - `src/contexts/AppContext.tsx` — preloads `frontend/src/data/products.ts` into initial state, ensures `fetchProducts` always clears loading, defensive error fallback for products/cart.
  - `src/App.tsx` — home route made public (Index rendered on `/`).
  - `vite.config.ts` — updated proxy/host adjustments (use 127.0.0.1 / process.env.BACKEND_URL), to reduce IPv6 binding issues.

Why I made these changes
- The app was redirecting to `/login` prematurely because of mismatched API response shapes and auth-check timing.
- The product listing sometimes showed a spinner or empty state when API/proxy failed; preloading sample products makes UI usable offline.

---

2) What is left / outstanding

A. Verify frontend in a real browser (REQUIRED)
- Confirm the Home page loads and is NOT automatically redirecting to `/login`.
- Confirm sample product listings show on the Home page.
- Confirm clicking UI (cards/links) does not immediately redirect to `/login` (unless trying to access protected routes like `/checkout`).

B. If verification fails, gather diagnostics (DevTools logs)
- Console logs
- Network request/response for `/api/auth/me` (status + response body)
- Any failing resource requests (status + response body)

C. If the dev server still isn't reachable from your environment:
- Try `npm run build` + `npx vite preview` (static preview) on a different port and test again.
- Optionally perform an aggressive local restart of frontend dev nodes (I can do this if you want me to). See the commands below.

D. Final smoke tests (after verification)
- Run TypeScript check: `npx tsc --noEmit`
- Run a couple of HTTP checks:
  - `http://127.0.0.1:5000/health` (backend)
  - `http://127.0.0.1:5173/` (frontend dev)
  - `http://127.0.0.1:5173/api/status` (proxied API)

---

3) How to run dev servers (PowerShell)

Start backend (recommended in its own terminal):

```powershell
cd d:\newweb\watchwebsite-main\backend
$env:SESSION_SECRET = 'dev-session'
$env:USE_IN_MEMORY_DB = 'true'
# start backend
npm run dev
```

Start frontend (dev):

```powershell
cd d:\newweb\watchwebsite-main\frontend
# regular start (Vite), will pick a port or fallback
npm run dev

# OR start on a strict port (use if you want stable port):
npx vite --host 127.0.0.1 --port 5173 --strictPort
```

Start static preview (if dev server is flaky):

```powershell
cd d:\newweb\watchwebsite-main\frontend
npm run build
# run preview on a different port to avoid collisions
npx vite preview --port 5174
# open http://127.0.0.1:5174/
```

Type checking / linting:

```powershell
cd d:\newweb\watchwebsite-main\frontend
npx tsc --noEmit
npm run lint # if configured
```

---

4) How to collect browser DevTools logs (step-by-step)

1. Open Chrome (or Edge), press F12 to open DevTools.
2. In the Network tab, enable "Preserve log" and filter by "auth" or search for `/api/auth/me`.
3. Reload the page (F5) and watch the Network request to `/api/auth/me`.
4. Click the request and copy:
   - Status code (e.g., 200, 401, 500)
   - Response body (JSON)
5. In Console tab, copy any errors (red messages) and paste them here.

What I need from you if there is a problem
- The full JSON response for `/api/auth/me` and any console errors.
- The exact Local URL you opened (Vite prints it in the frontend terminal when running `npm run dev`).

---

5) How to perform an aggressive restart here (if you ask me to do it)

Warning: this will kill node processes that look like frontend dev runs. It may interrupt other node tasks. Use only if you understand the risk.

Commands (PowerShell):

```powershell
# show node processes
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId,CommandLine | Out-String -Width 200

# kill candidates that contain 'npx vite' or 'npm-cli.js run dev'
$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -match 'npx vite' -or $_.CommandLine -match 'npm-cli.js run dev') }
if ($procs) { foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force } }

# then restart frontend:
cd d:\newweb\watchwebsite-main\frontend
npx vite --host 127.0.0.1 --port 5173 --strictPort
```

If you want me to run a safe variant here (I can), say "do it" and I'll run it.

---

6) How to revert or adjust changes

- To test alternatives safely, create a branch and make changes there:

```powershell
cd d:\newweb\watchwebsite-main\frontend
git checkout -b fix/auth-waiting-local
# make changes, commit, push
git add .
git commit -m "test: temporary change"
git push -u origin fix/auth-waiting-local
```

- To revert a single file to origin/master:

```powershell
git fetch origin
git checkout origin/master -- src/context/AuthContext.tsx
```

---

7) Where I left notes in the repo

- This file: `PLEASE_READ_NEXT_STEPS.md` (you are reading it)
- Commit: `6ef47d6` (front-end fixes) on branch `master` — check `git log -1` inside `frontend` to see the commit.
- Files modified: see section 1 above.

---

8) If you want me to continue (pick one)
- "Verify in browser" (you do browser checks and paste logs) — I will act on any repro.
- "Aggressive restart" (I run the kill/restart commands here) — I will do it and re-check reachability.
- "Build+preview" (I run `npm run build` + `vite preview` here) — I will run and provide the preview URL for you to open.

---

If anything is unclear, say which item you want help with and I will execute it. If you want me to run the aggressive restart or the build+preview now, reply: `do aggressive restart` or `build preview`.

Thank you — please read this file before continuing so we avoid repeating steps.
