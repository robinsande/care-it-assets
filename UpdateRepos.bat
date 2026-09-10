@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title CARE IT - Update Both Repos to GitHub
color 0B

echo ============================================================
echo    CARE IT Assets - Update Both GitHub Repositories
echo ============================================================
echo.
cd /d "%~dp0"

set "BACKEND_DIR=%~dp0backend\care-it-backend-main"
set "FRONTEND_DIR=%~dp0frontend\care-it-assets-main"
set "BACKEND_COMMIT_MSG=feat: add HR & Private sector Engagement depts; include returnedBy in search + history + export"
set "FRONTEND_COMMIT_MSG=feat: add HR & Private sector Engagement depts; show Returned By column, searchable"

:: -----------------------------------------------------------
echo [1/4] Checking git is available...
where git >nul 2>nul
if errorlevel 1 (
    echo ERROR: git is not installed or not on PATH. Install git first.
    pause
    exit /b 1
)
echo       git found.
echo.

:: -----------------------------------------------------------
echo [2/4] Backend - commit and push...
echo -----------------------------------------------------------
cd /d "%BACKEND_DIR%"
if errorlevel 1 (
    echo ERROR: cannot cd to "%BACKEND_DIR%"
    pause
    exit /b 1
)
echo.
git --no-optional-locks status --short
git --no-optional-locks rev-parse HEAD >nul 2>nul
set "COMMIT_DONE=0"
git --no-optional-locks log -1 --oneline | findstr /c:"HR" /c:"Private sector" /c:"returnedBy" >nul
if not errorlevel 1 (
    echo       Backend commit appears to already exist locally. Skipping commit.
    set "COMMIT_DONE=1"
)
if "%COMMIT_DONE%"=="0" (
    git --no-optional-locks add server.js
    if errorlevel 1 ( echo       git add failed & pause & exit /b 1 )
    git -c core.logAllRefUpdates=false -c core.appendAtomically=false commit --no-optional-locks -m "%BACKEND_COMMIT_MSG%"
    if errorlevel 1 (
        echo.
        echo       Commit via appendAtomically=false failed. Trying with global config workaround...
        git --no-optional-locks commit -m "%BACKEND_COMMIT_MSG%"
        if errorlevel 1 (
            echo.
            echo ERROR: Backend commit still failed. Try running this batch as Administrator,
            echo        or manually run the commit command from PowerShell.
            pause
            exit /b 1
        )
    )
)
echo.
echo       Pushing backend to origin/main ...
git --no-optional-locks push origin main
if errorlevel 1 (
    echo.
    echo ERROR: Backend push failed. This usually means GitHub needs authentication.
    echo        If a browser window opens, log in to GitHub and approve, then re-run this file.
    echo        Or run: gh auth login   (if you have GitHub CLI)
    pause
    exit /b 1
)
echo       Backend OK - pushed to GitHub.
echo.

:: -----------------------------------------------------------
echo [3/4] Frontend - commit and push...
echo -----------------------------------------------------------
cd /d "%FRONTEND_DIR%"
if errorlevel 1 (
    echo ERROR: cannot cd to "%FRONTEND_DIR%"
    pause
    exit /b 1
)
echo.
git --no-optional-locks status --short
git --no-optional-locks rev-parse HEAD >nul 2>nul
set "COMMIT_DONE_FRONT=0"
git --no-optional-locks diff --cached --name-only | findstr /c:"index.html" /c:"script.js" >nul
if not errorlevel 1 (
    echo       Frontend files are staged - they just need commit + push.
)
git --no-optional-locks log -1 --oneline 2>nul | findstr /c:"HR" /c:"Private sector" /c:"Returned By" >nul
if not errorlevel 1 (
    echo       Frontend commit appears to already exist locally. Skipping commit.
    set "COMMIT_DONE_FRONT=1"
)
if "%COMMIT_DONE_FRONT%"=="0" (
    git --no-optional-locks add index.html script.js
    if errorlevel 1 ( echo       git add failed & pause & exit /b 1 )
    git -c core.logAllRefUpdates=false -c core.appendAtomically=false commit --no-optional-locks -m "%FRONTEND_COMMIT_MSG%"
    if errorlevel 1 (
        echo.
        echo       Commit via appendAtomically=false failed. Trying normal commit...
        git --no-optional-locks commit -m "%FRONTEND_COMMIT_MSG%"
        if errorlevel 1 (
            echo.
            echo ERROR: Frontend commit still failed.
            echo        Try running this file as Administrator, or run the commands manually from PowerShell.
            pause
            exit /b 1
        )
    )
)
echo.
echo       Pushing frontend to origin/main ...
git --no-optional-locks push origin main
if errorlevel 1 (
    echo.
    echo ERROR: Frontend push failed. This usually means GitHub needs authentication.
    echo        If a browser window opens, log in to GitHub and approve, then re-run this file.
    pause
    exit /b 1
)
echo       Frontend OK - pushed to GitHub.
echo.

:: -----------------------------------------------------------
echo [4/4] Done! Verifying ...
echo -----------------------------------------------------------
echo.
cd /d "%BACKEND_DIR%"
echo Backend latest commit:
git --no-optional-locks log -1 --oneline
echo.
cd /d "%FRONTEND_DIR%"
echo Frontend latest commit:
git --no-optional-locks log -1 --oneline
echo.
echo ============================================================
echo  SUCCESS: Both repos are now updated on GitHub!
echo  Refresh:
echo   Backend:  https://github.com/robinsande/care-it-backend/commits/main
echo   Frontend: https://github.com/robinsande/care-it-assets/commits/main
echo ============================================================
echo.
pause
