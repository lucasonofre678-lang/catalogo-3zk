# Mapa de Arquivos do Site 3ZK

Este mapa descreve a função observada dos arquivos na `main` documentada. A existência de um arquivo não significa que ele seja carregado pelo site público.

## Raiz

| Caminho | Papel real encontrado | Runtime público? |
|---|---|---:|
| `index.html` | Estrutura da página pública, SEO, hero, filtros, catálogo, carrinho e formulário | Sim |
| `style.css` | Estilos atuais do site público, incluindo responsividade e estilos de destaque | Sim |
| `script.js` | Carregamento do catálogo, controle manual, busca, fotos, carrinho, pedido e WhatsApp | Sim |
| `destaques.css` | Arquivo de estilos de destaque presente no repositório, mas não referenciado por `index.html` | Não diretamente |
| `VALIDAR-CATALOGO.cmd` | Atalho Windows para validação | Não |
| `CENTRAL-3ZK-GITHUB.cmd` | Utilitário local relacionado ao fluxo Git/GitHub | Não |
| `CONFIGURAR-GIT-SEGURO.cmd` | Atalho para configurar proteção/hook Git | Não |
| `DIAGNOSTICO-GITHUB.cmd` | Atalho para diagnóstico Git/GitHub | Não |
| `FINALIZAR-CONFLITO.cmd` | Utilitário de resolução segura de conflito específico do catálogo | Não |
| `LEIA-ME-*.txt` | Instruções operacionais/histórico de alterações anteriores | Não |
| `.gitignore` | Ignora `_site`, caches Python, `ultima-atualizacao.json` e `produtos-preview.json` | Não |
| `.gitattributes` | Normalização automática de arquivos texto | Não |
| `workspace.code-workspace` | Arquivo VS Code atualmente sem pastas configuradas e com `settings` vazio | Não |

## `dados/`

| Arquivo | Função |
|---|---|
| `dados/produtos-base.json` | Fonte manual versionada de produtos, variações, preço, fotos, `chaveEstoque` e dados estáveis |
| `dados/produtos.json` | Catálogo público com IDs estáveis e estado de disponibilidade |
| `dados/controle-catalogo.json` | Lista de produtos e cores pausados manualmente |
| `dados/ultima-atualizacao.json` | Metadados da última sincronização de estoque; está no repositório analisado, mas também consta no `.gitignore` para alterações locais futuras |
| `dados/produtos-preview.json` | Preview local criado pelo painel; é ignorado pelo Git e não faz parte da árvore oficial do commit |

## `automacao/`

| Arquivo | Função |
|---|---|
| `automacao/atualizar_estoque.py` | Consulta estoque Tiny/Olist, converte quantidade em estado público e gera `produtos.json`/metadados |
| `automacao/gerar_catalogo_sem_consultar_olist.py` | Combina base atual com último estoque conhecido sem chamar API |
| `automacao/validar_catalogo.py` | Validador principal de integridade |
| `automacao/validar_catalogo.ps1` | Validação adaptada para ambiente PowerShell/Windows |
| `automacao/mapeamento-olist.json` | Relação entre 222 variações e IDs Olist no estado documentado |
| `automacao/configurar_git_seguro.ps1` | Valida e configura `core.hooksPath` para `.githooks` |
| `automacao/diagnostico_github.ps1` | Mostra branch, remote, divergência com upstream, alterações locais e executa validação |

## `.github/workflows/`

| Arquivo | Função |
|---|---|
| `.github/workflows/validar-catalogo.yml` | Validação automática de catálogo e sintaxe Python |
| `.github/workflows/publicar-site.yml` | Montagem de `_site` e deploy no GitHub Pages sem consultar estoque |
| `.github/workflows/atualizar-estoque.yml` | Sincronização agendada/manual de estoque e commit automático do estado público |

## `.githooks/`

| Arquivo | Função |
|---|---|
| `.githooks/pre-commit` | Executa validação antes do commit quando o hooksPath do repositório está configurado |

