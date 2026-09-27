@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
title SeventhLantern - GitHub Push Repair

set "GH_OWNER=maijude119-creator"
set "GH_REPO=seventhlantern-website"
set "VERCEL_PROJECT=seventhlanternwebsitevercelready-1"
set "TAG=v1.0.0"
set "ZIPFILE=downloads\SeventhLantern_v1.0.0_Windows.zip"
set "RELEASE_URL=https://github.com/%GH_OWNER%/%GH_REPO%/releases/download/%TAG%/SeventhLantern_v1.0.0_Windows.zip"

echo ======================================================
echo SeventhLantern - Repair GitHub Upload and Continue Setup
echo ======================================================
echo.
echo This repair will:
echo   1. Keep the website/game files in GitHub.
echo   2. Move the 78MB Windows ZIP to GitHub Releases.
echo   3. Connect the GitHub repo to the existing Vercel project.
echo   4. Trigger automatic Vercel deployment.
echo.

if not exist "index.html" (
  echo [ERROR] index.html not found.
  echo Copy this CMD file into the SAME folder as index.html, then run it again.
  goto :end
)
if not exist "%ZIPFILE%" (
  echo [ERROR] %ZIPFILE% not found.
  echo Please use the website folder that contains the downloads folder and Windows ZIP.
  goto :end
)

where git >nul 2>nul || (echo [ERROR] Git not found. & goto :end)
where gh >nul 2>nul || (echo [ERROR] GitHub CLI not found. & goto :end)
where node >nul 2>nul || (echo [ERROR] Node.js not found. & goto :end)

gh auth status >nul 2>nul
if errorlevel 1 (
  echo [LOGIN] GitHub login is required.
  gh auth login --hostname github.com --git-protocol https --web
  if errorlevel 1 (echo [ERROR] GitHub login failed. & goto :end)
)

echo.
echo [1/5] Preparing a smaller GitHub repository...
REM The first failed local Git history included the 78MB ZIP. Recreate local history so that blob is not pushed again.
if exist ".git" rmdir /s /q ".git"

findstr /x /c:"downloads/*.zip" .gitignore >nul 2>nul || echo downloads/*.zip>>.gitignore
findstr /x /c:".vercel/" .gitignore >nul 2>nul || echo .vercel/>>.gitignore

REM Point the download page at the GitHub Release asset instead of the ignored local ZIP.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p='site-config.js'; $s=Get-Content -Raw -Encoding UTF8 $p;" ^
  "$s=$s -replace 'url:\s*\"/downloads/SeventhLantern_v1\.0\.0_Windows\.zip\"','url: \"%RELEASE_URL%\"';" ^
  "$s=$s -replace 'owner:\s*\"\"','owner: \"%GH_OWNER%\"';" ^
  "$s=$s -replace 'repo:\s*\"\"','repo: \"%GH_REPO%\"';" ^
  "$s=$s -replace 'github:\s*\"\"','github: \"https://github.com/%GH_OWNER%/%GH_REPO%\"';" ^
  "Set-Content -Encoding UTF8 $p $s"
if errorlevel 1 (echo [ERROR] Could not update site-config.js. & goto :end)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p='download.html'; $s=Get-Content -Raw -Encoding UTF8 $p;" ^
  "$s=$s.Replace('/downloads/SeventhLantern_v1.0.0_Windows.zip','%RELEASE_URL%');" ^
  "Set-Content -Encoding UTF8 $p $s"
if errorlevel 1 (echo [ERROR] Could not update download.html. & goto :end)

git init -b main
git config user.name "%GH_OWNER%"
git config user.email "%GH_OWNER%@users.noreply.github.com"
REM HTTP/1.1 is often more reliable on networks that reset large HTTP/2 Git pushes.
git config http.version HTTP/1.1
git add -A
git commit -m "Initial website source for automatic deployment"
if errorlevel 1 (echo [ERROR] Local Git commit failed. & goto :end)
git remote add origin "https://github.com/%GH_OWNER%/%GH_REPO%.git"

echo.
echo [2/5] Uploading website source to GitHub...
git push -u origin main
if errorlevel 1 (
  echo [ERROR] Source push failed again.
  echo The Windows ZIP was already excluded, so this is now most likely a network issue.
  echo Try this repair again on a more stable connection.
  goto :end
)

echo.
echo [3/5] Uploading Windows game ZIP to GitHub Release...
gh release view "%TAG%" --repo "%GH_OWNER%/%GH_REPO%" >nul 2>nul
if errorlevel 1 (
  gh release create "%TAG%" "%ZIPFILE%" --repo "%GH_OWNER%/%GH_REPO%" --title "The Seventh Lantern v1.0.0" --notes "Windows full release. Final animation build with ending-path hotfix."
) else (
  gh release upload "%TAG%" "%ZIPFILE%" --repo "%GH_OWNER%/%GH_REPO%" --clobber
)
if errorlevel 1 (
  echo [ERROR] Release ZIP upload failed.
  echo The website source is already safe on GitHub. Run this repair again to retry the Release upload.
  goto :end
)

echo.
echo [4/5] Connecting the existing Vercel project...
call npx --yes vercel@latest whoami >nul 2>nul
if errorlevel 1 (
  call npx --yes vercel@latest login
  if errorlevel 1 (echo [ERROR] Vercel login failed. & goto :end)
)
call npx --yes vercel@latest link --project "%VERCEL_PROJECT%" --yes
if errorlevel 1 (
  echo Automatic link needs confirmation. Starting interactive project linking...
  echo Choose the existing project: %VERCEL_PROJECT%
  call npx --yes vercel@latest link
  if errorlevel 1 (echo [ERROR] Vercel project link failed. & goto :end)
)
call npx --yes vercel@latest git connect
if errorlevel 1 (echo [ERROR] Vercel Git connection failed. & goto :end)

echo.
echo [5/5] Triggering the first automatic deployment...
git commit --allow-empty -m "Trigger Vercel automatic deployment"
git push origin main
if errorlevel 1 (echo [ERROR] Final trigger push failed. & goto :end)

echo.
echo ======================================================
echo SUCCESS - AUTOMATIC UPDATES ARE ENABLED
echo ======================================================
echo GitHub: https://github.com/%GH_OWNER%/%GH_REPO%
echo Release: https://github.com/%GH_OWNER%/%GH_REPO%/releases/tag/%TAG%
echo Site: https://%VERCEL_PROJECT%.vercel.app
echo.
echo From now on, pushing changes to GitHub main will automatically redeploy Vercel.

:end
echo.
echo ------------------------------------------------------
echo This window will stay open.
echo If you see ERROR, send ChatGPT a screenshot of the last lines.
echo ------------------------------------------------------
echo.
pause
