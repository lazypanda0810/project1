@echo off
REM Usage: run-remote-check.bat [start]
setlocal
if "%1"=="start" (
  powershell -ExecutionPolicy Bypass -File "%~dp0remote-check.ps1" -StartServers
) else (
  powershell -ExecutionPolicy Bypass -File "%~dp0remote-check.ps1"
)
endlocal
