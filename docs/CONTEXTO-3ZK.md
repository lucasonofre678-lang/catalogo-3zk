# Contexto do Site 3ZK

## Fonte oficial

A fonte oficial do projeto é a branch `main` do repositório:

`https://github.com/lucasonofre678-lang/catalogo-3zk`

Esta documentação foi criada a partir do estado confirmado da `main` no commit:

- commit: `94990d3c784c439c9900e42101b960a6e70b9f4f`
- commit curto: `94990d3`
- data do commit: `2026-08-07 15:33:06 -03:00`
- mensagem: `foto correta`

O ZIP usado para a análise continha esse mesmo commit, mas possuía exclusões locais não commitadas de arquivos em `.github/workflows` e `.githooks`. Essas exclusões não foram usadas como referência. A documentação considera a árvore limpa do commit oficial.

## O que o projeto é hoje

O repositório implementa um catálogo web público da 3ZK Filamentos. O site permite:

- exibir produtos e suas variações;
- mostrar fotos e representação visual das cores;
- pesquisar por marca, material, linha, observação e nome da variação;
- filtrar por material;
- ocultar automaticamente itens sem estoque;
- pausar manualmente produtos ou variações sem apagá-los;
- abrir links diretos para produto/cor;
- compartilhar uma cor;
- adicionar itens a um carrinho local;
- revisar um pedido em etapas;
- aplicar 5% de desconto para Pix ou dinheiro;
- gerar e enviar o pedido organizado pelo WhatsApp.

O projeto não usa framework JavaScript nem etapa de build de frontend. O site público é formado principalmente por HTML, CSS, JavaScript e arquivos JSON, com automações em Python e GitHub Actions.

## Blocos reais do sistema

### 1. Site público

Arquivos principais:

- `index.html`
- `style.css`
- `script.js`
- `assets/`

O navegador carrega o catálogo por JSON. Em produção, `script.js` lê `dados/produtos.json` e `dados/controle-catalogo.json`.

### 2. Dados do catálogo

A separação atual é intencional:

- `dados/produtos-base.json`: fonte manual versionada de cadastro, preços, fotos, chaves e dados estáveis;
- `dados/produtos.json`: versão pública com `idCatalogo`, `statusEstoque` e `disponivel`;
- `dados/controle-catalogo.json`: produtos e cores pausados manualmente;
- `dados/ultima-atualizacao.json`: metadados da última sincronização de estoque;
- `dados/produtos-preview.json`: preview local opcional, ignorado pelo Git.

### 3. Integração de estoque

A integração usa:

- `automacao/mapeamento-olist.json` para relacionar cada variação ao ID usado na Olist/Tiny;
- `automacao/atualizar_estoque.py` para consultar a API Tiny V2 e transformar quantidades em estados públicos;
- `.github/workflows/atualizar-estoque.yml` para executar a sincronização automática ou manual.

O número exato de unidades não é salvo no catálogo público. O código publica somente:

- `em_estoque`;
- `ultimas_unidades`;
- `sem_estoque`.

### 4. Painel local

O arquivo `ferramentas-local/painel-catalogo-3zk.html` é a interface administrativa local existente no projeto.

No modo de arquivo local, ele usa a File System Access API do navegador para selecionar a pasta do repositório e pode trabalhar com:

- produtos e variações;
- preços;
- fotos;
- pausas;
- novos cadastros;
- mapeamentos da Olist.

O painel possui verificações contra sobrescrita: antes de salvar, compara o estado em disco com o estado que estava carregado quando a edição começou.

### 5. Validação e proteção Git

Existem três níveis de proteção encontrados no código:

1. `automacao/validar_catalogo.py` valida integridade do catálogo;
2. `.githooks/pre-commit` executa validação antes de commits quando o hook está configurado;
3. `.github/workflows/validar-catalogo.yml` repete validações no GitHub.

## Regra de coordenação

Alterações devem respeitar a separação de responsabilidades existente. Exemplos:

- foto não deve alterar estoque;
- CSS não deve alterar IDs da Olist;
- sincronização de estoque não deve substituir uma versão mais recente do cadastro-base;
- uma pausa deve usar `controle-catalogo.json`, em vez de apagar o produto;
- documentação deve permanecer isolada em `docs/` quando não houver necessidade de alterar código.

Consulte também:

- `ARQUITETURA-3ZK.md`
- `REGRAS-ALTERACOES.md`
- `MAPA-ARQUIVOS.md`
- `ESTADO-ATUAL.md`
- `CHANGELOG-IA.md`
