# Regras para Alterações no Site 3ZK

## 1. Regra principal de versão

A branch `main` do GitHub é sempre a fonte oficial.

Antes de alterar qualquer arquivo importante:

1. obter a versão atual da `main`;
2. comparar o estado de trabalho com essa versão;
3. identificar alterações locais pendentes;
4. não substituir trabalho mais novo por ZIP, backup ou versão lembrada de outra conversa.

Se não for possível confirmar que a base usada corresponde à `main`, a alteração deve ser interrompida ou entregue de forma completamente isolada, sem sobrescrever arquivos existentes.

## 2. Nunca remover sem pedido explícito

Não remover automaticamente:

- produtos;
- variações/cores;
- categorias ou filtros existentes;
- fotos;
- chaves estáveis;
- IDs/mapeamentos da Olist;
- workflows;
- hooks Git;
- funções JavaScript;
- automações Python;
- configurações existentes.

Quando algo precisa deixar de aparecer no catálogo, verificar primeiro se o mecanismo correto é uma pausa em `dados/controle-catalogo.json`.

## 3. Isolamento por área

Cada alteração deve modificar somente o necessário.

### Fotos

Uma alteração apenas de foto pode envolver:

- `assets/fotos/**`;
- referência `imagens` correspondente em `dados/produtos-base.json`.

Não deve, sem necessidade real:

- modificar status de estoque;
- trocar `chaveEstoque`;
- trocar ID Olist;
- alterar CSS global;
- apagar outras fotos.

### Visual

Uma alteração visual deve ficar, conforme o caso, em:

- `index.html`;
- `style.css`;
- `script.js` somente quando o comportamento visual depender de lógica.

Não deve alterar dados de estoque ou integração apenas para obter efeito visual.

### Estoque

A sincronização de estoque deve modificar o estado público, não o cadastro-base manual.

O workflow atual foi desenhado para registrar somente:

- `dados/produtos.json`;
- `dados/ultima-atualizacao.json`.

### Pausas

Pausar/reativar deve usar:

- `dados/controle-catalogo.json`.

Não apagar cadastro ou mapeamento para simular uma pausa.

### Cadastro de produto ou variação

Novo cadastro pode exigir, de forma coordenada:

- `dados/produtos-base.json`;
- `automacao/mapeamento-olist.json`;
- `assets/fotos/**`, se houver imagens;
- `dados/controle-catalogo.json`, se o item for cadastrado pausado.

O `dados/produtos.json` continua sendo tratado como saída da automação. O painel local atual cria `dados/produtos-preview.json` para pré-visualização.

### Documentação

Alteração exclusivamente documental deve ficar em `docs/`.

Os workflows atuais de publicação e sincronização não incluem `docs/**` nos gatilhos de publicação do site. Assim, documentação isolada não precisa alterar o runtime.

## 4. IDs e chaves são contratos

Os seguintes identificadores não devem ser alterados por simples mudança visual ou textual:

- `chaveEstoque` da base;
- `idCatalogo` público;
- `olistId` do mapeamento.

Eles conectam cadastro, estoque, controle manual e carrinho.

Troca de nome de cor, marca ou linha deve ser tratada com cuidado quando puder afetar slugs ou chaves derivadas.

## 5. Não editar estoque público como fonte manual

`dados/produtos-base.json` é a fonte manual versionada de cadastro encontrada no código atual.

`dados/produtos.json` contém o estado público e pertence ao fluxo de geração/sincronização.

Para mudanças manuais de preço, foto ou cadastro, preferir alterar a base e deixar o fluxo de publicação montar o catálogo público.

## 6. Proteções obrigatórias antes de entregar

### Comparação

Executar e revisar o equivalente a:

```bash
git status --short
git diff --stat
git diff
```

O diff final deve conter apenas os arquivos necessários à solicitação.

### Validação do catálogo

Executar:

```bash
python automacao/validar_catalogo.py
```

Quando a alteração exige que `produtos.json` já esteja totalmente sincronizado com a base, usar também:

```bash
python automacao/validar_catalogo.py --strict-public
```

### Sintaxe Python

Executar:

```bash
python -m py_compile automacao/*.py ferramentas-local/painel_servidor.py
```

### Sintaxe JavaScript

Quando `script.js` for alterado e Node estiver disponível:

```bash
node --check script.js
```

### Teste de regressão por escopo

Além das validações gerais, conferir explicitamente que áreas não relacionadas permanecem intactas.

Exemplos:

- alteração de foto: conferir que `statusEstoque`, `disponivel`, IDs e mapeamento não mudaram;
- alteração visual: conferir que JSONs e workflows não mudaram;
- alteração de estoque: conferir que fotos, preços e base manual não foram alterados;
- documentação: conferir que o diff contém apenas `docs/**`.

## 7. Proteção contra trabalho concorrente

O projeto já contém mecanismos contra conflito e eles devem ser preservados:

- painel local compara assinaturas dos arquivos antes de salvar;
- sincronização de estoque retorna à `origin/main` mais recente antes de reaplicar somente o estoque;
- pre-commit pode bloquear commits inválidos;
- validação no GitHub repete verificações.

Se um arquivo mudou na `main` depois do início de uma alteração, refazer a comparação antes de aplicar o patch.

## 8. Workflows e hooks são arquivos protegidos

Não considerar ausência local de `.github/workflows/**` ou `.githooks/pre-commit` como autorização para removê-los.

No estado oficial documentado existem:

- `.github/workflows/atualizar-estoque.yml`;
- `.github/workflows/publicar-site.yml`;
- `.github/workflows/validar-catalogo.yml`;
- `.githooks/pre-commit`.

## 9. Relato de entrega

Toda alteração relevante deve registrar:

- base/commit da `main` utilizada;
- arquivos adicionados;
- arquivos modificados;
- arquivos removidos, se houver pedido explícito;
- validações executadas;
- avisos conhecidos que já existiam antes;
- riscos ou limitações encontrados.

Para alterações feitas por IA, registrar também uma entrada em `docs/CHANGELOG-IA.md` quando a própria atualização já incluir esse arquivo ou quando o usuário pedir manutenção da documentação.
