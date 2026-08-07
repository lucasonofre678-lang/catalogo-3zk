@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================
echo RESOLUCAO SEGURA DO CONFLITO - CATALOGO 3ZK
echo ================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERRO: Git nao foi encontrado no PATH.
  echo Abra o GitHub Desktop e marque dados/produtos.json como resolvido manualmente.
  pause
  exit /b 1
)

echo Marcando SOMENTE os arquivos corrigidos como resolvidos...
git add dados/produtos.json dados/produtos-base.json automacao/mapeamento-olist.json
if errorlevel 1 (
  echo ERRO ao executar git add.
  pause
  exit /b 1
)

echo.
echo Status atual:
git status --short

echo.
echo IMPORTANTE:
echo - NAO marque exclusoes de .github/workflows ou .githooks para commit.
echo - Agora volte ao GitHub Desktop e clique em Continue merge.
echo - Depois do merge, rode VALIDAR-CATALOGO.cmd antes do Push.
echo.
pause
