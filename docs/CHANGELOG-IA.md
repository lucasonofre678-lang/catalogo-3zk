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
