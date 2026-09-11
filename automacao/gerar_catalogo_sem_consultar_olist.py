#!/usr/bin/env python3
"""Monta o catálogo PÚBLICO sem expor identificadores internos.

Usa a base interna e o último estoque conhecido, aplica as pausas antes do
deploy e grava somente os campos necessários para o frontend.
"""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any


class BuildError(RuntimeError):
    pass


INTERNAL_PUBLIC_KEYS = {
    "chaveEstoque",
    "idCatalogo",
    "olistId",
    "sku",
    "gtin",
    "statusEstoqueInicial",
    "disponivelInicial",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="dados/produtos-base.json")
    parser.add_argument("--estoque-atual", default="dados/produtos.json")
    parser.add_argument("--controle", default="dados/controle-catalogo.json")
    parser.add_argument("--output", default="_site/dados/produtos.json")
    parser.add_argument(
        "--catalogo-completo",
        action="store_true",
        help=(
            "Mantém todas as variações e os idCatalogo. Use somente para "
            "reconstruir dados/produtos.json; a publicação do site deve "
            "continuar usando o modo sanitizado padrão."
        ),
    )
    return parser.parse_args()


def load_json(path: Path, default: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        if default is not None:
            return default
        raise BuildError(f"Arquivo não encontrado: {path}")
    except json.JSONDecodeError as exc:
        raise BuildError(f"JSON inválido em {path}: {exc}") from exc


def product_id(stock_key: str) -> str:
    parts = stock_key.split("|")
    if len(parts) < 4:
        raise BuildError(f"chaveEstoque inválida: {stock_key!r}")
    return "|".join(parts[:3])


def sanitize(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: sanitize(item)
            for key, item in value.items()
            if key not in INTERNAL_PUBLIC_KEYS
        }
    if isinstance(value, list):
        return [sanitize(item) for item in value]
    return value


def atomic_write(path: Path, value: Any, *, compact: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    if compact:
        content = json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"
    else:
        content = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    temporary.write_text(
        content,
        encoding="utf-8",
    )
    temporary.replace(path)


def main() -> int:
    args = parse_args()
    base = load_json(Path(args.base))
    current = load_json(Path(args.estoque_atual))
    control = load_json(Path(args.controle), default={})

    if not isinstance(base, list) or not isinstance(current, list):
        raise BuildError("Os arquivos de produtos precisam conter listas.")

    paused_products = {
        str(item).strip()
        for item in control.get("produtosPausados", [])
        if str(item).strip()
    }
    paused_colors = {
        str(item).strip()
        for item in control.get("coresPausadas", [])
        if str(item).strip()
    }

    previous_by_key: dict[str, dict[str, Any]] = {}
    for product in current:
        for color in product.get("cores", []):
            key = str(color.get("idCatalogo") or "").strip()
            if key:
                previous_by_key[key] = color

    public_products: list[dict[str, Any]] = []
    reused = 0
    hidden = 0

    for source_product in base:
        product = copy.deepcopy(source_product)
        public_colors: list[dict[str, Any]] = []
        product_key: str | None = None

        for color in product.get("cores", []):
            key = str(color.get("chaveEstoque") or "").strip()
            if not key:
                raise BuildError(
                    f"Cor sem chaveEstoque: {product.get('marca')} "
                    f"{product.get('material')} — {color.get('nome')}"
                )

            current_product_key = product_id(key)
            product_key = product_key or current_product_key
            if current_product_key != product_key:
                raise BuildError(
                    "Produto com chaves incompatíveis: "
                    f"{product.get('marca')} {product.get('material')}"
                )

            if (
                not args.catalogo_completo
                and (current_product_key in paused_products or key in paused_colors)
            ):
                hidden += 1
                continue

            previous = previous_by_key.get(key)
            if previous:
                status = previous.get("statusEstoque", "sem_estoque")
                available = previous.get("disponivel") is True
                reused += 1
            else:
                status = str(color.get("statusEstoqueInicial", "sem_estoque")).strip() or "sem_estoque"
                available = color.get("disponivelInicial") is True

            if args.catalogo_completo:
                color.pop("chaveEstoque", None)
                color.pop("statusEstoqueInicial", None)
                color.pop("disponivelInicial", None)
                color["idCatalogo"] = key
                color["statusEstoque"] = status
                color["disponivel"] = available
                public_colors.append(color)
                continue

            color["statusEstoque"] = status
            color["disponivel"] = available

            # O site já oculta itens indisponíveis. Não há motivo para enviá-los ao navegador.
            if not available:
                hidden += 1
                continue

            public_colors.append(sanitize(color))

        if not public_colors:
            continue

        product["cores"] = public_colors
        product["disponivel"] = any(
            color.get("disponivel") is True for color in public_colors
        )

        if args.catalogo_completo:
            product["idCatalogo"] = product_key
            # Mantém a mesma ordem de campos gerada por atualizar_estoque.py.
            product["disponivel"] = product.pop("disponivel")
            public_products.append(product)
        else:
            public_products.append(sanitize(product))

    atomic_write(
        Path(args.output),
        public_products,
        compact=not args.catalogo_completo,
    )
    if args.catalogo_completo:
        print("Catálogo completo reconstruído com o estoque reaproveitado.")
    else:
        print("Catálogo público sanitizado montado.")
    print(f"- Variações com estoque reaproveitado: {reused}")
    print(f"- Variações não publicadas: {hidden}")
    print(f"- Produtos públicos: {len(public_products)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BuildError as exc:
        print(f"ERRO AO MONTAR CATÁLOGO: {exc}")
        raise SystemExit(1)
