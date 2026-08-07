# Arquitetura do Site 3ZK

## Visão geral

A arquitetura atual é um site estático com dados JSON e automações externas ao runtime do navegador.

```text
                    EDIÇÃO / CADASTRO LOCAL
                              |
                              v
              dados/produtos-base.json
              dados/controle-catalogo.json
              automacao/mapeamento-olist.json
              assets/fotos/**
                              |
                              | commit / push
                              v
                     GitHub branch main
                       /              \
                      /                \
                     v                  v
       Publicar catálogo rápido   Sincronizar estoque Olist
           GitHub Action             GitHub Action
                     |                  |
                     |                  v
                     |        API Tiny/Olist + mapeamento
                     |                  |
                     |                  v
                     |        dados/produtos.json
                     |        dados/ultima-atualizacao.json
                     |                  |
                     +--------+---------+
                              |
                              v
                     GitHub Pages / _site
                              |
                              v
                         Navegador
                              |
                index.html + style.css + script.js
                              |
               +--------------+---------------+
               |                              |
               v                              v
     dados/produtos.json          dados/controle-catalogo.json
               |                              |
               +--------------+---------------+
                              v
                   catálogo efetivamente visível
                              |
                              v
                 carrinho local -> WhatsApp
```

## 1. Runtime público

### Entrada

`index.html` é a página principal. Ele referencia:

- `style.css`;
- `script.js`;
- fontes Google (`Poppins` e `Roboto Mono`);
- favicons em `assets/favicon/`;
- imagem social em `assets/social/catalogo-3zk.jpg`.

O arquivo `destaques.css` existe no repositório, mas não é referenciado por `index.html`. As regras de destaque atualmente usadas pelo site também existem em `style.css`.

### Carregamento de dados

`script.js` executa `carregarProdutos()` ao final do arquivo.

Em produção:

1. busca `dados/produtos.json` com `cache: "no-store"`;
2. busca `dados/controle-catalogo.json`;
3. valida se o catálogo público é uma lista e se cada produto possui `cores`;
4. aplica pausas manuais;
5. elimina cores sem disponibilidade;
6. elimina produtos que ficaram sem nenhuma cor visível;
7. reconcilia o carrinho salvo;
8. renderiza catálogo e carrinho.

Em `localhost` ou `127.0.0.1`, tenta primeiro `dados/produtos-preview.json`. Se o preview não existir ou falhar, usa `dados/produtos.json`.

### Regra de visibilidade

Uma variação não aparece quando:

- pertence a um produto listado em `produtosPausados`; ou
- está listada em `coresPausadas`; ou
- possui `disponivel === false`; ou
- possui `statusEstoque === "sem_estoque"`.

O controle manual tem prioridade sobre a disponibilidade de estoque.

### Busca e filtros

A busca considera:

- marca;
- material;
- linha;
- observação;
- nomes das cores/variações.

O HTML oferece filtros para:

- Todos;
- PLA;
- PETG;
- ABS;
- ASA;
- TPU;
- TPR;
- Outras.

### Links diretos e compartilhamento

O JavaScript possui suporte a parâmetros de URL para selecionar um produto e uma cor específicos. Também usa, quando disponível:

- `navigator.share` em dispositivos compatíveis;
- Clipboard API em contexto seguro;
- `window.prompt` como fallback.

### Fotos

Para cada cor, `script.js` usa, nesta ordem:

1. array `imagens`, se existir;
2. campo legado `imagem`, se existir;
3. caminho automático baseado no slug do produto e da cor.

O catálogo suporta múltiplas fotos por variação, navegação entre imagens e lightbox.

## 2. Carrinho e fechamento de pedido

O carrinho funciona totalmente no navegador.

### Persistência

O projeto usa `localStorage` para manter:

- carrinho;
- código do pedido;
- dados preenchidos no formulário.

Não há backend de pedidos no repositório analisado.

### Fluxo

O painel do carrinho possui três etapas:

1. itens;
2. dados e condições;
3. revisão.

O pedido gera um código aleatório de 8 caracteres usando `window.crypto.getRandomValues` quando disponível, com fallback para `Math.random`.

### Pagamento

As opções implementadas incluem:

- Pix: 5% de desconto;
- dinheiro: 5% de desconto;
- combinar no WhatsApp.

### Entrega

O formulário distingue retirada e consulta de entrega. O valor final continua sujeito a confirmação conforme o texto gerado pelo próprio site.

### Saída

O pedido é convertido em texto e aberto em:

`https://wa.me/554184539430`

O número está definido na constante `WHATSAPP_NUMERO` de `script.js`.

## 3. Modelo de dados

### `dados/produtos-base.json`

É a fonte manual versionada utilizada pelas automações de montagem.

Campos de produto encontrados:

- `marca`;
- `material`;
- `linha`;
- `preco`;
- `linkLoja`;
- `obs`;
- `tipoProduto`;
- `rotuloVariacaoSingular`;
- `rotuloVariacaoPlural`;
- `cores`.

Campos de variação encontrados:

- `nome`;
- `chaveEstoque`;
- `sku`;
- `gtin`;
- `hex`;
- `gradiente`;
- `efeito`;
- `imagens`;
- `fotoStatus`;
- `hexFonte`;
- `preco`;
- `statusEstoqueInicial`;
- `disponivelInicial`.