## `assets/`

### Arquivos institucionais

- `assets/logo-fundo-invisivel.png`
- `assets/logo-fundo-azul.png`
- `assets/favicon/**`
- `assets/social/catalogo-3zk.jpg`

### Fotos

As fotos ficam principalmente em `assets/fotos/<produto>/`.

Pastas encontradas na `main`:

- `assets/fotos/anycubic-petg/`
- `assets/fotos/closin-petg/`
- `assets/fotos/closin-pla/`
- `assets/fotos/creality-petg/`
- `assets/fotos/creality-soleyin-ultra-pla/`
- `assets/fotos/elegoo-pla/`
- `assets/fotos/flashforge-pla/`
- `assets/fotos/fusion-high-speed-petg/`
- `assets/fotos/fusion-high-speed-pla/`
- `assets/fotos/fusionx-petg/`
- `assets/fotos/masterprint-abs/`
- `assets/fotos/masterprint-petg/`
- `assets/fotos/masterprint-pla/`
- `assets/fotos/masterprint-pla-especial/`
- `assets/fotos/masterprint-pla-etiqueta-neutra/`
- `assets/fotos/masterprint-pla-fosforescente/`
- `assets/fotos/masterprint-pla-silk-especial/`
- `assets/fotos/masterprint-tpr/`
- `assets/fotos/masterprint-tpu/`
- `assets/fotos/multifila-pla/`
- `assets/fotos/rolo-etiqueta-termica/`

Também existem pastas de foto para combinações que não aparecem como produto ativo na base atual, como `creality-petg` e `fusion-high-speed-pla`. Não removê-las automaticamente: podem ser material histórico ou reservado.

No snapshot documentado, `assets/` possui 298 arquivos no total. Dentro de `assets/fotos/` existem 226 arquivos `.webp` e também arquivos `.txt` auxiliares. A validação deve ser usada para decidir se uma referência de imagem é obrigatória antes de qualquer limpeza.

## `ferramentas-local/`

| Arquivo | Função |
|---|---|
| `ferramentas-local/painel-catalogo-3zk.html` | Painel administrativo local completo |
| `ferramentas-local/painel_servidor.py` | Servidor HTTP local simples, com `/api/estado` e `/api/salvar` para controle de pausas |
| `ferramentas-local/ABRIR-PAINEL-3ZK.cmd` | Atalho para abrir o painel com servidor Python |
| `ferramentas-local/ABRIR-PAINEL-SEM-PYTHON.cmd` | Atalho para fluxo sem Python |
| `ferramentas-local/LEIA-ME-*.txt` | Documentação histórica/evolutiva do painel |
| `ferramentas-local/TESTES-PAINEL-*.txt` | Registros/instruções de testes anteriores |

### Observação sobre os modos do painel

O HTML do painel possui modo `arquivo` quando aberto por `file:` e modo `preview` nos demais protocolos. O modo arquivo usa File System Access API para escrita completa.

`painel_servidor.py` expõe uma API menor focada em leitura da base e gravação do `controle-catalogo.json`; ela não substitui toda a lógica de edição completa existente diretamente no HTML do painel.

## `backups-catalogo/`

Existe o snapshot histórico:

`backups-catalogo/2026-07-28/`

Com:

- `mapeamento-olist-backup.json`;
- `produtos-base-backup.json`.

Essa pasta é histórica. Não deve ser usada como fonte mais nova que a `main`.

## `leia-me/`

Contém documentação, relatórios e instruções acumuladas durante evoluções anteriores do projeto.

Exemplos encontrados:

- correções de catálogo;
- fluxo rápido;
- automação;
- carrinho;
- preços;
- fotos;
- Multifila;
- Olist;
- GitHub;
- relatórios JSON de validação/correção.

Esses arquivos são úteis como histórico, mas `docs/` deve ser o ponto de documentação consolidada a partir desta atualização. Quando houver divergência entre um `LEIA-ME` antigo e o código atual, prevalece o código da `main` atual.
