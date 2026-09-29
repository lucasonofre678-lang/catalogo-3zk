"""Gera miniaturas WebP das fotos do catálogo para o site publicado.

Roda na publicação, depois de copiar assets/ para a pasta do site e montar o
catálogo público. Não altera nenhuma foto original nem nenhum dado: só cria
cópias reduzidas dentro da pasta do site.

    <site>/assets/miniaturas/p/<caminho da foto>   até 200 px  (cores, pedido, variações)
    <site>/assets/miniaturas/c/<caminho da foto>   até 560 px  (foto dos cards)

O caminho da foto é o mesmo de assets/fotos/; fotos que não são .webp ganham
".webp" no fim do nome (ex.: cor.png -> cor.png.webp), para dois arquivos com o
mesmo nome e extensões diferentes nunca virarem a mesma miniatura.

O site usa a foto original sempre que uma miniatura não existe.
Uso: python automacao/gerar_miniaturas.py --site _site
"""

from __future__ import annotations

import argparse
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps

TAMANHOS = {"p": 200, "c": 560}
EXTENSOES = {".webp", ".png", ".jpg", ".jpeg"}
PASTA_FOTOS = "assets/fotos/"


def caminho_miniatura(foto: str, tamanho: str) -> str:
    """Mesma regra de miniatura() no script.js."""
    resto = foto[len(PASTA_FOTOS):]
    return f"assets/miniaturas/{tamanho}/{resto}" + ("" if resto.lower().endswith(".webp") else ".webp")


def fotos_do_site(site: Path) -> list[str]:
    """Todas as fotos de assets/fotos (as das cores com caminho padrão também estão lá)."""
    return sorted(a.relative_to(site).as_posix() for a in (site / PASTA_FOTOS).rglob("*") if a.is_file() and a.suffix.lower() in EXTENSOES)


def reduzir(site: Path, foto: str, qualidade: int) -> dict[str, tuple[int, int]]:
    """Cria as miniaturas de uma foto; devolve {tamanho: (bytes da original, bytes da miniatura)}."""
    origem = site / foto
    medidas = {}
    with Image.open(origem) as aberta:
        imagem = ImageOps.exif_transpose(aberta)
        if imagem.mode not in ("RGB", "RGBA"):
            imagem = imagem.convert("RGBA" if "transparency" in imagem.info or imagem.mode in ("LA", "PA", "P") else "RGB")
        for nome, lado in TAMANHOS.items():
            destino = site / caminho_miniatura(foto, nome)
            destino.parent.mkdir(parents=True, exist_ok=True)
            copia = imagem.copy()
            copia.thumbnail((lado, lado), Image.LANCZOS)
            copia.save(destino, "WEBP", quality=qualidade, method=4)
            medidas[nome] = (origem.stat().st_size, destino.stat().st_size)
    return medidas


def gerar(site: Path, qualidade: int) -> int:
    total = falhas = 0
    bytes_originais = {nome: 0 for nome in TAMANHOS}
    bytes_miniaturas = {nome: 0 for nome in TAMANHOS}
    fotos = fotos_do_site(site)
    # Um processo por núcleo: a publicação não fica esperando foto por foto.
    with ProcessPoolExecutor(max_workers=os.cpu_count() or 2) as execucao:
        tarefas = {execucao.submit(reduzir, site, foto, qualidade): foto for foto in fotos}
        for tarefa in as_completed(tarefas):
            try:
                for nome, (original, reduzida) in tarefa.result().items():
                    bytes_originais[nome] += original
                    bytes_miniaturas[nome] += reduzida
                total += 1
            except Exception as erro:  # uma foto com problema não impede a publicação: o site usa a original
                falhas += 1
                print(f"Aviso: miniatura não gerada para {tarefas[tarefa]}: {erro}", file=sys.stderr)

    mb = lambda b: f"{b / 1024 / 1024:.1f} MB"
    for nome, lado in TAMANHOS.items():
        print(f"Miniaturas {nome} ({lado} px): {mb(bytes_originais[nome])} -> {mb(bytes_miniaturas[nome])}")
    print(f"{total} fotos processadas, {falhas} com erro.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera miniaturas WebP das fotos do catálogo publicado.")
    parser.add_argument("--site", required=True, type=Path, help="Pasta do site montado (ex.: _site).")
    parser.add_argument("--qualidade", type=int, default=78)
    args = parser.parse_args()
    if not (args.site / PASTA_FOTOS).is_dir():
        raise SystemExit(f"Pasta de fotos não encontrada: {args.site / PASTA_FOTOS}")
    return gerar(args.site, args.qualidade)


if __name__ == "__main__":
    raise SystemExit(main())
