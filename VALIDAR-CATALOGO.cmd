@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Validacao preventiva - Catalogo 3ZK

echo ============================================================
echo  VALIDACAO PREVENTIVA DO CATALOGO 3ZK
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0automacao\validar_catalogo.ps1"
set "RESULTADO=%ERRORLEVEL%"

echo.
if not "%RESULTADO%"=="0" (
  echo NAO FACA COMMIT. Corrija os erros exibidos acima.
) else (
  echo Pode abrir o GitHub Desktop e fazer Commit e Push.
)
echo.
pause
exit /b %RESULTADO%
