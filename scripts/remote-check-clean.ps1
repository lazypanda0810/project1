# Lightweight remote-check clean script
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

Write-Host "Repository root: $RepoRoot`n"

# Basic command checks
Write-Host "Checking commands: node, npm, git"
$cmds = @('node','npm','git')
foreach($c in $cmds){
  if(Get-Command $c -ErrorAction SilentlyContinue){ Write-Ok "Command available: $c" } else { Write-Warn "Command NOT found: $c" }
}

# Check folders
if(Test-Path $BackendDir){ Write-Ok "Backend folder present: $BackendDir" } else { Write-Err "Backend folder missing: $BackendDir" }
if(Test-Path $FrontendDir){ Write-Ok "Frontend folder present: $FrontendDir" } else { Write-Err "Frontend folder missing: $FrontendDir" }

# Check backend package and .env
$pkg = Join-Path $BackendDir 'package.json'
if(Test-Path $pkg){ Write-Ok "Found backend/package.json" } else { Write-Warn "backend/package.json missing" }
$env = Join-Path $BackendDir '.env'
if(Test-Path $env){ Write-Ok "Found backend/.env" } else { Write-Warn "backend/.env missing (expected)" }

# Test MongoDB port (27017)
Write-Host "`nTesting MongoDB connectivity (127.0.0.1:27017)"
$mongo = Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -WarningAction SilentlyContinue
if($mongo.TcpTestSucceeded){ Write-Ok "MongoDB port 27017 reachable" } else { Write-Warn "MongoDB port 27017 NOT reachable" }

# Write a small log
$logFile = Join-Path $LogsDir 'clean_check.log'
@("Checked at: $(Get-Date)", "RepoRoot: $RepoRoot") | Out-File -FilePath $logFile -Encoding utf8
Write-Ok "Wrote summary log: $logFile"

Write-Host "Remote clean-check finished."