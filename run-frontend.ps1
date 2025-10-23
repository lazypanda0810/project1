Write-Host "Starting frontend (Vite) on port 8080"
$Env:PORT = '8080'
cd "$PSScriptRoot\frontend"
npm run dev
