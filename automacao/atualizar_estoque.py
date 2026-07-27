#!/usr/bin/env python3
"""
Sincroniza a disponibilidade do catálogo 3ZK com o estoque da Olist/Tiny API V2.

O número exato de estoque é usado apenas em memória e nunca é salvo no JSON
público. O arquivo público recebe somente:
- sem_estoque
- ultimas_unidades
- em_estoque
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


API_URL = "https://api.tiny.com.br/api2/produto.obter.estoque.php"
DEFAULT_DELAY_SECONDS = 3.2
DEFAULT_TIMEOUT_SECONDS = 35
MAX_RETRIES = 4
LARGE_DROP_FRACTION = Decimal("0.25")


class SyncError(RuntimeError):
    """Erro seguro de sincronização."""


@dataclass(frozen=True)
class StockResult:
    olist_id: int
    status: str
    available: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Atualiza o produtos.json com a disponibilidade da Olist."
    )
    parser.add_argument(
        "--base",
        default="dados/produtos-base.json",
        help="JSON estável com produtos, cores, fotos e links.",
    )
    parser.add_argument(
        "--mapping",
        default="automacao/mapeamento-olist.json",
        help="Mapeamento das cores para os IDs da Olist.",
    )
    parser.add_argument(
        "--output",
        default="dados/produtos.json",
        help="JSON público gerado.",
    )
    parser.add_argument(
        "--metadata",
        default="dados/ultima-atualizacao.json",
        help="Metadados da última verificação para o site publicado.",
    )
    parser.add_argument(
        "--mock-file",
        help=(
            "Arquivo JSON opcional para testar sem chamar a API. "
            "Formato: {\"ID_OLIST\": quantidade}."
        ),
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SyncError(f"Arquivo não encontrado: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SyncError(f"JSON inválido em {path}: {exc}") from exc


def atomic_write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def decimal_value(value: Any, field_name: str) -> Decimal:
    if value in (None, ""):
        return Decimal("0")
    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError) as exc:
        raise SyncError(
            f"Valor inválido no campo {field_name}: {value!r}"
        ) from exc


def public_status(quantity: Decimal) -> tuple[str, bool]:
    if quantity <= 0:
        return "sem_estoque", False
    if quantity <= 3:
        return "ultimas_unidades", True
    return "em_estoque", True


def api_error_message(payload: dict[str, Any]) -> str:
    retorno = payload.get("retorno") or {}
    errors = retorno.get("erros") or []
    messages = []

    for item in errors:
        if isinstance(item, dict) and item.get("erro"):
            messages.append(str(item["erro"]))

    return "; ".join(messages) or "Erro não detalhado pela Olist."


def request_stock(
    token: str,
    olist_id: int,
    timeout_seconds: int,
) -> tuple[Decimal, dict[str, Any]]:
    encoded = urllib.parse.urlencode(
        {
            "token": token,
            "id": str(olist_id),
            "formato": "JSON",
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        API_URL,
        data=encoded,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "3ZK-Catalogo-Estoque/1.0",
        },
    )

    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(
                request,
                timeout=timeout_seconds,
            ) as response:
                raw_body = response.read().decode("utf-8-sig")
                payload = json.loads(raw_body)

            retorno = payload.get("retorno") or {}

            if retorno.get("status") != "OK":
                message = api_error_message(payload)
                lower_message = message.lower()

                retryable = any(
                    term in lower_message
                    for term in (
                        "limite",
                        "tempor",
                        "indispon",
                        "timeout",
                        "tente novamente",
                    )
                )

                if retryable and attempt < MAX_RETRIES:
                    wait = 5 * (2 ** (attempt - 1))
                    print(
                        f"[AVISO] Olist pediu nova tentativa para o ID "
                        f"{olist_id}. Aguardando {wait}s."
                    )
                    time.sleep(wait)
                    continue

                raise SyncError(
                    f"Olist retornou erro para o ID {olist_id}: {message}"
                )

            product = retorno.get("produto") or {}
            balance = decimal_value(product.get("saldo"), "saldo")
            reserved = decimal_value(
                product.get("saldoReservado"),
                "saldoReservado",
            )

            # Quando a extensão de reserva informa saldo reservado, usamos
            # saldo líquido para não anunciar como disponível algo já reservado.
            available_quantity = max(Decimal("0"), balance - reserved)
            return available_quantity, payload

        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in {429, 500, 502, 503, 504} and attempt < MAX_RETRIES:
                wait = 5 * (2 ** (attempt - 1))
                print(
                    f"[AVISO] HTTP {exc.code} no ID {olist_id}. "
                    f"Nova tentativa em {wait}s."
                )
                time.sleep(wait)
                continue
            raise SyncError(
                f"Falha HTTP {exc.code} ao consultar o ID {olist_id}."
            ) from exc

        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                wait = 5 * (2 ** (attempt - 1))
                print(
                    f"[AVISO] Falha temporária no ID {olist_id}. "
                    f"Nova tentativa em {wait}s."
                )
                time.sleep(wait)
                continue
            raise SyncError(
                f"Não foi possível consultar o ID {olist_id}: {exc}"
            ) from exc

    raise SyncError(
        f"Não foi possível consultar o ID {olist_id}: {last_error}"
    )


def validate_mapping(
    base_products: list[dict[str, Any]],
    mapping_items: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    mapping_by_key: dict[str, dict[str, Any]] = {}

    for item in mapping_items:
        key = str(item.get("chave") or "").strip()
        olist_id = item.get("olistId")

        if not key or not olist_id:
            raise SyncError(
                "O mapeamento contém item sem chave ou sem ID da Olist."
            )

        if key in mapping_by_key:
            raise SyncError(f"Chave duplicada no mapeamento: {key}")

        mapping_by_key[key] = item

    base_keys: list[str] = []

    for product in base_products:
        colors = product.get("cores")
        if not isinstance(colors, list) or not colors:
            raise SyncError(
                f"Produto sem cores válidas: {product.get('marca')} "
                f"{product.get('material')}"
            )

        for color in colors:
            key = str(color.get("chaveEstoque") or "").strip()
            if not key:
                raise SyncError(
                    f"Cor sem chaveEstoque: {product.get('marca')} "
                    f"{product.get('material')} — {color.get('nome')}"
                )
            base_keys.append(key)

    if len(base_keys) != len(set(base_keys)):
        raise SyncError("Existem chaves de estoque duplicadas no catálogo-base.")

    missing = sorted(set(base_keys) - set(mapping_by_key))
    extra = sorted(set(mapping_by_key) - set(base_keys))

    if missing:
        raise SyncError(
            "Cores sem mapeamento na Olist: " + ", ".join(missing)
        )

    if extra:
        raise SyncError(
            "Mapeamentos sem cor correspondente no catálogo: "
            + ", ".join(extra)
        )

    return mapping_by_key


def previous_available_count(output_path: Path) -> int | None:
    if not output_path.exists():
        return None

    try:
        current = load_json(output_path)
    except SyncError:
        return None

    if not isinstance(current, list):
        return None

    return sum(
        1
        for product in current
        for color in product.get("cores", [])
        if color.get("disponivel") is True
        and color.get("statusEstoque") != "sem_estoque"
    )


def load_mock_stock(path: Path) -> dict[int, Decimal]:
    payload = load_json(path)
    if not isinstance(payload, dict):
        raise SyncError("O mock deve ser um objeto JSON {ID: quantidade}.")

    result: dict[int, Decimal] = {}
    for raw_id, raw_quantity in payload.items():
        result[int(raw_id)] = decimal_value(raw_quantity, f"mock[{raw_id}]")
    return result


def main() -> int:
    args = parse_args()

    base_path = Path(args.base)
    mapping_path = Path(args.mapping)
    output_path = Path(args.output)
    metadata_path = Path(args.metadata)

    base_products = load_json(base_path)
    mapping_payload = load_json(mapping_path)

    if not isinstance(base_products, list):
        raise SyncError("produtos-base.json precisa conter uma lista.")

    mapping_items = mapping_payload.get("itens")
    if not isinstance(mapping_items, list):
        raise SyncError("mapeamento-olist.json não contém a lista 'itens'.")

    mapping_by_key = validate_mapping(base_products, mapping_items)

    mock_stock: dict[int, Decimal] | None = None
    token = os.environ.get("OLIST_API_TOKEN", "").strip()

    if args.mock_file:
        mock_stock = load_mock_stock(Path(args.mock_file))
        print("[TESTE] Usando arquivo mock. Nenhuma chamada à Olist será feita.")
    elif not token:
        raise SyncError(
            "O segredo OLIST_API_TOKEN não está disponível no ambiente."
        )

    delay_seconds = float(
        os.environ.get(
            "OLIST_DELAY_SECONDS",
            str(DEFAULT_DELAY_SECONDS),
        )
    )
    timeout_seconds = int(
        os.environ.get(
            "OLIST_TIMEOUT_SECONDS",
            str(DEFAULT_TIMEOUT_SECONDS),
        )
    )

    results_by_id: dict[int, StockResult] = {}
    total = len(mapping_items)

    for index, item in enumerate(mapping_items, start=1):
        olist_id = int(item["olistId"])

        if olist_id in results_by_id:
            continue

        print(
            f"[{index:02d}/{total:02d}] Consultando "
            f"{item.get('marca')} {item.get('material')} — "
            f"{item.get('cor')}..."
        )

        if mock_stock is not None:
            if olist_id not in mock_stock:
                raise SyncError(
                    f"O mock não possui o ID da Olist {olist_id}."
                )
            quantity = mock_stock[olist_id]
        else:
            quantity, _ = request_stock(
                token=token,
                olist_id=olist_id,
                timeout_seconds=timeout_seconds,
            )

        status, available = public_status(quantity)
        results_by_id[olist_id] = StockResult(
            olist_id=olist_id,
            status=status,
            available=available,
        )

        print(f"          Resultado público: {status}")

        if mock_stock is None and index < total:
            time.sleep(delay_seconds)

    generated = copy.deepcopy(base_products)
    status_counts = {
        "em_estoque": 0,
        "ultimas_unidades": 0,
        "sem_estoque": 0,
    }

    for product in generated:
        available_in_product = 0

        for color in product.get("cores", []):
            key = color.pop("chaveEstoque")
            mapping = mapping_by_key[key]
            result = results_by_id[int(mapping["olistId"])]

            color["statusEstoque"] = result.status
            color["disponivel"] = result.available

            status_counts[result.status] += 1
            if result.available:
                available_in_product += 1

        product["disponivel"] = available_in_product > 0

    total_colors = sum(status_counts.values())
    available_colors = (
        status_counts["em_estoque"]
        + status_counts["ultimas_unidades"]
    )

    if total_colors == 0:
        raise SyncError("A automação gerou zero cores. Publicação cancelada.")

    if available_colors == 0:
        raise SyncError(
            "A Olist indicou zero cores disponíveis. "
            "Publicação cancelada por segurança."
        )

    old_available = previous_available_count(output_path)

    if (
        old_available is not None
        and old_available >= 8
        and Decimal(available_colors)
        < Decimal(old_available) * LARGE_DROP_FRACTION
        and os.environ.get("ALLOW_LARGE_STOCK_CHANGE") != "true"
    ):
        raise SyncError(
            "A disponibilidade caiu mais de 75% em uma única execução. "
            "A publicação foi bloqueada por segurança. "
            "Confira a Olist ou execute novamente com "
            "ALLOW_LARGE_STOCK_CHANGE=true se a mudança for legítima."
        )

    atomic_write_json(output_path, generated)

    now = datetime.now(ZoneInfo("America/Sao_Paulo"))
    metadata = {
        "status": "ok",
        "ultimaVerificacao": now.isoformat(timespec="seconds"),
        "fusoHorario": "America/Sao_Paulo",
        "coresDisponiveis": available_colors,
        "coresOcultas": status_counts["sem_estoque"],
        "exibeQuantidadeExata": False,
    }
    atomic_write_json(metadata_path, metadata)

    print()
    print("Sincronização concluída.")
    print(f"- Em estoque: {status_counts['em_estoque']}")
    print(f"- Últimas unidades: {status_counts['ultimas_unidades']}")
    print(f"- Ocultas por falta de estoque: {status_counts['sem_estoque']}")
    print("- Nenhuma quantidade exata foi gravada no catálogo público.")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SyncError as exc:
        print(f"ERRO DE SINCRONIZAÇÃO: {exc}", file=sys.stderr)
        raise SystemExit(1)
