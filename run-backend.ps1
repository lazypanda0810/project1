param(
  [string]$Port = '5050'
)

Write-Host "Starting backend on port $Port using in-memory DB"
$Env:PORT = $Port
$Env:USE_IN_MEMORY_DB = 'true'
$Env:NODE_ENV = 'development'
$Env:CORS_ORIGIN = 'http://localhost:8080'
$Env:SESSION_SECRET = 'testsecret'

cd "$PSScriptRoot\backend"
npm run dev
