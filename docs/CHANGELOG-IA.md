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
