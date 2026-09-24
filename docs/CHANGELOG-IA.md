# Changelog de Alterações por IA

Este arquivo registra alterações executadas ou preparadas por IA no projeto a partir da criação da documentação central.

Não foi feita reconstrução retroativa dos 99 commits anteriores. O histórico Git continua sendo a fonte para mudanças anteriores a esta documentação.

## Formato recomendado

Para cada atualização:

```text
## AAAA-MM-DD — título curto

Base:
- branch:
- commit inicial:

Escopo:
- objetivo da alteração

Arquivos adicionados:
- ...

Arquivos modificados:
- ...

Arquivos removidos:
- nenhum / lista explícita

Validações:
- ...

Observações e riscos:
- ...
```

---

## 2026-08-07 — criação da documentação central

Base:

- branch: `main`
- commit inicial: `94990d3c784c439c9900e42101b960a6e70b9f4f`
- mensagem do commit-base: `foto correta`

Escopo:

- analisar a arquitetura real da versão oficial;
- criar documentação consolidada em `docs/`;
- não alterar nenhuma função, dado, foto, mapeamento, workflow ou configuração do site.

Arquivos adicionados:

- `docs/CONTEXTO-3ZK.md`
- `docs/ARQUITETURA-3ZK.md`
- `docs/REGRAS-ALTERACOES.md`
- `docs/MAPA-ARQUIVOS.md`
- `docs/ESTADO-ATUAL.md`
- `docs/CHANGELOG-IA.md`

Arquivos modificados:

- nenhum arquivo preexistente.

Arquivos removidos:

- nenhum.

Validações executadas sobre a baseline antes da documentação:

- `python automacao/validar_catalogo.py` — aprovado;
- `node --check script.js` — aprovado;
- `python -m py_compile automacao/*.py ferramentas-local/painel_servidor.py` — aprovado.

Aviso já existente na baseline:

- 50 referências de foto sem arquivo permanecem cadastradas como foto ausente/não confirmada.

Validação de segurança desta atualização:

- o diff deve conter somente arquivos novos em `docs/`;
- nenhuma alteração de runtime deve aparecer no diff;
- os workflows atuais não têm `docs/**` como gatilho de publicação do site.

## 2026-09-24 — Visual V4 integrado ao site oficial + SEO

Base:
- branch: `main`
- commit inicial: `5a06f1c`

Escopo:
- reproduzir no site oficial o visual/UX da versão V4-08 (pasta temporária `novo-visual/`, removida ao final);
- manter dados, preços, estoque, pausas, IDs, Olist, carrinho (`3zk-carrinho-v1`), etapas do pedido e mensagem do WhatsApp do site oficial;
- SEO: title/description/canonical/OG/Twitter, Organization, páginas estáticas de produto e categoria, Product/Offer/BreadcrumbList, sitemap gerado na publicação.

Arquivos adicionados:
- `automacao/gerar_paginas_seo.py`
- `seo-produto.js`

Arquivos modificados:
- `index.html`, `style.css`, `script.js` (reescritos no padrão V4, com as regras oficiais preservadas)
- `produto.html`, `produto.js` (agora só redirecionam links antigos para a ficha do catálogo)
- `.github/workflows/publicar-site.yml` (gera páginas SEO/sitemap, publica `robots.txt`, smoke test atualizado)
- `.github/workflows/validar-catalogo.yml` (gatilho para `seo-produto.js`)
- `docs/ARQUITETURA-3ZK.md`, `docs/MAPA-ARQUIVOS.md`, `docs/ESTADO-ATUAL.md`

Arquivos removidos:
- `destaques.css` (não era referenciado)
- `sitemap.xml` da raiz (agora gerado na publicação, com todas as URLs reais)

Dados:
- `dados/produtos-base.json`, `dados/produtos.json`, `dados/controle-catalogo.json` e `automacao/mapeamento-olist.json` sem nenhuma alteração (hash idêntico).

Validações:
- `python automacao/validar_catalogo.py`, `node --check` dos scripts, `py_compile` das automações;
- montagem local idêntica ao workflow (sanitização, versão, sitemap);
- testes no Chrome: busca, filtros, cards, drawer, zoom, pedido, WhatsApp, links diretos, 1366/430/390/360 px, SEO.

## 2026-09-24 — Cores por família, Pix/3x nos cards e código curto do pedido

Base:
- branch: `main`
- commit inicial: `5a06f1c` (sobre as alterações do Visual V4 ainda não commitadas)

