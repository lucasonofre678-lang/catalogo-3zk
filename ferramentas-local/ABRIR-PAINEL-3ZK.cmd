@echo off
setlocal
cd /d "%~dp0"
title Abrir Painel 3ZK

set "PROJECT_ROOT=%~dp0.."
set "PANEL_FILE=%~dp0painel-catalogo-3zk.html"

echo ==========================================================
echo  PAINEL LOCAL DO CATALOGO 3ZK
echo ==========================================================
echo.

if not exist "%PANEL_FILE%" (
  echo ERRO: painel-catalogo-3zk.html nao foi encontrado.
  echo.
  echo Extraia o pacote novamente diretamente em:
  echo C:\3ZK\catalogo-3zk
  echo.
  pause
  exit /b 1
)

if not exist "%PROJECT_ROOT%\dados\produtos-base.json" (
  echo ERRO: a pasta ferramentas-local nao esta dentro do projeto correto.
  echo.
  echo O local esperado e:
  echo C:\3ZK\catalogo-3zk\ferramentas-local
  echo.
  pause
  exit /b 1
)

echo Abrindo o painel sem precisar instalar Python...
echo.
echo Quando a pagina abrir:
echo 1. Clique em Selecionar pasta
echo 2. Escolha C:\3ZK\catalogo-3zk
echo 3. Clique em Selecionar pasta novamente na janela do Windows
echo.

start "" "%PANEL_FILE%"

if errorlevel 1 (
  echo.
  echo Nao foi possivel abrir automaticamente.
  echo Abra manualmente:
  echo %PANEL_FILE%
  echo.
  pause
  exit /b 1
)

timeout /t 3 /nobreak >nul
exit /b 0
