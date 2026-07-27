# Automação de estoque — Catálogo 3ZK

Esta versão consulta automaticamente a API V2 da Olist/Tiny, converte o saldo
em estados públicos e publica o catálogo pelo GitHub Actions.

## Regra pública

- 0: a cor não aparece no catálogo.
- 1 a 3: aparece como `Últimas unidades`.
- Acima de 3: aparece como `Em estoque`.
- O número exato não é salvo em `dados/produtos.json`.

## Arquivos novos

- `.github/workflows/atualizar-estoque.yml`
- `automacao/atualizar_estoque.py`
- `automacao/mapeamento-olist.json`
- `dados/produtos-base.json`

## Importante

O token nunca deve ser colocado em arquivo ou no código. Ele deve existir
somente no GitHub em:

`Settings > Secrets and variables > Actions > New repository secret`

Nome exato:

`OLIST_API_TOKEN`

## Ativar a publicação

Em `Settings > Pages`, escolha `GitHub Actions` em `Build and deployment`.

Depois abra `Actions`, selecione o workflow
`Atualizar estoque Olist e publicar catálogo` e clique em `Run workflow`.

Se o teste funcionar, o workflow passa a rodar automaticamente aos minutos
17 e 47 de cada hora.

## Como adicionar produtos no futuro

1. Adicione o produto/cor em `dados/produtos-base.json`.
2. Adicione a mesma `chaveEstoque` em `automacao/mapeamento-olist.json`.
3. Informe o `olistId` correto da variação.
4. Faça um commit dessa mudança estrutural.

As atualizações normais de estoque não exigem commit manual.
