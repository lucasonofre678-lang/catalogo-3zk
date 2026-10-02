@echo off
setlocal
cd /d "%~dp0"

echo ================================================
echo  3ZK - FINALIZAR MERGE DO ESTOQUE
echo ================================================
echo.

if not exist ".git\MERGE_HEAD" (
  echo ERRO: nao existe merge em andamento nesta pasta.
  echo Abra este arquivo dentro de C:\3ZK\catalogo-3zk apos extrair o ZIP.
  pause
  exit /b 1
)

findstr /B /C:"<<<<<<<" /C:"=======" /C:">>>>>>>" dados\produtos.json dados\ultima-atualizacao.json >nul
if not errorlevel 1 (
  echo ERRO: ainda existem marcadores de conflito nos arquivos JSON.
  pause
  exit /b 1
)

python -m json.tool dados\produtos.json >nul
if errorlevel 1 (
  echo ERRO: dados\produtos.json nao e um JSON valido.
  pause
  exit /b 1
)

python -m json.tool dados\ultima-atualizacao.json >nul
if errorlevel 1 (
  echo ERRO: dados\ultima-atualizacao.json nao e um JSON valido.
  pause
  exit /b 1
)

python automacao\validar_catalogo.py --strict-public
if errorlevel 1 (
  echo ERRO: a validacao do catalogo falhou. Nenhum commit foi criado.
  pause
  exit /b 1
)

git add dados\produtos.json dados\ultima-atualizacao.json
git diff --cached --check
if errorlevel 1 (
  echo ERRO: o Git encontrou problema nos arquivos preparados.
  pause
  exit /b 1
)

git commit -m "Merge estoque automatico com reorganizacao Masterprint PLA Especial"
if errorlevel 1 (
  echo ERRO: o commit nao foi criado.
  pause
  exit /b 1
)

echo.
echo MERGE FINALIZADO COM SUCESSO.
echo Nenhum push foi realizado.
echo.
git status --short --branch
pause
