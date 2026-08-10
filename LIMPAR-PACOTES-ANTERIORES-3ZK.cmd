@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title 3ZK - Limpeza segura dos pacotes anteriores

echo ==============================================
echo  3ZK - LIMPEZA SEGURA DOS PACOTES ANTERIORES
echo ==============================================
echo.

if not exist "index.html" (
  echo ERRO: este arquivo precisa estar na raiz da pasta catalogo-3zk.
  echo Extraia este ZIP diretamente dentro de catalogo-3zk e tente novamente.
  echo.
  pause
  exit /b 1
)
if not exist "automacao" (
  echo ERRO: pasta automacao nao encontrada. Nenhum arquivo foi removido.
  pause
  exit /b 1
)
if not exist "dados" (
  echo ERRO: pasta dados nao encontrada. Nenhum arquivo foi removido.
  pause
  exit /b 1
)

echo Conferindo e removendo SOMENTE arquivos dos pacotes que eu gerei...
echo Arquivos com conteudo diferente serao preservados.
echo.

call :delete_if_hash "APLICAR-E-VALIDAR.py" "1fe4d5acb3facbe09d642fcf3c808a8790ed06b146fc7519d486771b338737fb"
call :delete_if_hash "APLICAR-OLIST-MULTIFILA-ABS-PRETO.cmd" "ee22c59accde6243554bd7d92360aee0e6b340e869e578cef7717b3049a34118"
call :delete_if_hash "PATCH-mapeamento-olist.patch" "40674a09bf60270bda7c1b202450c90196c4804f7042f3c830916143819e0b9d"
call :delete_if_hash "RELATORIO-DE-ENTREGA.txt" "680563a2369060abca4083a8cba244357ff28be645610efb57e4079b6a10e376"
call :delete_if_hash "SHA256SUMS.txt" "9a1cf34c8abc6c7755c0dbbfef55247411808b80cdd28a6af26631be82e1add4"
call :delete_if_hash "LEIA-ME.txt" "c5a693ee2cdf134c45ba06e418a45b4e03ff78d31686ca2bf537193ab4caba4e"
call :delete_if_hash ".3zk-olist-multifila-abs-preto\aplicar.py" "12b517f24528bebd1a8f5399257ebe640355ce7a3b9f91c260e0c9dfebd00058"
call :delete_if_hash "3ZK-EXTRAIR-DENTRO-DO-REPOSITORIO-OLIST-ABS-PRETO.zip" "9def6e92258b39d09f35901a2a1138664b024c148de4a417dc65b8cfb3e4cf7f"

if exist ".3zk-olist-multifila-abs-preto" (
  rmdir ".3zk-olist-multifila-abs-preto" 2>nul
  if not exist ".3zk-olist-multifila-abs-preto" (
    echo [REMOVIDA] pasta .3zk-olist-multifila-abs-preto
  ) else (
    echo [PRESERVADA] pasta .3zk-olist-multifila-abs-preto contem algo diferente.
  )
)

rem Se o ZIP de limpeza foi colocado dentro do repositorio, pode apagar pelo nome unico.
if exist "3ZK-LIMPAR-LIXO-PACOTES-ANTERIORES.zip" del /f /q "3ZK-LIMPAR-LIXO-PACOTES-ANTERIORES.zip" >nul 2>&1

echo.
echo ==============================================
echo  LIMPEZA CONCLUIDA
echo ==============================================
echo Nenhum arquivo de dados, estoque, fotos, CSS, JS ou painel foi alterado.
echo Este limpador vai se apagar depois que voce fechar esta janela.
echo.
pause

rem Auto-remocao do proprio limpador.
del /f /q "%~f0" >nul 2>&1
exit /b 0

:delete_if_hash
set "TARGET=%~1"
set "EXPECTED=%~2"
if not exist "!TARGET!" goto :eof
set "ACTUAL="
for /f "usebackq delims=" %%H in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-FileHash -LiteralPath $env:TARGET -Algorithm SHA256).Hash.ToLowerInvariant()"`) do set "ACTUAL=%%H"
if /I "!ACTUAL!"=="!EXPECTED!" (
  del /f /q "!TARGET!" >nul 2>&1
  if not exist "!TARGET!" (
    echo [REMOVIDO] !TARGET!
  ) else (
    echo [FALHA] nao foi possivel remover !TARGET!
  )
) else (
  echo [PRESERVADO] !TARGET! - conteudo diferente do pacote original.
)
goto :eof
