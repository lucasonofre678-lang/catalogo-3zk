@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Configurar protecao local - Catalogo 3ZK

echo Configurando validacao automatica antes de cada commit...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0automacao\configurar_git_seguro.ps1"
set "RESULTADO=%ERRORLEVEL%"
echo.
if not "%RESULTADO%"=="0" (
  echo ERRO: a protecao nao foi configurada.
) else (
  echo Configuracao concluida com sucesso.
)
echo.
pause
exit /b %RESULTADO%
