$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

function Find-Git {
    $command = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $paths = @()
    if ($env:ProgramFiles) { $paths += (Join-Path $env:ProgramFiles 'Git\cmd\git.exe') }
    if (${env:ProgramFiles(x86)}) { $paths += (Join-Path ${env:ProgramFiles(x86)} 'Git\cmd\git.exe') }
    $desktopRoot = Join-Path $env:LOCALAPPDATA 'GitHubDesktop'
    if (Test-Path -LiteralPath $desktopRoot -PathType Container) {
        $paths += Get-ChildItem -LiteralPath $desktopRoot -Directory -Filter 'app-*' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'resources\app\git\cmd\git.exe' }
    }
    return ($paths | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1)
}

$git = Find-Git
if (-not $git) { throw 'Git nao foi encontrado.' }

Write-Host '============================================================'
Write-Host ' DIAGNOSTICO GIT / GITHUB - CATALOGO 3ZK'
Write-Host '============================================================'
Write-Host "Pasta: $Root"
Write-Host "Git:   $git"
Write-Host ''

$branch = (& $git -C $Root branch --show-current).Trim()
Write-Host "Branch atual: $branch"
Write-Host 'Ultimo commit local:'
& $git -C $Root log -1 --oneline
Write-Host ''
Write-Host 'Remote configurado:'
& $git -C $Root remote -v
Write-Host ''

$upstream = (& $git -C $Root rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>$null)
if ($LASTEXITCODE -eq 0 -and $upstream) {
    $counts = (& $git -C $Root rev-list --left-right --count 'HEAD...@{upstream}').Trim() -split '\s+'
    $ahead = [int]$counts[0]
    $behind = [int]$counts[1]
    Write-Host "Comparacao com $upstream : $ahead commit(s) para enviar; $behind commit(s) para baixar."
    if ($ahead -gt 0) { Write-Host 'ATENCAO: existe commit local que ainda precisa de Push origin.' -ForegroundColor Yellow }
    if ($behind -gt 0) { Write-Host 'ATENCAO: o repositorio remoto tem alteracoes que ainda precisam de Pull.' -ForegroundColor Yellow }
} else {
    Write-Host 'ATENCAO: esta branch ainda nao possui upstream configurado.' -ForegroundColor Yellow
}

Write-Host ''
$status = @(& $git -C $Root status --short)
if ($status.Count -eq 0) {
    Write-Host 'Arquivos locais: nenhuma alteracao pendente.' -ForegroundColor Green
} else {
    Write-Host "Arquivos locais pendentes: $($status.Count)" -ForegroundColor Yellow
    $status | Select-Object -First 40 | ForEach-Object { Write-Host "  $_" }
    if ($status.Count -gt 40) { Write-Host '  ...' }
}

Write-Host ''
Write-Host 'Executando validacao do catalogo...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'validar_catalogo.ps1')
exit $LASTEXITCODE
