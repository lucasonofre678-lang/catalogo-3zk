param(
    [switch]$StrictPublic
)

$ErrorActionPreference = 'Stop'
try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
} catch {}

$Root = Split-Path -Parent $PSScriptRoot
$ValidStock = @('em_estoque', 'ultimas_unidades', 'sem_estoque')
$Errors = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]

function Add-Error([string]$Message) { $script:Errors.Add($Message) }
function Add-Warning([string]$Message) { $script:Warnings.Add($Message) }

function Relative-Path([string]$Path) {
    try {
        $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
        $pathFull = [IO.Path]::GetFullPath($Path)
        if ($pathFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
            return $pathFull.Substring($rootFull.Length).Replace('\', '/')
        }
    } catch {}
    return $Path
}

function Read-Json([string]$RelativePath) {
    $path = Join-Path $Root $RelativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Add-Error "Arquivo ausente: $RelativePath"
        return $null
    }
    try {
        $raw = Get-Content -LiteralPath $path -Raw -Encoding UTF8
        return ($raw | ConvertFrom-Json)
    } catch {
        Add-Error ("JSON invalido em {0}: {1}" -f $RelativePath, $_.Exception.Message)
        return $null
    }
}

function Product-Id-From-Key([string]$Key) {
    $parts = $Key -split '\|'
    if ($parts.Count -lt 4) { throw "chaveEstoque invalida: '$Key'" }
    return ($parts[0..2] -join '|')
}

function Increment-Count($Dictionary, [string]$Key) {
    if ($Dictionary.ContainsKey($Key)) { $Dictionary[$Key]++ } else { $Dictionary[$Key] = 1 }
}

function Scan-Conflict-Markers {
    $extensions = @('.json', '.py', '.ps1', '.js', '.html', '.yml', '.yaml', '.cmd', '.css')
    Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
        $full = $_.FullName
        $relative = Relative-Path $full
        if ($relative -match '(^|/)(\.git|_site|__pycache__|backups-catalogo)(/|$)') { return }
        if ($extensions -notcontains $_.Extension.ToLowerInvariant()) { return }
        try {
            $lineNumber = 0
            Get-Content -LiteralPath $full -Encoding UTF8 | ForEach-Object {
                $lineNumber++
                if ($_ -match '^\s*(<<<<<<<|>>>>>>>)') {
                    Add-Error "Marca de conflito do Git em ${relative}:$lineNumber"
                }
            }
        } catch {}
    }
}

Scan-Conflict-Markers
$base = Read-Json 'dados/produtos-base.json'
$public = Read-Json 'dados/produtos.json'
$mapping = Read-Json 'automacao/mapeamento-olist.json'
$control = Read-Json 'dados/controle-catalogo.json'

if ($Errors.Count -gt 0) {
    foreach ($warning in $Warnings) { Write-Host "[AVISO] $warning" -ForegroundColor Yellow }
    foreach ($errorMessage in $Errors) { Write-Host "[ERRO] $errorMessage" -ForegroundColor Red }
    Write-Host "`nVALIDACAO REPROVADA: $($Errors.Count) erro(s)." -ForegroundColor Red
    exit 1
}

if ($base -isnot [System.Array]) { Add-Error 'dados/produtos-base.json precisa conter uma lista.' }
if ($public -isnot [System.Array]) { Add-Error 'dados/produtos.json precisa conter uma lista.' }
if ($null -eq $mapping -or $null -eq $mapping.itens) { Add-Error "automacao/mapeamento-olist.json precisa conter a lista 'itens'." }

$pausedProducts = @{}
$pausedColors = @{}
if ($null -ne $control) {
    foreach ($item in @($control.produtosPausados)) { if (-not [string]::IsNullOrWhiteSpace([string]$item)) { $pausedProducts[[string]$item] = $true } }
    foreach ($item in @($control.coresPausadas)) { if (-not [string]::IsNullOrWhiteSpace([string]$item)) { $pausedColors[[string]$item] = $true } }
}

$baseKeyCounts = @{}
$baseProductCounts = @{}
$baseKeys = New-Object System.Collections.Generic.List[string]
$confirmedMissing = New-Object System.Collections.Generic.List[string]
$expectedMissing = New-Object System.Collections.Generic.List[string]
$productKeysByProduct = New-Object System.Collections.Generic.List[object]

