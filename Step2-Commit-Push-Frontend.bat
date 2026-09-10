@echo off
chcp 65001 >nul
color 0B
title Frontend - Commit & Push to GitHub (care-it-assets)
echo.
echo ============================================================
echo    FRONTEND - Commit & Push to GitHub
echo    (HR + Private sector departments + Returned By column
echo     + returner-name search)
echo ============================================================
echo.
cd /d "c:\Users\RobinSande\OneDrive - CARE International\Desktop\CareITAssets\frontend\care-it-assets-main"
if errorlevel 1 (
  echo [ERROR] Could not find frontend folder. Is CareITAssets on your Desktop?
  pause
  exit /b 1
)

set GIT_LOCK_FIXES=git --no-optional-locks -c core.logAllRefUpdates=false -c core.appendAtomically=false -c core.safecrlf=false
setlocal enabledelayedexpansion

echo Current local HEAD:
%GIT_LOCK_FIXES% rev-parse --short HEAD
echo.
echo Changed files right now:
%GIT_LOCK_FIXES% status --short
echo.

:: Step 1) Check if already committed
%GIT_LOCK_FIXES% diff --cached --quiet -- index.html script.js
if errorlevel 1 goto :DO_COMMIT
%GIT_LOCK_FIXES% diff --quiet -- index.html script.js
if errorlevel 1 goto :DO_COMMIT
:: Also check if working tree is clean AND latest commit mentions feature
%GIT_LOCK_FIXES% log -1 --oneline | findstr /c:"HR" /c:"Private sector" /c:"Returned By" >nul
if not errorlevel 1 (
  echo Latest commit already has feature. Skipping commit, just push.
  goto :DO_PUSH
)

:DO_COMMIT
echo Step 1/3: Staging index.html and script.js ...
%GIT_LOCK_FIXES% add index.html script.js
set ERR=%ERRORLEVEL%
if "%ERR%" NEQ "0" (
  echo [FAILED] git add failed (exit %ERR%)
  pause
  exit /b 1
)
echo [OK] staged.
echo.
echo Step 2/3: Committing with OneDrive workarounds ...
%GIT_LOCK_FIXES% commit -m "feat: add HR & Private sector Engagement depts; Returned By column, searchable"
set ERR=%ERRORLEVEL%
if "%ERR%" NEQ "0" (
  echo.
  echo Warning: normal commit failed (exit %ERR%). Trying alternate approach:
  echo   - disable safe crlf
  echo   - append atomically false globally
  echo.
  %GIT_LOCK_FIXES% config --local core.autocrlf false
  %GIT_LOCK_FIXES% config --local core.safecrlf false
  %GIT_LOCK_FIXES% commit --no-verify -m "feat: add HR & Private sector Engagement depts; Returned By column, searchable"
  set ERR2=%ERRORLEVEL%
  if "%ERR2%" NEQ "0" (
    echo.
    echo [FAILED] Commit still failed (exit %ERR2%)
    echo.
    echo Please do this once from PowerShell to fix the OneDrive lock:
    echo   cd "c:\Users\RobinSande\OneDrive - CARE International\Desktop\CareITAssets\frontend\care-it-assets-main"
    echo   git config core.appendAtomically false
    echo   git config core.logAllRefUpdates false
    echo   git config core.autocrlf false
    echo   git config core.safecrlf false
    echo   git add index.html script.js
    echo   git commit -m "feat: add HR ^& Private sector Engagement depts; Returned By column, searchable"
    echo Then double-click this file again to push.
    pause
    exit /b 1
  )
)
echo [OK] committed.

:DO_PUSH
echo.
echo Step 3/3: Pushing frontend to origin/main ...
echo ------------------------------------------------------------
%GIT_LOCK_FIXES% push origin main
set PUSH_ERR=%ERRORLEVEL%
echo ------------------------------------------------------------
if "%PUSH_ERR%"=="0" (
  echo.
  echo [OK] Frontend pushed successfully to GitHub!
  echo Now verify: https://github.com/robinsande/care-it-assets/commits/main
  echo.
  echo The last commit at the top should say:
  echo   feat: add HR ^& Private sector Engagement depts; Returned By column, searchable
) else (
  echo.
  echo [FAILED] push exit code %PUSH_ERR%
  echo.
  echo Most common fixes:
  echo   1) If a browser/GitHub login window opened, log in, then double-click this file again.
  echo   2) Open PowerShell, paste:  gh auth login
  echo      (select GitHub.com, HTTPS, Login with browser) then double-click this file again.
)
echo.
pause
endlocal
