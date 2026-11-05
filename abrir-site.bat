@echo off
cd /d "%~dp0"
start "Cars Character Vault" http://localhost:8765
powershell -NoProfile -ExecutionPolicy Bypass -Command "python -m http.server 8765"
