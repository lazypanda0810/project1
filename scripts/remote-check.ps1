Param(
  [switch]$StartServers
)

function Write-Ok($s){ Write-Host "[OK]    $s" -ForegroundColor Green }
function Write-Warn($s){ Write-Host "[WARN]  $s" -ForegroundColor Yellow }
function Write-Err($s){ Write-Host "[ERROR] $s" -ForegroundColor Red }

$RepoRoot = Resolve-Path . | Select-Object -ExpandProperty Path
$BackendDir = Join-Path $RepoRoot 'backend'
$FrontendDir = Join-Path $RepoRoot 'frontend'
$LogsDir = Join-Path $RepoRoot 'scripts\logs'
New-Item -Path $LogsDir -ItemType Directory -Force | Out-Null

function Check-Cmd($cmd){
  $c = Get-Command $cmd -ErrorAction SilentlyContinue
  if($null -ne $c){ Write-Ok "Command available: $cmd"; return $true }
  Write-Warn "Command NOT found: $cmd"
  return $false
}

function Read-EnvFile($path){
  $map = @{}
  if(Test-Path $path){
    Get-Content $path | ForEach-Object {
      if($_ -match '^\s*([^#=]+)=(.*)$'){
        $k = $matches[1].Trim()
        $v = $matches[2].Trim().Trim("'`\"")
        $map[$k] = $v
      }
    }
  }
  return $map
}

Write-Host "Repository root: $RepoRoot`n"

# 1. Basic prerequisites
Write-Host "Checking prerequisites..."
Check-Cmd node | Out-Null
Check-Cmd npm | Out-Null
Check-Cmd git | Out-Null
$hasMongosh = Check-Cmd mongosh
$hasDocker = Check-Cmd docker

# 2. Check key files
Write-Host "`nChecking important files..."
$files = @('GOOGLE_OAUTH_SETUP_DETAILED.md','DB_INSTALL_GUIDE.md','PLEASE_READ_NEXT_STEPS.md')
foreach($f in $files){
  $p = Join-Path $RepoRoot $f
  if(Test-Path $p){ Write-Ok "$f present" } else { Write-Warn "$f missing: $p" }
}

# 3. Backend .env checks
Write-Host "`nReading backend .env..."
$backendEnvPath = Join-Path $BackendDir '.env'
$envMap = Read-EnvFile $backendEnvPath
$requiredBackendKeys = @('MONGODB_URI','SESSION_SECRET')
foreach($k in $requiredBackendKeys){
  if($envMap.ContainsKey($k) -and $envMap[$k]){ Write-Ok "Env $k ok" } else { Write-Warn "Env $k missing or empty in backend/.env" }
}
# OAuth keys (optional)
$oauthKeys = @('GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_CALLBACK_URL')
$oauthConfigured = $true
foreach($k in $oauthKeys){
  if(-not ($envMap.ContainsKey($k) -and $envMap[$k])){ Write-Warn "OAuth env missing: $k"; $oauthConfigured = $false }
}
if($oauthConfigured){ Write-Ok "OAuth envs appear configured" } else { Write-Warn "OAuth not fully configured" }

# 4. Install deps if needed
function Ensure-Install($dir){
  $nm = Join-Path $dir 'node_modules'
  if(-not (Test-Path $nm)){
    Write-Host "Installing npm deps in $dir ..."
    Push-Location $dir
    npm install 2>&1 | Tee-Object -FilePath (Join-Path $LogsDir ("npm_install_" + (Split-Path $dir -Leaf) + ".log"))
    Pop-Location
    Write-Ok "Installed deps in $dir"
  } else { Write-Ok "node_modules present in $dir" }
}
if(Test-Path $BackendDir){ Ensure-Install $BackendDir } else { Write-Err "Backend folder not found: $BackendDir" }
if(Test-Path $FrontendDir){ Ensure-Install $FrontendDir } else { Write-Err "Frontend folder not found: $FrontendDir" }

# 5. Run frontend TypeScript check (if tsconfig exists)
$tsconfig = Join-Path $FrontendDir 'tsconfig.json'
if(Test-Path $tsconfig){
  Write-Host "`nRunning TypeScript check (frontend)..."
  Push-Location $FrontendDir
  npx tsc --noEmit 2>&1 | Tee-Object -FilePath (Join-Path $LogsDir 'tsc_frontend.log')
  $tsOut = Get-Content (Join-Path $LogsDir 'tsc_frontend.log') -ErrorAction SilentlyContinue
  if($tsOut -match 'error') { Write-Warn "TypeScript reported errors (see logs)" } else { Write-Ok "TypeScript check passed (frontend)" }
  Pop-Location
} else { Write-Warn "No tsconfig.json in frontend; skipping tsc check" }

