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

---

## 2026-09-28 — Conversão (CRO), desempenho e acessibilidade

Base:
- branch: `main`
- commit inicial: `d263cdc` (Add home banner and PLA storefront)

Escopo:
- menos cliques até o WhatsApp: finalização em uma tela (itens, entrega, pagamento, nome opcional, total e envio), aviso "adicionado" com "Finalizar pedido", barra "Finalizar pedido · total" no celular e tela de confirmação com "Começar um novo pedido";
- produto com uma única variação ganha "Adicionar" direto no card;
- link `?produto=&cor=&adicionar=1` coloca o item no pedido e abre a finalização (usado por "Adicionar ao pedido" das páginas de produto); os parâmetros saem da URL para um recarregamento não somar de novo;
- páginas estáticas: "Seu pedido (n)" no cabeçalho quando há itens, botão "Adicionar ao pedido" abrindo a finalização, foto menor no celular, grade de cores maior e miniaturas também nas páginas de categoria;
- cards mais compactos no celular (textos curtos, "Em estoque" só no drawer), letras de no mínimo 11–12 px, alvos de toque maiores em telas de toque, botão de pausar/retomar o carrossel e pontos com área de toque de 24 px;
- valores do pedido sempre com centavos (R$ 88,00) na tela e no WhatsApp;
- desempenho: fonte Anuphan hospedada no site (sem Google Fonts; CSP restringida a `'self'`), miniaturas WebP geradas na publicação, `controle-catalogo.json` não é mais pedido em produção, `/favicon.ico` na raiz;
- seções de baixo da home: guia de materiais em cards que filtram o catálogo (PLA, PETG, ABS, ASA, TPU) e dúvidas frequentes com cartão de atendimento (textos reaproveitados do próprio site);
- `style.css` com uma regra por linha (nenhuma declaração alterada nessa reformatação).

Arquivos adicionados:
- `automacao/gerar_miniaturas.py`
- `assets/fontes/anuphan-latin.woff2`, `assets/fontes/anuphan-latin-ext.woff2`, `assets/fontes/OFL.txt`

Arquivos modificados:
- `index.html`, `style.css`, `script.js`, `seo-produto.js`
- `automacao/gerar_paginas_seo.py` (botões das páginas de produto, miniaturas, atalho do pedido, fonte local)
- `.github/workflows/publicar-site.yml` (Pillow + miniaturas com fallback, `favicon.ico` na raiz, CSP sem Google Fonts)
- `docs/ARQUITETURA-3ZK.md`, `docs/MAPA-ARQUIVOS.md`

Dados:
- nenhum produto, foto original, ID, SKU, `chaveEstoque`, vínculo Olist, estoque ou preço alterado.

Validações:
- 34 verificações automáticas no Chrome (computador e celular) sobre o site montado como no workflow: adicionar pelo card, toast → finalização, totais Pix/cartão, dica de entrega, mensagem completa do WhatsApp, tela de sucesso, novo pedido, link `adicionar=1` sem soma no recarregamento, página de produto e de categoria, pausa do carrossel, fonte local, miniaturas, `favicon.ico`, sem rolagem lateral;
- auditoria antes → depois: LCP no computador 3,0 s → 0,9 s; página inicial 2,5 MB → 0,85 MB; produto aberto 7,1 MB → 1,1 MB de imagens; textos < 12 px no celular 197 → 128 (restam etiquetas em maiúsculas de 11 px);
- `validar_catalogo.py`, `node --check` (script.js, seo-produto.js, produto.js), `py_compile` e os três blocos Python do `publicar-site.yml` aprovados sobre a cópia montada.

Observações e riscos:
- a publicação ganha ~15–25 s para as miniaturas; se o Pillow não instalar ou alguma foto falhar, o site segue com as fotos originais;
- um botão "Comprar agora" (só um item direto no WhatsApp) chegou a ser feito e foi retirado a pedido do dono antes da publicação;
- pendências que dependem da 3ZK: fotos padronizadas, endereço/horário de retirada e avaliações reais de clientes; os banners continuam no `index.html` (edição pelo painel ainda não existe).
