@echo off
chcp 65001 >nul
color 0E
title Backend - Push to GitHub (care-it-backend)
echo.
echo ============================================================
echo    BACKEND - Pushing new commits to GitHub
echo    (HR department + Private sector Engagement + returnedBy)
echo ============================================================
echo.
cd /d "c:\Users\RobinSande\OneDrive - CARE International\Desktop\CareITAssets\backend\care-it-backend-main"
if errorlevel 1 (
  echo [ERROR] Could not find backend folder. Is CareITAssets on your Desktop?
  pause
  exit /b 1
)

echo Current local HEAD:
git --no-optional-locks -c core.logAllRefUpdates=false -c core.appendAtomically=false rev-parse --short HEAD
echo.
echo Local latest commit message:
git --no-optional-locks -c core.logAllRefUpdates=false -c core.appendAtomically=false log -1 --oneline
echo.
echo Running: git push origin main
echo ------------------------------------------------------------
git --no-optional-locks -c core.logAllRefUpdates=false -c core.appendAtomically=false push origin main
set PUSH_ERR=%ERRORLEVEL%
echo ------------------------------------------------------------
if "%PUSH_ERR%"=="0" (
  echo.
  echo [OK] Backend pushed successfully to GitHub!
  echo Now verify: https://github.com/robinsande/care-it-backend/commits/main
) else (
  echo.
  echo [FAILED] exit code %PUSH_ERR%
  echo.
  echo Most common fixes:
  echo   1) If a browser/GitHub login window opened, log in, then double-click this file again.
  echo   2) Open PowerShell, paste:  gh auth login
  echo      (select GitHub.com, HTTPS, Login with browser) then double-click this file again.
)
echo.
pause