$productIndex = 0
foreach ($product in @($base)) {
    $productIndex++
    if ($null -eq $product) { Add-Error "Produto #$productIndex da base e invalido."; continue }
    $labelParts = @([string]$product.marca, [string]$product.material, [string]$product.linha) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    $label = ($labelParts -join ' ').Trim()
    if ([string]::IsNullOrWhiteSpace($label)) { $label = "produto #$productIndex" }

    $colors = @($product.cores)
    if ($colors.Count -eq 0) { Add-Error "Produto sem variacoes: $label"; continue }
    $price = 0.0
    if (-not [double]::TryParse([string]$product.preco, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$price) -or $price -le 0) {
        Add-Error "Preco principal invalido: $label"
    }

    $idsInProduct = @{}
    $keysInProduct = New-Object System.Collections.Generic.List[string]
    $colorIndex = 0
    foreach ($color in $colors) {
        $colorIndex++
        $name = [string]$color.nome
        if ([string]::IsNullOrWhiteSpace($name)) { $name = "posicao $colorIndex" }
        $key = ([string]$color.chaveEstoque).Trim()
        if ([string]::IsNullOrWhiteSpace($key)) { Add-Error "Cor sem chaveEstoque: $label - $name"; continue }
        try {
            $productId = Product-Id-From-Key $key
            $idsInProduct[$productId] = $true
        } catch {
            Add-Error ("{0} - {1}: {2}" -f $label, $name, $_.Exception.Message)
            continue
        }
        $baseKeys.Add($key)
        $keysInProduct.Add($key)
        Increment-Count $baseKeyCounts $key

        if ($null -ne $color.statusEstoqueInicial -and $ValidStock -notcontains [string]$color.statusEstoqueInicial) {
            Add-Error ("statusEstoqueInicial invalido em {0} - {1}: {2}" -f $label, $name, $color.statusEstoqueInicial)
        }
        if (($color.PSObject.Properties.Name -contains 'disponivelInicial') -and $color.disponivelInicial -isnot [bool]) {
            Add-Error "disponivelInicial precisa ser booleano em $label - $name."
        }

        foreach ($image in @($color.imagens)) {
            if ([string]::IsNullOrWhiteSpace([string]$image)) { continue }
            $imageRelative = ([string]$image).Replace('/', '\')
            $imagePath = Join-Path $Root $imageRelative
            if (Test-Path -LiteralPath $imagePath -PathType Leaf) { continue }
            $message = ("{0} - {1}: {2}" -f $label, $name, $image)
            if ([string]$color.fotoStatus -eq 'confirmada') { $confirmedMissing.Add($message) } else { $expectedMissing.Add($message) }
        }
    }

    if ($idsInProduct.Count -ne 1) {
        Add-Error "Produto reune chaves incompativeis: $label"
    } else {
        $productId = [string]($idsInProduct.Keys | Select-Object -First 1)
        Increment-Count $baseProductCounts $productId
    }
    $productKeysByProduct.Add([pscustomobject]@{ Keys = @($keysInProduct); ProductIds = @($idsInProduct.Keys) })
}

foreach ($entry in $baseKeyCounts.GetEnumerator()) { if ($entry.Value -gt 1) { Add-Error "chaveEstoque duplicada: $($entry.Key)" } }
foreach ($entry in $baseProductCounts.GetEnumerator()) { if ($entry.Value -gt 1) { Add-Error "ID de produto duplicado: $($entry.Key)" } }

$mappingKeyCounts = @{}
$mappingIdCounts = @{}
$mappingKeys = New-Object System.Collections.Generic.List[string]
$mappingIndex = 0
foreach ($item in @($mapping.itens)) {
    $mappingIndex++
    $key = ([string]$item.chave).Trim()
    $olistId = 0L
    if ([string]::IsNullOrWhiteSpace($key)) { Add-Error "Mapeamento #$mappingIndex sem chave." }
    if (-not [long]::TryParse([string]$item.olistId, [ref]$olistId) -or $olistId -le 0) { Add-Error "ID Olist invalido no mapeamento #$mappingIndex." }
    if (-not [string]::IsNullOrWhiteSpace($key)) { $mappingKeys.Add($key); Increment-Count $mappingKeyCounts $key }
    if ($olistId -gt 0) { Increment-Count $mappingIdCounts ([string]$olistId) }
}
foreach ($entry in $mappingKeyCounts.GetEnumerator()) { if ($entry.Value -gt 1) { Add-Error "chave do mapeamento duplicada: $($entry.Key)" } }
foreach ($entry in $mappingIdCounts.GetEnumerator()) { if ($entry.Value -gt 1) { Add-Error "ID Olist duplicado: $($entry.Key)" } }

$allowedMissing = @{}
foreach ($key in $pausedColors.Keys) { $allowedMissing[$key] = $true }
foreach ($row in $productKeysByProduct) {
    if ($row.ProductIds.Count -eq 1 -and $pausedProducts.ContainsKey([string]$row.ProductIds[0])) {
        foreach ($key in $row.Keys) { $allowedMissing[[string]$key] = $true }
    }
}
$mappingSet = @{}; foreach ($key in $mappingKeys) { $mappingSet[$key] = $true }
$baseSet = @{}; foreach ($key in $baseKeys) { $baseSet[$key] = $true }
$missingMapping = @($baseSet.Keys | Where-Object { -not $mappingSet.ContainsKey($_) -and -not $allowedMissing.ContainsKey($_) } | Sort-Object)
$extraMapping = @($mappingSet.Keys | Where-Object { -not $baseSet.ContainsKey($_) } | Sort-Object)
if ($missingMapping.Count -gt 0) { Add-Error "Cores ativas sem mapeamento Olist: $((@($missingMapping | Select-Object -First 8)) -join ', ')" }
if ($extraMapping.Count -gt 0) { Add-Error "Mapeamentos sem cor na base: $((@($extraMapping | Select-Object -First 8)) -join ', ')" }

$publicKeyCounts = @{}
$publicProductCounts = @{}
$publicKeys = New-Object System.Collections.Generic.List[string]
foreach ($product in @($public)) {
    $productId = ([string]$product.idCatalogo).Trim()
    if (-not [string]::IsNullOrWhiteSpace($productId)) { Increment-Count $publicProductCounts $productId }
    foreach ($color in @($product.cores)) {
        $id = ([string]$color.idCatalogo).Trim()
        if ([string]::IsNullOrWhiteSpace($id)) {
            Add-Error "Cor publica sem idCatalogo: $($product.marca) $($product.material) - $($color.nome)"
            continue
        }
        $publicKeys.Add($id); Increment-Count $publicKeyCounts $id
        if ($ValidStock -notcontains [string]$color.statusEstoque) { Add-Error "statusEstoque invalido em ${id}: $($color.statusEstoque)" }
        if ($color.disponivel -isnot [bool]) { Add-Error "disponivel precisa ser booleano em $id." }
    }
}
foreach ($entry in $publicKeyCounts.GetEnumerator()) { if ($entry.Value -gt 1) { Add-Error "idCatalogo de cor duplicado: $($entry.Key)" } }
foreach ($entry in $publicProductCounts.GetEnumerator()) { if ($entry.Value -gt 1) { Add-Error "idCatalogo de produto duplicado: $($entry.Key)" } }

$publicSet = @{}; foreach ($key in $publicKeys) { $publicSet[$key] = $true }
$missingPublic = @($baseSet.Keys | Where-Object { -not $publicSet.ContainsKey($_) } | Sort-Object)
$extraPublic = @($publicSet.Keys | Where-Object { -not $baseSet.ContainsKey($_) } | Sort-Object)
if ($missingPublic.Count -gt 0) {
    if ($StrictPublic) { Add-Error "produtos.json esta desatualizado e nao contem: $((@($missingPublic | Select-Object -First 8)) -join ', ')" }
    else { Add-Warning "produtos.json ainda nao contem $($missingPublic.Count) variacao(oes) da base; a publicacao rapida ira monta-las sem consultar a Olist." }
}
if ($extraPublic.Count -gt 0) { Add-Error "produtos.json contem variacoes ausentes da base: $((@($extraPublic | Select-Object -First 8)) -join ', ')" }

if ($confirmedMissing.Count -gt 0) { Add-Error "$($confirmedMissing.Count) foto(s) marcada(s) como confirmada(s) nao existem. Primeiros casos: $((@($confirmedMissing | Select-Object -First 5)) -join ' | ')" }
if ($expectedMissing.Count -gt 0) { Add-Warning "$($expectedMissing.Count) referencia(s) sem arquivo permanecem cadastradas como foto ausente." }

if ([int]$mapping.total -ne @($mapping.itens).Count) { Add-Error "Campo total do mapeamento incorreto: $($mapping.total); esperado $(@($mapping.itens).Count)." }
Add-Warning "Resumo: $(@($base).Count) produtos, $($baseKeys.Count) variacoes, $($mappingKeys.Count) vinculos Olist."

foreach ($warning in $Warnings) { Write-Host "[AVISO] $warning" -ForegroundColor Yellow }
foreach ($errorMessage in $Errors) { Write-Host "[ERRO] $errorMessage" -ForegroundColor Red }

if ($Errors.Count -gt 0) {
    Write-Host "`nVALIDACAO REPROVADA: $($Errors.Count) erro(s)." -ForegroundColor Red
    exit 1
}
Write-Host "`nVALIDACAO APROVADA: catalogo consistente e JSONs validos." -ForegroundColor Green
exit 0
