$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

function Find-Git {
    $command = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    $candidates = @(
        (Join-Path $env:ProgramFiles 'Git\cmd\git.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Git\cmd\git.exe')
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) }

    $desktopRoot = Join-Path $env:LOCALAPPDATA 'GitHubDesktop'
    if (Test-Path -LiteralPath $desktopRoot -PathType Container) {
        $bundled = Get-ChildItem -LiteralPath $desktopRoot -Directory -Filter 'app-*' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'resources\app\git\cmd\git.exe' } |
            Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
            Select-Object -First 1
        if ($bundled) { $candidates += $bundled }
    }
    return ($candidates | Select-Object -First 1)
}

$validator = Join-Path $PSScriptRoot 'validar_catalogo.ps1'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $validator
if ($LASTEXITCODE -ne 0) { throw 'A validacao falhou. A protecao nao foi configurada.' }

$git = Find-Git
if (-not $git) { throw 'Git nao foi encontrado. Abra o GitHub Desktop uma vez e tente novamente.' }

$inside = & $git -C $Root rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0 -or $inside.Trim() -ne 'true') { throw 'Esta pasta nao foi reconhecida como repositorio Git.' }

& $git -C $Root config core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel configurar o caminho dos hooks.' }

Write-Host ''
Write-Host 'PROTECAO ATIVADA.' -ForegroundColor Green
Write-Host 'O GitHub Desktop validara o catalogo antes de cada commit.'
Write-Host "Git utilizado: $git"
