@echo off
setlocal
cd /d "%~dp0"
title Painel 3ZK 2.0

set "PROJECT_ROOT=%~dp0.."
set "PANEL_FILE=%~dp0painel-catalogo-3zk.html"

echo ==========================================================
echo  PAINEL 3ZK 2.0 - CENTRAL DO CATALOGO
echo ==========================================================
echo.

if not exist "%PANEL_FILE%" (
  echo ERRO: painel-catalogo-3zk.html nao foi encontrado.
  echo Extraia novamente o pacote diretamente em:
  echo C:\3ZK\catalogo-3zk
  echo.
  pause
  exit /b 1
)

if not exist "%PROJECT_ROOT%\dados\produtos-base.json" (
  echo ERRO: esta pasta nao esta dentro do projeto catalogo-3zk.
  echo Local esperado:
  echo C:\3ZK\catalogo-3zk\ferramentas-local
  echo.
  pause
  exit /b 1
)

echo Abrindo o painel sem Python e sem Visual Studio Code...
start "" "%PANEL_FILE%"

if errorlevel 1 (
  echo Nao foi possivel abrir automaticamente.
  echo Abra manualmente:
  echo %PANEL_FILE%
  echo.
  pause
  exit /b 1
)

exit /b 0
