#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import tempfile
import threading
import webbrowser
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
PANEL_PATH = SCRIPT_DIR / "painel-catalogo-3zk.html"
BASE_PATH = PROJECT_ROOT / "dados" / "produtos-base.json"
CONTROL_PATH = PROJECT_ROOT / "dados" / "controle-catalogo.json"
MAX_BODY = 1_000_000


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        if default is not None:
            return default
        raise FileNotFoundError(path)
    return json.loads(path.read_text(encoding="utf-8"))


def slugify(value: Any) -> str:
    import re
    import unicodedata
    text = unicodedata.normalize("NFD", str(value or "").lower())
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.replace("&", " e ")
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", text))


def prepare_products(base: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for product in base:
        colors = product.get("cores")
        if not isinstance(colors, list) or not colors:
            continue

        first_key = next(
            (str(color.get("chaveEstoque") or "").strip() for color in colors if color.get("chaveEstoque")),
            "",
        )
        product_id = (
            "|".join(first_key.split("|")[:3])
            if first_key
            else "|".join([
                slugify(product.get("marca")),
                slugify(product.get("material")),
                slugify(product.get("linha")),
            ])
        )

        prepared_colors = []
        for color in colors:
            color_id = str(color.get("chaveEstoque") or "").strip()
            if not color_id:
                color_id = f"{product_id}|{slugify(color.get('nome'))}"
            prepared_colors.append({
                "id": color_id,
                "nome": str(color.get("nome") or "Sem nome"),
                "hex": str(color.get("hex") or "#d9dfe8"),
            })

        result.append({
            "id": product_id,
            "marca": str(product.get("marca") or "Sem marca"),
            "material": str(product.get("material") or ""),
            "linha": str(product.get("linha") or ""),
            "preco": product.get("preco") or 0,
            "cores": prepared_colors,
        })
    return result


def normalize_control(value: Any) -> dict[str, Any]:
    value = value if isinstance(value, dict) else {}

    def clean_list(raw: Any) -> list[str]:
        if not isinstance(raw, list):
            return []
        return sorted({str(item).strip() for item in raw if str(item).strip()})

    return {
        "versao": 1,
        "atualizadoEm": value.get("atualizadoEm"),
        "produtosPausados": clean_list(value.get("produtosPausados")),
        "coresPausadas": clean_list(value.get("coresPausadas")),
    }


def backup_control() -> None:
    if not CONTROL_PATH.exists():
        return
    base = Path(os.environ.get("LOCALAPPDATA") or tempfile.gettempdir())
    backup_dir = base / "3ZK" / "backups-controle-catalogo"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    shutil.copy2(CONTROL_PATH, backup_dir / f"controle-catalogo-{timestamp}.json")


def atomic_write_control(control: dict[str, Any]) -> None:
    CONTROL_PATH.parent.mkdir(parents=True, exist_ok=True)
    backup_control()
    temporary = CONTROL_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(control, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(CONTROL_PATH)


class Handler(BaseHTTPRequestHandler):
    server_version = "3ZKPainel/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        print("[Painel 3ZK] " + (format % args))

    def send_bytes(self, content: bytes, content_type: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, value: Any, status: int = 200) -> None:
        content = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_bytes(content, "application/json; charset=utf-8", status)

    def do_GET(self) -> None:
        if self.path in {"/", "/painel-catalogo-3zk.html"}:
            if not PANEL_PATH.exists():
                self.send_error(HTTPStatus.NOT_FOUND, "Painel não encontrado")
                return
            self.send_bytes(PANEL_PATH.read_bytes(), "text/html; charset=utf-8")
            return

        if self.path == "/api/estado":
            try:
                base = read_json(BASE_PATH)
                if not isinstance(base, list):
                    raise ValueError("produtos-base.json não contém uma lista")
                control = normalize_control(read_json(CONTROL_PATH, {}))
                self.send_json({
                    "produtos": prepare_products(base),
                    "controle": control,
                    "projeto": str(PROJECT_ROOT),
                })
            except Exception as exc:
                self.send_json({"erro": str(exc)}, 500)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Rota não encontrada")

    def do_POST(self) -> None:
        if self.path != "/api/salvar":
            self.send_error(HTTPStatus.NOT_FOUND, "Rota não encontrada")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > MAX_BODY:
                raise ValueError("Tamanho da solicitação inválido")
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            control = normalize_control(payload)
            control["atualizadoEm"] = datetime.now().astimezone().isoformat(timespec="seconds")
            atomic_write_control(control)
            self.send_json({"ok": True, "controle": control})
        except Exception as exc:
            self.send_json({"erro": str(exc)}, 400)


def main() -> None:
    if not BASE_PATH.exists():
        print("\nERRO: produtos-base.json não foi encontrado.")
        print(f"Esperado em: {BASE_PATH}")
        input("Pressione Enter para fechar...")
        return

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    address, port = server.server_address
    url = f"http://{address}:{port}/"

    print("=" * 58)
    print(" PAINEL LOCAL DO CATÁLOGO 3ZK")
    print("=" * 58)
    print(f" Projeto: {PROJECT_ROOT}")
    print(f" Endereço: {url}")
    print("\nMantenha esta janela aberta enquanto usa o painel.")
    print("Para encerrar, feche esta janela ou pressione Ctrl+C.\n")

    threading.Timer(0.7, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("\nPainel encerrado.")


if __name__ == "__main__":
    main()
