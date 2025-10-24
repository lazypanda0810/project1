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
  if($null -ne $c){ Write-Ok ("Command available: {0}" -f $cmd); return $true }
  Write-Warn ("Command NOT found: {0}" -f $cmd)
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

Write-Host ("Repository root: {0}`n" -f $RepoRoot)

# Basic checks
Check-Cmd node | Out-Null
Check-Cmd npm | Out-Null
Check-Cmd git | Out-Null

Write-Host "Done sample run."