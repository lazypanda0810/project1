DB INSTALL GUIDE - MongoDB (Native Windows Installer)

Overview
--------
This guide shows step-by-step instructions to install MongoDB Community Server on Windows using the native MSI installer, create a data directory, create admin/app users, (optionally) enable authentication, add the connection string to the project, run the seed script, start the backend and frontend, and troubleshoot common issues.

Follow each step in order. Copy/paste the PowerShell commands where provided.

1) Download & install MongoDB Community Server (MSI)
-------------------------------------------------
- Visit: https://www.mongodb.com/try/download/community
- Pick a stable release (7.x or latest stable) and download the Windows MSI.
- Run the MSI and follow the installer wizard:
  - Choose "Complete" installation.
  - Check "Install MongoDB as a Service" (recommended).
  - Leave service name as default (MongoDB or mongod).
  - Make sure "Install MongoDB Shell (mongosh)" is selected.

Notes:
- Installer typically installs to: C:\Program Files\MongoDB\Server\<version>\
- The service uses a configuration file (usually under C:\ProgramData\MongoDB or inside Program Files) — see step 4.

2) Create data directory and start service
-----------------------------------------
If the MSI created the service it should usually create the data directory and start automatically. If not, or if you prefer manual setup, run the following in an Administrator PowerShell.

```powershell
# create default data directory
New-Item -Path 'C:\data\db' -ItemType Directory -Force

# check service status (service name may be 'MongoDB' or 'mongod')
Get-Service -Name MongoDB, mongod -ErrorAction SilentlyContinue

# start service (if stopped)
Start-Service -Name MongoDB -ErrorAction SilentlyContinue
# or
Start-Service -Name mongod -ErrorAction SilentlyContinue
```

If you prefer to run mongod manually (non-service):

```powershell
# start mongod in foreground (adjust path to your mongod.exe if needed)
& 'C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe' --dbpath C:\data\db
```

Verify server is reachable:

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
# Should show TcpTestSucceeded : True

# open interactive shell
mongosh
# inside mongosh: db.version()
```

3) Create admin and application users (recommended)
--------------------------------------------------
You can skip creating users if you don't plan to enable authentication. But creating users is recommended if you intend to enable `authorization` (auth) later.

Open `mongosh`:

```powershell
mongosh
```

Create an admin user (optional):

```js
use admin
db.createUser({
  user: "admin",
  pwd: "ChangeMeStrongPassword!",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
});
```

Create your application database and a dedicated app user:

```js
use watchwebsite
db.createUser({
  user: "watchapp",
  pwd: "watchpass123!",
  roles: [{ role: "readWrite", db: "watchwebsite" }]
});
```

Replace passwords with secure values for non-local environments.

4) (Optional) Enable authentication (authorization) in mongod config
-------------------------------------------------------------------
If you want MongoDB to require credentials, enable authorization in the config and restart the service.

Locate the service config file `mongod.cfg` — typical locations:
- C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg
- C:\ProgramData\MongoDB\mongod.cfg

Example `mongod.cfg` to save (adjust paths if necessary):

```yaml
systemLog:
  destination: file
  path: C:\data\log\mongod.log
  logAppend: true
storage:
  dbPath: C:\data\db
net:
  bindIp: 127.0.0.1
  port: 27017
security:
  authorization: enabled
```

After editing/saving the config, restart the service:

```powershell
# restart (service name may vary)
Restart-Service -Name MongoDB -Force
# or
Restart-Service -Name mongod -Force
```

If you enable `authorization`, use an authenticated connection string in your app, e.g.:
```
mongodb://watchapp:watchpass123!@127.0.0.1:27017/watchwebsite?authSource=watchwebsite
```

5) Add DB connection string to your project (backend)
----------------------------------------------------
Your backend reads environment variables. Add a `.env` in `d:\newweb\watchwebsite-main\backend` or set env vars in PowerShell.

Example `.env` (no auth):

```
SESSION_SECRET=dev-session-secret
MONGODB_URI=mongodb://127.0.0.1:27017/watchwebsite
NODE_ENV=development
PORT=5000
```

With auth:

```
MONGODB_URI=mongodb://watchapp:watchpass123!@127.0.0.1:27017/watchwebsite?authSource=watchwebsite
```

PowerShell alternative (session-level):

```powershell
cd d:\newweb\watchwebsite-main\backend
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/watchwebsite'
$env:SESSION_SECRET = 'dev-session-secret'
$env:NODE_ENV = 'development'
```

Important: Do NOT commit `.env` to git. Add `.env` to `.gitignore`.

6) Seed the database and start backend
-------------------------------------
The project includes a seed script. Run it after your `MONGODB_URI` is set and MongoDB is running.

```powershell
cd d:\newweb\watchwebsite-main\backend
npm run seed
# or (if script is not wired):
node src/scripts/seedData.js

# start backend (nodemon dev)
npm run dev
```

Watch backend logs for seed messages and connection confirmation.

7) Start frontend and confirm proxy
-----------------------------------
Open a new terminal and run the frontend dev server.

```powershell
cd d:\newweb\watchwebsite-main\frontend
npx vite --host 127.0.0.1 --port 5173 --strictPort
# or
npm run dev
```

Verify proxy from the frontend dev server to the backend:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:5173/api/status' -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: the backend API /api/status JSON response.

Open your browser to:
- http://127.0.0.1:5173/

Confirm:
- Home page loads (Index)
- Product listing displays (sample products seeded)
- Clicking items doesn't immediately redirect to /login (unless protected route)

8) Quick verification and useful commands
-----------------------------------------
Backend health check:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:5000/health' -UseBasicParsing | Select-Object -ExpandProperty Content
```

Backend API status:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/status' -UseBasicParsing | Select-Object -ExpandProperty Content
```

Mongo connectivity tests:

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
# or connect via mongosh
mongosh "mongodb://127.0.0.1:27017"
```

9) Troubleshooting
------------------
- Port 27017 in use:
```powershell
netstat -aon | findstr ":27017"
# get PID from right-most column
Stop-Process -Id <PID> -Force
```

- Service not starting: check MongoDB log (path defined in mongod.cfg) or Windows Event Viewer > Application.

- Dev server prints Local URL but browser can't reach it:
  - Ensure Vite is bound to IPv4: use `--host 127.0.0.1`.
  - Try `npx vite preview --port 5174` after `npm run build` to serve static preview.

- Auth errors after enabling authorization:
  - Confirm the user exists in the correct db and the connection string contains `authSource` if needed.

10) Optional tooling
--------------------
- MongoDB Compass (GUI) — download from MongoDB downloads to view collections visually.
- Docker variant — if you prefer isolation, use Docker: `docker run -d --name mongodb -p 27017:27017 -v C:\data\mongodb:/data/db mongo:7.0`

11) Security & housekeeping
---------------------------
- Do not commit `.env` with credentials.
- Use strong passwords and do not expose the database port publicly.
- For ephemeral local dev you can use `USE_IN_MEMORY_DB=true` (the backend supports an in-memory DB for testing) but note data will vanish on restart.

12) If you'd like me to do this for you
--------------------------------------
I can run the Docker-based setup, or assist step-by-step while you run the native installer. If you'd like me to run commands here (e.g., create config file, start a local mongod manually, or run seed script), say one of:
- "create config file" — I'll provide and/or write `mongod.cfg` to the repo for you to copy.
- "walk me through users" — I'll give exact mongosh commands to create users and show how to test them.
- "I ran into an error" — paste the exact error and I will debug it.

---

Saved at: DB_INSTALL_GUIDE.md (repo root)
