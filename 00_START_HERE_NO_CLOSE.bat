@echo off
cd /d "%~dp0"
start "SeventhLantern Auto Update" cmd.exe /k ""%~dp0AUTO_UPDATE_SETUP.cmd""
exit /b
