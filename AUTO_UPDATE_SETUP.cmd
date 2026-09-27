@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SeventhLantern GitHub + Vercel Auto Update Setup

set "GH_OWNER=maijude119-creator"
set "GH_REPO=seventhlantern-website"
set "VERCEL_PROJECT=seventhlanternwebsitevercelready-1"

echo ======================================================
echo SeventhLantern - GitHub + Vercel Auto Update Setup
echo ======================================================
echo.
echo IMPORTANT: This file must be in the SAME folder as index.html
echo.

if not exist "index.html" (
  echo [ERROR] index.html was not found in this folder.
  echo.
  echo Please copy BOTH files below into your website root folder:
  echo   00_START_HERE_NO_CLOSE.bat
  echo   AUTO_UPDATE_SETUP.cmd
  echo.
  echo The correct folder is the one that also contains:
  echo   index.html
  echo   vercel.json
  echo   assets
  echo   game
  echo.
  echo This window will stay open. Close it manually after reading.
  goto :end
)

if not exist "vercel.json" (
  echo [ERROR] vercel.json was not found. This is probably the wrong folder.
  goto :end
)

echo [OK] Website folder detected.
echo.

where winget >nul 2>nul
set "HAS_WINGET=%ERRORLEVEL%"

where git >nul 2>nul
if errorlevel 1 (
  echo [1/6] Git is missing.
  if "%HAS_WINGET%"=="0" (
    echo Installing Git...
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
  ) else (
    echo Opening Git download page...
    start "" "https://git-scm.com/download/win"
    echo Install Git, then run this file again.
    goto :end
  )
)
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin"
where git >nul 2>nul || (
  echo [ERROR] Git is still unavailable. Restart this setup after Git installation.
  goto :end
)

where gh >nul 2>nul
if errorlevel 1 (
  echo [2/6] GitHub CLI is missing.
  if "%HAS_WINGET%"=="0" (
    echo Installing GitHub CLI...
    winget install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements
  ) else (
    echo Opening GitHub CLI download page...
    start "" "https://cli.github.com/"
    echo Install GitHub CLI, then run this file again.
    goto :end
  )
)
set "PATH=%PATH%;C:\Program Files\GitHub CLI"
where gh >nul 2>nul || (
  echo [ERROR] GitHub CLI is still unavailable. Restart this setup after installation.
  goto :end
)

where node >nul 2>nul
if errorlevel 1 (
  echo [3/6] Node.js is missing.
  if "%HAS_WINGET%"=="0" (
    echo Installing Node.js LTS...
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
  ) else (
    echo Opening Node.js download page...
    start "" "https://nodejs.org/"
    echo Install the LTS version, then run this file again.
    goto :end
  )
)
set "PATH=%PATH%;C:\Program Files\nodejs"
where node >nul 2>nul || (
  echo [ERROR] Node.js is still unavailable. Restart this setup after installation.
  goto :end
)

echo.
echo [4/6] GitHub login check...
gh auth status >nul 2>nul
if errorlevel 1 (
  echo A browser login will start now.
  echo Use GitHub account: %GH_OWNER%
  gh auth login --hostname github.com --git-protocol https --web
  if errorlevel 1 (
    echo [ERROR] GitHub login did not complete.
    goto :end
  )
)

echo.
echo [5/6] Uploading website to GitHub...
if not exist ".git" git init -b main

for /f "delims=" %%i in ('gh api user --jq .login 2^>nul') do set "GH_LOGIN=%%i"
if not defined GH_LOGIN set "GH_LOGIN=%GH_OWNER%"
git config user.name "%GH_LOGIN%"
git config user.email "%GH_LOGIN%@users.noreply.github.com"
git add -A
git diff --cached --quiet
if errorlevel 1 git commit -m "Website auto-update initial release"

gh repo view "%GH_OWNER%/%GH_REPO%" >nul 2>nul
if errorlevel 1 (
  echo Creating repository: %GH_OWNER%/%GH_REPO%
  gh repo create "%GH_OWNER%/%GH_REPO%" --public --source=. --remote=origin --push
  if errorlevel 1 (
    echo [ERROR] GitHub repository creation/push failed.
    goto :end
  )
) else (
  git remote get-url origin >nul 2>nul
  if errorlevel 1 (
    git remote add origin "https://github.com/%GH_OWNER%/%GH_REPO%.git"
  ) else (
    git remote set-url origin "https://github.com/%GH_OWNER%/%GH_REPO%.git"
  )
  git branch -M main
  git push -u origin main
  if errorlevel 1 (
    echo [ERROR] GitHub push failed.
    goto :end
  )
)

echo.
echo GitHub upload completed:
echo https://github.com/%GH_OWNER%/%GH_REPO%

echo.
echo [6/6] Connecting Vercel...
call npx --yes vercel@latest whoami >nul 2>nul
if errorlevel 1 (
  echo Vercel login will start now.
  call npx --yes vercel@latest login
  if errorlevel 1 (
    echo [ERROR] Vercel login did not complete.
    goto :end
  )
)

echo Linking existing Vercel project: %VERCEL_PROJECT%
call npx --yes vercel@latest link --project "%VERCEL_PROJECT%" --yes
if errorlevel 1 (
  echo Automatic project link failed. Starting interactive link...
  echo When asked "Link to existing project?" choose Y.
  echo Project name: %VERCEL_PROJECT%
  call npx --yes vercel@latest link
  if errorlevel 1 (
    echo [ERROR] Vercel project link failed.
    goto :end
  )
)

echo Connecting GitHub repository to Vercel...
call npx --yes vercel@latest git connect
if errorlevel 1 (
  echo [ERROR] Vercel Git connection failed.
  goto :end
)

echo.
echo ======================================================
echo SUCCESS - AUTO UPDATE IS NOW ENABLED
echo ======================================================
echo GitHub: https://github.com/%GH_OWNER%/%GH_REPO%
echo Site:   https://%VERCEL_PROJECT%.vercel.app
echo.
echo From now on, pushes to GitHub main will trigger Vercel deployments.
echo.

:end
echo.
echo ------------------------------------------------------
echo This window will NOT close automatically.
echo If you see an ERROR, send a screenshot of the last lines to ChatGPT.
echo ------------------------------------------------------
echo.
pause
