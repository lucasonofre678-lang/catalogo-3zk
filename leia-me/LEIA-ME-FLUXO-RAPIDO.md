# Novo fluxo rápido do catálogo 3ZK

## Alterações visuais, fotos, preços e textos

Um Commit e Push executa apenas **Publicar catálogo rápido**.

Esse workflow:

1. usa o `produtos-base.json` mais recente;
2. reaproveita o último status válido de `produtos.json`;
3. publica fotos, preços, HEX, textos, HTML, CSS e JavaScript;
4. não faz nenhuma chamada à Olist.

## Estoque

A sincronização da Olist roda apenas:

- automaticamente às 08:00, 15:00 e 18:00;
- manualmente no botão **Run workflow** do workflow `Sincronizar estoque Olist`.

O estoque não é mais iniciado por Commit ou Push.

## Proteções

- uma sincronização de estoque por vez;
- alterações visuais feitas durante uma consulta longa não causam conflito;
- no máximo 190 consultas por execução, evitando o bloqueio observado próximo de 200 acessos;
- a próxima execução começa pelos itens que ficaram para depois;
- o commit automático do estoque aciona a publicação rápida.
