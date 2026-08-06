#!/usr/bin/env python3
"""Monta o catálogo público com dados visuais novos e o último estoque conhecido.

Este script NÃO acessa a Olist. Ele combina:
- dados/produtos-base.json: nomes, preços, fotos, HEX e links atuais;
- dados/produtos.json: último status de estoque válido já conhecido.

Assim, fotos, CSS, preços e textos podem ser publicados rapidamente sem iniciar
uma sincronização pesada de centenas de produtos.
"""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any


class BuildError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="dados/produtos-base.json")
    parser.add_argument("--estoque-atual", default="dados/produtos.json")
    parser.add_argument("--output", default="_site/dados/produtos.json")
    return parser.parse_args()


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise BuildError(f"Arquivo não encontrado: {path}") from exc
    except json.JSONDecodeError as exc:
        raise BuildError(f"JSON inválido em {path}: {exc}") from exc


def product_id(stock_key: str) -> str:
    parts = stock_key.split("|")
    if len(parts) < 4:
        raise BuildError(f"chaveEstoque inválida: {stock_key!r}")
    return "|".join(parts[:3])


def atomic_write(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def main() -> int:
    args = parse_args()
    base = load_json(Path(args.base))
    current = load_json(Path(args.estoque_atual))

    if not isinstance(base, list) or not isinstance(current, list):
        raise BuildError("Os arquivos de produtos precisam conter listas.")

    previous_by_key: dict[str, dict[str, Any]] = {}
    for product in current:
        for color in product.get("cores", []):
            key = str(color.get("idCatalogo") or "").strip()
            if key:
                previous_by_key[key] = color

    generated = copy.deepcopy(base)
    reused = 0
    new_without_stock = 0

    for product in generated:
        ids: set[str] = set()
        visible = 0

        for color in product.get("cores", []):
            key = str(color.pop("chaveEstoque", "")).strip()
            if not key:
                raise BuildError(
                    f"Cor sem chaveEstoque: {product.get('marca')} "
                    f"{product.get('material')} — {color.get('nome')}"
                )

            ids.add(product_id(key))
            color["idCatalogo"] = key

            # Estes campos pertencem somente ao catálogo-base. Eles precisam
            # ser removidos do catálogo público em todas as execuções, inclusive
            # quando o estoque anterior já contém a variação. Isso mantém a
            # montagem idempotente e evita dados internos vazando para o site.
            initial_status = str(
                color.pop("statusEstoqueInicial", "sem_estoque")
            ).strip() or "sem_estoque"
            initial_available = color.pop("disponivelInicial", False) is True

            previous = previous_by_key.get(key)

            if previous:
                color["statusEstoque"] = previous.get(
                    "statusEstoque", "sem_estoque"
                )
                color["disponivel"] = previous.get("disponivel") is True
                reused += 1
            else:
                # Produto novo: usa um estado inicial explícito somente quando
                # ele foi cadastrado e conferido. Sem isso, continua oculto
                # até a primeira sincronização real com a Olist.
                color["statusEstoque"] = initial_status
                color["disponivel"] = initial_available
                if not initial_available:
                    new_without_stock += 1

            if color["disponivel"]:
                visible += 1

        if len(ids) != 1:
            raise BuildError(
                "Produto com chaves incompatíveis: "
                f"{product.get('marca')} {product.get('material')}"
            )

        product["idCatalogo"] = next(iter(ids))
        product["disponivel"] = visible > 0

    atomic_write(Path(args.output), generated)
    print("Catálogo visual montado sem consultar a Olist.")
    print(f"- Estoques reaproveitados: {reused}")
    print(f"- Cores novas aguardando sincronização: {new_without_stock}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BuildError as exc:
        print(f"ERRO AO MONTAR CATÁLOGO: {exc}")
        raise SystemExit(1)
