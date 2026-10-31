@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" (
  where py >nul 2>nul
  if %errorlevel%==0 (
    py -3 -m venv backend\.venv
  ) else (
    python -m venv backend\.venv
  )
)
call "backend\.venv\Scripts\activate.bat"
python -c "import flask" >nul 2>nul
if errorlevel 1 (
  echo Installing LANPulse dependencies...
  python -m pip install -r backend\requirements.txt
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and Python installation.
    pause
    exit /b 1
  )
)
echo.
echo Starting LANPulse Enterprise...
echo Open http://127.0.0.1:5000 in your browser.
echo Keep this window open while using Live Monitoring.
echo Press Ctrl+C to stop the server.
echo.
python backend\app.py
pause