Escopo:
- ordem de exibição das cores por família (branco/natural → amarelo → laranja → vermelho → rosa → roxo → azul → verde → marrom → cinza → preto → translúcidos → multicolor → outros), dentro da família por nome; acessórios mantêm a ordem cadastrada;
- a cor mostrada por padrão no card/drawer continua sendo a primeira do cadastro;
- cards com preço normal, preço no Pix (5% OFF) e 3x sem juros calculados do preço real da variação;
- benefícios: "5% no Pix" em destaque verde e novo item "3x sem juros";
- pedido: código visível curto `AAA-0` (sem I/O) no resumo e no WhatsApp ("Pedido 3ZK KZT-7"); o id interno `3ZK-XXXX-XXXX` continua salvo em `3zk-codigo-pedido-v1` (pedidos antigos são migrados sem perder o id).

Arquivos modificados:
- `script.js` (`getColorFamily`, `sortVariantsByColorFamily`, `cardPriceBlock`, `obterIdentificacaoPedido`)
- `automacao/gerar_paginas_seo.py` (mesma ordenação e mesmo bloco de preço nos cards/páginas estáticas)
- `seo-produto.js` (miniaturas dos cards estáticos atualizam Pix e 3x)
- `index.html`, `style.css`

Dados:
- nenhum arquivo em `dados/` nem `mapeamento-olist.json` alterado; nomes, preços, estoque, fotos e IDs das variações intactos.

Validações:
- ordem JS e Python idênticas para os 30 produtos de filamento; nenhuma variação perdida;
- preços: R$ 105,00 → R$ 99,75 no Pix / 3x R$ 35,00; R$ 89,90 → R$ 85,40 / 3x R$ 29,97;
- 2000 códigos gerados no formato `AAA-0`; código estável enquanto o carrinho tem itens;
- Chrome headless em 1400, 768, 390 e 360 px.

Observações e riscos:
- a regra de família é por palavras do nome; cores novas com nomes incomuns caem em "Outros" até entrarem na lista `FAMILIAS_ORDEM_COR` (manter JS e Python iguais).


## 2026-09-24 — Painel Local 2.0 (central de manutenção)

Base:
- branch: `main`
- commit inicial: `5a06f1c` (sobre as alterações do Visual V4 ainda não commitadas)

Escopo:
- transformar `ferramentas-local` numa central por tarefas, preservando cadastro, pausas, preços e fotos do painel 4.0 e o mesmo salvamento validado;
- visão geral, busca universal (Ctrl+K), produtos com ações rápidas, editor por abas, nova/duplicar variação, duplicar produto, edição em massa com prévia, estoque/Olist (somente leitura), imagens, SEO, publicação, histórico com desfazer e central de problemas;
- cadastro guiado: tipo filamento/acessório, peso, diâmetro, categoria, status Rascunho/Pausado/Ativo, família e preço herdado/específico por cor, Olist opcional em rascunho, prévia de card e drawer;
- preço base avisa quando variações têm o preço antigo gravado (ex.: 26 cores do Multifila PLA Matte) e permite que passem a herdar.

Arquivos adicionados:
- `ferramentas-local/painel-2.js`
- `ferramentas-local/painel-2.css`

Arquivos modificados:
- `ferramentas-local/painel-catalogo-3zk.html` (cadastro, motivos de pausa, ganchos de salvamento, correção de plural e de ID Olist vazio)
- `ferramentas-local/painel_servidor.py` (serve os arquivos novos e preserva `rascunhos`/`motivos`)
- `script.js`, `automacao/gerar_paginas_seo.py` (respeitam `familiaCor`, `ordemCores` e `seoTitulo`/`seoDescricao`)
- `docs/ARQUITETURA-3ZK.md`, `docs/MAPA-ARQUIVOS.md`

Dados:
- nenhum arquivo de dados alterado nesta tarefa (hashes conferidos).

Validações:
- 31 cenários automatizados no Chrome com pasta simulada (nada gravado no projeto): busca por nome/cor/SKU/chave/ID Olist, preço base e de variação, família, acabamento, arrastar, pausar produto e variação, reativar, nova variação com foto, duplicar variação e produto, vínculo Olist (bloqueio de duplicado e confirmação ALTERAR), cadastro em rascunho, lote +5%, SEO, prévia, detecção de imagem inexistente, Ctrl+S e Publicar agora;
- comparação antes/depois das gravações: só os campos esperados mudaram; chaveEstoque, SKU, GTIN e idCatalogo intactos; JSON no mesmo formato;
- `validar_catalogo.py`, `gerar_catalogo_sem_consultar_olist.py` e `gerar_paginas_seo.py` aprovados sobre o resultado; rascunho e pausado não publicados.

Observações e riscos:
- publicar continua exigindo Commit e Push (GitHub Desktop); o navegador não faz push nem dispara workflows sem token;
- configurações de ordem pública de materiais/marcas/categorias não foram implementadas (ainda fixas no site);
- histórico e desfazer do histórico ficam no navegador de quem usou o painel.
