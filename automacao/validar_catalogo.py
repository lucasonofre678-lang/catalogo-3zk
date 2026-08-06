#!/usr/bin/env python3
"""Validação preventiva do catálogo 3ZK.

Executa sem acessar a Olist. O objetivo é bloquear antes do commit/publicação:
- JSON inválido ou conteúdo extra depois do fechamento;
- marcas de conflito do Git;
- chaves de estoque e IDs da Olist duplicados;
- catálogo-base, catálogo público e mapeamento incompatíveis;
- fotos marcadas como confirmadas que não existem.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
VALID_STOCK = {"em_estoque", "ultimas_unidades", "sem_estoque"}
CONFLICT_MARKERS = ("<<<<<<<", ">>>>>>>")


class ValidationError(RuntimeError):
    pass


@dataclass
class Report:
    errors: list[str]
    warnings: list[str]

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warning(self, message: str) -> None:
        self.warnings.append(message)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Valida os arquivos do catálogo 3ZK.")
    parser.add_argument(
        "--strict-public",
        action="store_true",
        help="Exige que produtos.json já contenha todas as chaves da base.",
    )
    return parser.parse_args()


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def load_json(path: Path, report: Report) -> Any | None:
    if not path.is_file():
        report.error(f"Arquivo ausente: {rel(path)}")
        return None

    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        report.error(
            f"JSON inválido em {rel(path)} — linha {exc.lineno}, "
            f"coluna {exc.colno}: {exc.msg}"
        )
        return None
    except UnicodeDecodeError as exc:
        report.error(f"Codificação inválida em {rel(path)}: {exc}")
        return None


def product_id_from_key(key: str) -> str:
    parts = key.split("|")
    if len(parts) < 4:
        raise ValidationError(f"chaveEstoque inválida: {key!r}")
    return "|".join(parts[:3])


def scan_conflict_markers(report: Report) -> None:
    candidates: list[Path] = []
    for pattern in ("*.json", "*.py", "*.js", "*.html", "*.yml", "*.yaml"):
        candidates.extend(ROOT.rglob(pattern))

    ignored_parts = {".git", "_site", "__pycache__", "backups-catalogo"}
    for path in sorted(set(candidates)):
        if ignored_parts.intersection(path.parts):
            continue
        try:
            lines = path.read_text(encoding="utf-8-sig").splitlines()
        except (UnicodeDecodeError, OSError):
            continue
        for number, line in enumerate(lines, start=1):
            stripped = line.lstrip()
            if stripped.startswith(CONFLICT_MARKERS):
                report.error(
                    f"Marca de conflito do Git em {rel(path)}:{number}: {stripped[:40]}"
                )


def normalize_control(value: Any) -> tuple[set[str], set[str]]:
    if not isinstance(value, dict):
        return set(), set()
    products = {
        str(item).strip()
        for item in value.get("produtosPausados", [])
        if str(item).strip()
    }
    colors = {
        str(item).strip()
        for item in value.get("coresPausadas", [])
        if str(item).strip()
    }
    return products, colors


def validate_catalog(args: argparse.Namespace) -> Report:
    report = Report([], [])
    scan_conflict_markers(report)

    base = load_json(ROOT / "dados/produtos-base.json", report)
    public = load_json(ROOT / "dados/produtos.json", report)
    mapping = load_json(ROOT / "automacao/mapeamento-olist.json", report)
    control = load_json(ROOT / "dados/controle-catalogo.json", report)

    if report.errors:
        return report

    if not isinstance(base, list):
        report.error("dados/produtos-base.json precisa conter uma lista.")
        return report
    if not isinstance(public, list):
        report.error("dados/produtos.json precisa conter uma lista.")
        return report
    if not isinstance(mapping, dict) or not isinstance(mapping.get("itens"), list):
        report.error("automacao/mapeamento-olist.json precisa conter a lista 'itens'.")
        return report

    paused_products, paused_colors = normalize_control(control)

    base_keys: list[str] = []
    base_products: list[str] = []
    confirmed_missing: list[str] = []
    expected_missing: list[str] = []

    for index, product in enumerate(base, start=1):
        if not isinstance(product, dict):
            report.error(f"Produto #{index} da base não é um objeto.")
            continue
        colors = product.get("cores")
        label = " ".join(
            str(product.get(field) or "").strip()
            for field in ("marca", "material", "linha")
        ).strip() or f"produto #{index}"

        if not isinstance(colors, list) or not colors:
            report.error(f"Produto sem variações: {label}")
            continue
        if not isinstance(product.get("preco"), (int, float)) or float(product["preco"]) <= 0:
            report.error(f"Preço principal inválido: {label}")

        ids_in_product: set[str] = set()
        for color_index, color in enumerate(colors, start=1):
            if not isinstance(color, dict):
                report.error(f"Variação inválida em {label}, posição {color_index}.")
                continue
            name = str(color.get("nome") or f"posição {color_index}")
            key = str(color.get("chaveEstoque") or "").strip()
            if not key:
                report.error(f"Cor sem chaveEstoque: {label} — {name}")
                continue
            try:
                ids_in_product.add(product_id_from_key(key))
            except ValidationError as exc:
                report.error(f"{label} — {name}: {exc}")
                continue
            base_keys.append(key)

            initial_status = color.get("statusEstoqueInicial")
            if initial_status is not None and str(initial_status) not in VALID_STOCK:
                report.error(
                    f"statusEstoqueInicial inválido em {label} — {name}: {initial_status!r}"
                )
            if "disponivelInicial" in color and not isinstance(color["disponivelInicial"], bool):
                report.error(f"disponivelInicial precisa ser booleano em {label} — {name}.")

            images = color.get("imagens", [])
            if not isinstance(images, list):
                report.error(f"Campo imagens inválido em {label} — {name}.")
                continue
            for image in images:
                image_path = ROOT / str(image)
                if image_path.is_file():
                    continue
                message = f"{label} — {name}: {image}"
                if color.get("fotoStatus") == "confirmada":
                    confirmed_missing.append(message)
                else:
                    expected_missing.append(message)

        if len(ids_in_product) != 1:
            report.error(f"Produto reúne chaves incompatíveis: {label}")
        else:
            base_products.extend(ids_in_product)

    duplicates = sorted({key for key in base_keys if base_keys.count(key) > 1})
    if duplicates:
        report.error("chaveEstoque duplicada: " + ", ".join(duplicates[:8]))

    duplicate_products = sorted({key for key in base_products if base_products.count(key) > 1})
    if duplicate_products:
        report.error("ID de produto duplicado: " + ", ".join(duplicate_products[:8]))

    mapping_keys: list[str] = []
    mapping_ids: list[int] = []
    for index, item in enumerate(mapping["itens"], start=1):
        if not isinstance(item, dict):
            report.error(f"Mapeamento #{index} não é um objeto.")
            continue
        key = str(item.get("chave") or "").strip()
        try:
            olist_id = int(item.get("olistId"))
        except (TypeError, ValueError):
            report.error(f"ID Olist inválido no mapeamento #{index}.")
            continue
        if not key:
            report.error(f"Mapeamento #{index} sem chave.")
        if olist_id <= 0:
            report.error(f"ID Olist inválido no mapeamento #{index}: {olist_id}")
        mapping_keys.append(key)
        mapping_ids.append(olist_id)

    for values, name in ((mapping_keys, "chave do mapeamento"), (mapping_ids, "ID Olist")):
        duplicate = sorted({value for value in values if values.count(value) > 1}, key=str)
        if duplicate:
            report.error(f"{name} duplicado: " + ", ".join(map(str, duplicate[:8])))

    base_key_set = set(base_keys)
    mapping_key_set = set(mapping_keys)
    allowed_missing = set(paused_colors)
    for product in base:
        keys = [str(color.get("chaveEstoque") or "").strip() for color in product.get("cores", [])]
        ids = {product_id_from_key(key) for key in keys if key}
        if len(ids) == 1 and next(iter(ids)) in paused_products:
            allowed_missing.update(keys)

    missing_mapping = sorted(base_key_set - mapping_key_set - allowed_missing)
    extra_mapping = sorted(mapping_key_set - base_key_set)
    if missing_mapping:
        report.error("Cores ativas sem mapeamento Olist: " + ", ".join(missing_mapping[:8]))
    if extra_mapping:
        report.error("Mapeamentos sem cor na base: " + ", ".join(extra_mapping[:8]))

    public_keys: list[str] = []
    public_products: list[str] = []
    for product in public:
        if not isinstance(product, dict):
            report.error("Há um produto público que não é objeto.")
            continue
        product_id = str(product.get("idCatalogo") or "").strip()
        if product_id:
            public_products.append(product_id)
        for color in product.get("cores", []):
            key = str(color.get("idCatalogo") or "").strip()
            if not key:
                report.error(
                    f"Cor pública sem idCatalogo: {product.get('marca')} "
                    f"{product.get('material')} — {color.get('nome')}"
                )
                continue
            public_keys.append(key)
            status = str(color.get("statusEstoque") or "")
            if status not in VALID_STOCK:
                report.error(f"statusEstoque inválido em {key}: {status!r}")
            if not isinstance(color.get("disponivel"), bool):
                report.error(f"disponivel precisa ser booleano em {key}.")

    if len(public_keys) != len(set(public_keys)):
        report.error("Existem idCatalogo de cores duplicados em dados/produtos.json.")
    if len(public_products) != len(set(public_products)):
        report.error("Existem idCatalogo de produtos duplicados em dados/produtos.json.")

    missing_public = sorted(base_key_set - set(public_keys))
    extra_public = sorted(set(public_keys) - base_key_set)
    if missing_public and args.strict_public:
        report.error(
            "produtos.json está desatualizado e não contém: "
            + ", ".join(missing_public[:8])
        )
    elif missing_public:
        report.warning(
            f"produtos.json ainda não contém {len(missing_public)} variação(ões) da base; "
            "a publicação rápida irá montá-las sem consultar a Olist."
        )
    if extra_public:
        report.error(
            "produtos.json contém variações ausentes da base: "
            + ", ".join(extra_public[:8])
        )

    if confirmed_missing:
        report.error(
            f"{len(confirmed_missing)} foto(s) marcada(s) como confirmada(s) não existem. "
            "Primeiros casos: " + " | ".join(confirmed_missing[:5])
        )
    if expected_missing:
        report.warning(
            f"{len(expected_missing)} referência(s) sem arquivo permanecem cadastradas como foto ausente."
        )

    mapping_total = mapping.get("total")
    if mapping_total != len(mapping["itens"]):
        report.error(
            f"Campo total do mapeamento está incorreto: {mapping_total!r}; "
            f"esperado {len(mapping['itens'])}."
        )

    report.warning(
        f"Resumo: {len(base)} produtos, {len(base_keys)} variações, "
        f"{len(mapping_keys)} vínculos Olist."
    )
    return report


def main() -> int:
    report = validate_catalog(parse_args())

    for warning in report.warnings:
        print(f"[AVISO] {warning}")
    for error in report.errors:
        print(f"[ERRO] {error}", file=sys.stderr)

    if report.errors:
        print(f"\nVALIDAÇÃO REPROVADA: {len(report.errors)} erro(s).", file=sys.stderr)
        return 1

    print("\nVALIDAÇÃO APROVADA: catálogo consistente e JSONs válidos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
