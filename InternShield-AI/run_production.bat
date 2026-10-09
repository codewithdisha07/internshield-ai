@echo off
title InternShield AI - Production Server
color 0A
echo ============================================================
echo      InternShield AI - Starting Production Fullstack Server
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/3] Building latest React frontend...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/3] Checking Python virtual environment...
cd backend
if not exist ".venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate
call pip install -r requirements.txt

echo.
echo [3/3] Launching unified production server on http://localhost:8000 ...
echo Both API endpoints and React UI are hosted on the same port.
echo.
start http://localhost:8000
python -m uvicorn main:app --host 127.0.0.1 --port 8000

pause
