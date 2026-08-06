@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Diagnostico GitHub - Catalogo 3ZK
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0automacao\diagnostico_github.ps1"
set "RESULTADO=%ERRORLEVEL%"
echo.
pause
exit /b %RESULTADO%
