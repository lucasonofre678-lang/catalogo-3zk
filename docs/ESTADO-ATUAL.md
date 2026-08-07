# Estado Atual do Site 3ZK

## Baseline documentada

- branch oficial: `main`
- commit: `94990d3c784c439c9900e42101b960a6e70b9f4f`
- commit curto: `94990d3`
- data: `2026-08-07 15:33:06 -03:00`
- mensagem: `foto correta`

A comparação com o GitHub indicou que esse commit e a `main` eram idênticos no momento da criação desta documentação.

## Catálogo cadastrado

### Totais

- produtos em `produtos-base.json`: **20**
- variações/cores: **222**
- vínculos em `mapeamento-olist.json`: **222**

O campo `total` do mapeamento corresponde à quantidade real de itens.

### Produtos por material

- PLA: **10 produtos**
- PETG: **5 produtos**
- ASA: **1 produto**
- ABS: **1 produto**
- TPU: **1 produto**
- TPR: **1 produto**
- Outras: **1 produto**

### Grupos de produto encontrados

1. Flashforge PLA — 17 variações
2. Closin PETG — 16
3. Closin PLA — 24
4. Masterprint PETG — 28
5. Anycubic PETG — 8
6. FusionX PETG — 13
7. Fusion High Speed PETG — 2
8. Masterprint PLA — 41
9. Masterprint PLA Silk Especial — 1
10. Masterprint PLA Etiqueta Neutra — 2
11. Masterprint PLA Especial — 3
12. Masterprint PLA Fosforescente — 3
13. Masterprint ASA — 1
14. Masterprint ABS — 13
15. Masterprint TPU — 4
16. Masterprint TPR — 6
17. Creality Soleyin Ultra PLA — 8
18. Elegoo PLA — 13
19. Multifila PLA — 17
20. Rolo Etiqueta Outras / Térmica 10x15 — 2

## Estado de estoque no `produtos.json`

No arquivo público da baseline:

- `em_estoque`: **76 variações**
- `ultimas_unidades`: **21 variações**
- `sem_estoque`: **125 variações**
- `disponivel: true`: **97 variações**
- produtos com `disponivel: true`: **18**

Esses números representam o JSON público antes da aplicação das pausas manuais no navegador.

## Controle manual vigente

`dados/controle-catalogo.json` está na versão 1 e registra atualização em `2026-08-07T18:45:00.000Z`.

### Produtos pausados

- `fusion-high-speed|petg|`
- `masterprint|pla|etiqueta-neutra`

### Cores pausadas

- `closin|petg||rosa`
- `masterprint|pla|fosforescente|fosforescente-natural-rainbow`
- `masterprint|pla|fosforescente|fosforescente-natural-verde`
- `masterprint|pla||roxo-claro`
- `masterprint|pla||silk-vermelho-purpura`

### Efeito atual das pausas + estoque

Das 97 variações com `disponivel: true` no JSON público:

- 4 ficam ocultas por pertencerem aos 2 produtos pausados;
- 2 ficam ocultas por pausas individuais de cor;
- **91 variações** permanecem efetivamente visíveis após estoque + controle manual;
- **15 produtos** permanecem com ao menos uma variação visível.

Algumas cores pausadas já estão sem estoque; por isso nem todas as cinco pausas de cor reduzem o total de 97 disponíveis.

## Última sincronização registrada

`dados/ultima-atualizacao.json` contém:

- status: `ok`
- última verificação: `2026-08-07T11:45:01-03:00`
- fuso: `America/Sao_Paulo`
- cores disponíveis registradas pela sincronização: **96**
- cores ocultas por estoque: **125**
- depósitos considerados: `Geral` e `Loja presencial`
- quantidade exata exposta: **não**
- consultas realizadas: **190**
- estoques reaproveitados por limite: **22**
- estoques reaproveitados por erro: **0**
- produtos pausados sem consulta: **9 itens de mapeamento**
- próximo índice de consulta: **58**
- modo: `completa`
- limite da API atingido: `false`

### Observação de estado

O metadado da última sincronização registra 96 cores disponíveis, enquanto o `dados/produtos.json` do commit atual possui 97 variações com `disponivel: true`.

Isso mostra que `ultima-atualizacao.json` descreve a execução de sincronização registrada às 11:45, enquanto o catálogo recebeu commits posteriores no mesmo dia. Não tratar o campo `coresDisponiveis` desse metadado como uma contagem recalculada em tempo real do commit atual.

## Fotos

Na base atual:

- 169 variações estão com `fotoStatus: "confirmada"`;
- 51 estão com `fotoStatus: "ausente"`;
- 1 está com `fotoStatus: "candidata_disponivel"`;
- 1 está com `fotoStatus: "revisar_linha"`.

Existem 233 referências de imagens cadastradas na base.

A validação atual encontrou:

- **0** fotos marcadas como confirmadas faltando no disco;
- **50** referências sem arquivo que permanecem cadastradas como foto ausente/não confirmada.

Portanto, a validação é aprovada com aviso. Essas 50 referências não devem ser apagadas automaticamente apenas por estarem ausentes.

## Estado das automações

### Validação

`python automacao/validar_catalogo.py` na baseline:

- resultado: **APROVADO**;
- aviso: 50 referências de foto sem arquivo;
- resumo: 20 produtos, 222 variações, 222 vínculos Olist.

### Publicação

Existe workflow de publicação rápida no GitHub Pages. Ele monta `_site` sem chamar a API de estoque.

### Sincronização

Existe workflow de estoque com execução:

- manual;
- 08:00 BRT;
- 15:00 BRT;
- 18:00 BRT.

O fluxo atual limita as consultas a 190 por execução no workflow e reaproveita estados anteriores quando necessário.

## Estado do painel local

O painel atual possui funções implementadas para:

- conectar a pasta do projeto;
- ler base/público/controle;
- pausar e reativar itens;
- editar preços;
- administrar fotos;
- converter imagens para WebP;
- cadastrar produtos e variações;
- atualizar `mapeamento-olist.json` durante novos cadastros;
- gerar `produtos-preview.json` para teste local;
- impedir salvamento se arquivos relevantes mudaram no disco durante a edição.

Dados privados do painel, como operador/histórico local e detalhes auxiliares, são mantidos em `localStorage` do navegador.

## Pontos que exigem cuidado

1. `destaques.css` existe, mas não é carregado por `index.html`; não assumir que editar esse arquivo sozinho alterará o site.
2. `produtos-preview.json` é local e ignorado pelo Git; não deve ser confundido com o catálogo público oficial.
3. `dados/produtos.json` pertence ao fluxo de automação; mudanças manuais de cadastro devem partir da base.
4. Existem pastas/fotos históricas que não correspondem necessariamente a produtos ativos; não limpar por nome sem análise.
5. Há 50 referências de foto ausente aceitas pelo validador; isso é um aviso conhecido da baseline, não um erro introduzido por esta documentação.
