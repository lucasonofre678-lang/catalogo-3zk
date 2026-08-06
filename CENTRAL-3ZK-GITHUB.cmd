@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Central segura GitHub - Catalogo 3ZK

:menu
cls
echo ============================================================
echo  CENTRAL SEGURA GITHUB - CATALOGO 3ZK
echo ============================================================
echo.
echo  [1] Validar catalogo antes do commit
echo  [2] Diagnosticar GitHub Desktop / Push / Pull
echo  [3] Ativar protecao automatica de commits
echo  [4] Sair
echo.
set /p OPCAO=Escolha uma opcao: 

if "%OPCAO%"=="1" call "%~dp0VALIDAR-CATALOGO.cmd"
if "%OPCAO%"=="2" call "%~dp0DIAGNOSTICO-GITHUB.cmd"
if "%OPCAO%"=="3" call "%~dp0CONFIGURAR-GIT-SEGURO.cmd"
if "%OPCAO%"=="4" exit /b 0
goto menu
