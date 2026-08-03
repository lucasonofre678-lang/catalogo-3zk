# Correção definitiva — Olist e fluxo rápido

## IDs corretos encontrados no relatório de 03/08/2026 às 17:27

- Vermelho: 1053249362
- Cool Grey: 1053249374
- Green Olive: 1053249379

Os IDs antigos tinham um dígito extra e não existiam na Olist.

## Publicações visuais

Fotos, CSS, HTML, destaques, preços e textos executam apenas o workflow
`Publicar catálogo rápido`, sem consultar a Olist.

## Atualização rápida dos três produtos

Em GitHub:

Actions > Sincronizar estoque Olist > Run workflow

No campo `ids_olist`, cole:

1053249362,1053249374,1053249379

A automação consultará somente esses três IDs e manterá o último estoque
válido dos demais itens.

Para atualização completa, deixe o campo vazio.

## Segurança

Este pacote não inclui:
- dados/produtos.json
- dados/ultima-atualizacao.json