# 6. Seed DB (if seed script exists)
Write-Host "`nChecking backend package.json for seed script..."
$pkg = Join-Path $BackendDir 'package.json'
$canSeed = $false
if(Test-Path $pkg){
  $json = Get-Content $pkg -Raw | ConvertFrom-Json
  if($json.scripts -and $json.scripts.seed){
    Write-Host "Running npm run seed ..."
    Push-Location $BackendDir
    npm run seed 2>&1 | Tee-Object -FilePath (Join-Path $LogsDir 'seed.log')
    Pop-Location
    Write-Ok "Seed script executed; check seed.log for details"
    $canSeed = $true
  } else { Write-Warn "No seed script found in backend/package.json" }
} else { Write-Err "backend/package.json missing" }

# 7. MongoDB port check
Write-Host "`nChecking MongoDB connectivity (27017)..."
$mongoTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -WarningAction SilentlyContinue
if($mongoTest.TcpTestSucceeded){ Write-Ok "MongoDB port 27017 reachable" } else { Write-Warn "MongoDB port 27017 NOT reachable. If using Docker or service, ensure mongod is running." }

# 8. Optionally start servers
$backendProc = $null; $frontendProc = $null
if($StartServers){
  Write-Host "`nStarting backend and frontend in new PowerShell windows..."
  if(Test-Path $BackendDir){
    $backendProc = Start-Process -FilePath 'powershell' -ArgumentList "-NoExit","-Command","cd '$BackendDir'; npm run dev" -PassThru
    Write-Ok "Started backend (PID $($backendProc.Id))"
  }
  Start-Sleep -Seconds 2
  if(Test-Path $FrontendDir){
    $frontendProc = Start-Process -FilePath 'powershell' -ArgumentList "-NoExit","-Command","cd '$FrontendDir'; npx vite --host 127.0.0.1 --port 5173 --strictPort" -PassThru
    Write-Ok "Started frontend (PID $($frontendProc.Id))"
  }
  Write-Host "Waiting 6 seconds for servers to bind..."
  Start-Sleep -Seconds 6
}

# 9. Port & endpoint probes
Write-Host "`nProbing endpoints..."
$checks = @(
  @{ Name='Backend health'; Url='http://127.0.0.1:5000/health' },
  @{ Name='Backend api status'; Url='http://127.0.0.1:5000/api/status' },
  @{ Name='Auth config'; Url='http://127.0.0.1:5000/auth/config' },
  @{ Name='Frontend root'; Url='http://127.0.0.1:5173/' },
  @{ Name='Frontend proxied api/status'; Url='http://127.0.0.1:5173/api/status' },
  @{ Name='Auth me'; Url='http://127.0.0.1:5000/api/auth/me' }
)
foreach($c in $checks){
  try{
    $resp = Invoke-WebRequest -Uri $c.Url -UseBasicParsing -TimeoutSec 6 -ErrorAction Stop
    $ct = $resp.Content
    Write-Ok "$($c.Name) => $($c.Url) responded (length $($ct.Length))"
    $logFile = Join-Path $LogsDir ("probe_" + ($c.Name -replace '\s+','_') + ".log")
    $ct | Out-File -FilePath $logFile -Encoding utf8
  } catch {
    Write-Warn "$($c.Name) => $($c.Url) did NOT respond: $($_.Exception.Message)"
  }
}

# 10. Node processes & listening ports
Write-Host "`nListing node processes and relevant listeners..."
Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object Id,StartTime,Path | Format-Table -AutoSize
netstat -aon | Select-String ":5000|:5173|:27017" | Select-Object -First 50

# 11. Quick Git status (recent commits)
Write-Host "`nGit status & recent commits..."
if(Test-Path (Join-Path $RepoRoot '.git')) {
  git status --porcelain
  git log --oneline -n 5
} else { Write-Warn "Not a git repo at $RepoRoot" }

# 12. Final suggestions based on checks
Write-Host "`nFinal report / suggestions:"
if(-not (Test-Path $BackendDir)){ Write-Err "Backend folder missing; ensure project files are present." }
if(-not (Test-Path $FrontendDir)){ Write-Err "Frontend folder missing." }
if(-not $mongoTest.TcpTestSucceeded){ Write-Warn "MongoDB unreachable: start mongod or Docker container. See DB_INSTALL_GUIDE.md" }
if(-not $oauthConfigured){ Write-Warn "OAuth not fully configured. Add GOOGLE_CLIENT_ID/SECRET in backend/.env" } else { Write-Ok "OAuth envs present (backend/.env)" }

Write-Host "`nSuggested next actions (if any warnings above):"
Write-Host " - Inspect logs in $LogsDir (npm install, seed, tsc logs, probe logs)."
Write-Host " - If servers didn't start: open backend and frontend terminals manually and run npm run dev / npx vite as shown."
Write-Host " - If OAuth missing: paste real redirect and client id/secret into backend/.env (do not commit)."
Write-Host " - If auth redirects still occur: open browser DevTools Network and copy /api/auth/me response."

Write-Host "`nRemote check finished."