### `dados/produtos.json`

É o catálogo público versionado e gerado a partir da base + último estoque conhecido ou sincronização real.

Em relação à base, usa:

- `idCatalogo` no produto;
- `idCatalogo` na variação;
- `statusEstoque`;
- `disponivel`.

`chaveEstoque`, `statusEstoqueInicial` e `disponivelInicial` não são mantidos como campos internos no JSON público pelo gerador.

### `dados/controle-catalogo.json`

Estrutura atual:

- `versao`;
- `atualizadoEm`;
- `produtosPausados`;
- `coresPausadas`.

O objetivo é ocultar itens sem apagá-los nem alterar seus IDs.

### `automacao/mapeamento-olist.json`

Estrutura atual:

- `versao`;
- `descricao`;
- `total`;
- `itens`.

Cada item contém a chave estável da variação, ID Olist e metadados auxiliares como SKU/GTIN/descrição.

## 4. Sincronização de estoque

### Script

`automacao/atualizar_estoque.py` consulta:

`https://api.tiny.com.br/api2/produto.obter.estoque.php`

O token é recebido pela variável de ambiente `OLIST_API_TOKEN`.

### Depósitos

Por padrão, o script soma somente:

- `Geral`;
- `Loja presencial`.

A lista pode ser configurada por `OLIST_DEPOSITOS_INCLUIDOS`.

### Conversão de quantidade para estado público

A regra encontrada é:

- quantidade `<= 0`: `sem_estoque`, indisponível;
- quantidade de `1` a `3`: `ultimas_unidades`, disponível;
- quantidade `> 3`: `em_estoque`, disponível.

A quantidade exata permanece apenas em memória durante a sincronização.

### Proteções

O script possui proteções para:

- retentativas em erros temporários;
- detecção de rate limit;
- reaproveitamento do último status válido;
- limite máximo de chamadas por execução;
- rotação do ponto inicial da próxima consulta;
- não consultar produtos pausados;
- impedir publicação com zero cores;
- impedir publicação com zero cores disponíveis;
- bloquear queda superior a 75% da disponibilidade quando não autorizada explicitamente.

## 5. GitHub Actions

### `validar-catalogo.yml`

Executa em pushes/PRs que afetem código, dados, automações, assets ou workflows. Roda:

- `python automacao/validar_catalogo.py`;
- compilação sintática dos scripts Python.

### `publicar-site.yml`

Publica no GitHub Pages sem consultar a API de estoque.

O workflow:

1. valida o catálogo;
2. cria `_site`;
3. copia HTML, JS, CSS e assets;
4. copia o controle manual;
5. chama `gerar_catalogo_sem_consultar_olist.py`;
6. envia o resultado ao GitHub Pages.

Isso permite publicar fotos, textos, preços ou cadastro sem iniciar uma consulta pesada de estoque.

### `atualizar-estoque.yml`

Executa manualmente ou por agenda às 08:00, 15:00 e 18:00 no horário de Brasília, conforme os comentários e cron do workflow.

Depois da consulta, o workflow guarda temporariamente o estoque obtido, executa `git fetch origin main` e `git reset --hard origin/main`, e então reaplica somente o status de estoque sobre a base mais recente. Essa etapa existe para preservar alterações de cadastro que possam ter sido enviadas enquanto a consulta estava em andamento.

Se houver mudança, commita somente:

- `dados/produtos.json`;
- `dados/ultima-atualizacao.json`.

## 6. Painel local

### Modo arquivo

Quando aberto com protocolo `file:`, o painel pode usar `window.showDirectoryPicker({ mode: "readwrite" })`.

O navegador precisa suportar File System Access API; a interface recomenda Chrome ou Edge.

### Escritas realizadas pelo painel atual

Dependendo da operação, o painel pode gravar:

- `dados/produtos-base.json`;
- `dados/produtos-preview.json`;
- `dados/controle-catalogo.json`;
- `automacao/mapeamento-olist.json`;
- novos arquivos dentro de `assets/fotos/`.

O código atual deixa `dados/produtos.json` pertencendo à automação e usa `produtos-preview.json` para teste local imediato das alterações manuais.

### Proteção contra conflito

Antes de salvar, o painel compara assinaturas dos arquivos em disco com as cópias carregadas anteriormente. Se `produtos-base.json`, `mapeamento-olist.json` ou o controle de pausas mudaram durante a edição, o salvamento é interrompido e o operador é orientado a atualizar/recarregar.

## 7. Validação local

`automacao/validar_catalogo.py` verifica, entre outros pontos:

- JSON inválido;
- marcadores de conflito Git;
- `chaveEstoque` ausente ou duplicada;
- IDs de produto incompatíveis;
- IDs Olist ausentes, inválidos ou duplicados;
- diferenças indevidas entre base, público e mapeamento;
- estados de estoque inválidos;
- IDs públicos duplicados;
- fotos marcadas como `confirmada` que não existem;
- campo `total` incorreto no mapeamento.

Referências de fotos ausentes que não estão marcadas como `confirmada` geram aviso, não erro.
