"""Gera as páginas estáticas de SEO do catálogo 3ZK.

Roda na publicação, depois que o catálogo público (_site/dados/produtos.json)
foi montado. Usa SOMENTE os dados reais desse catálogo: nada é inventado e
nenhum arquivo de dados do repositório é alterado.

Gera dentro da pasta do site:
- produto/<slug>/index.html      (uma página por produto publicado)
- filamentos/ e filamentos/<material>/
- acessorios/
- marcas/ e marcas/<marca>/
- guia-de-materiais/
- sobre/
- 404.html
- sitemap.xml
e pré-renderiza os cards e o diretório de produtos em index.html.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

BASE_URL = "https://3zk.com.br/"
WHATSAPP = "https://wa.me/554184539430"
LOJA_ONLINE = "https://3zkfilamentos.com.br/"
MATERIAIS_FILAMENTO = ["PLA", "PETG", "ABS", "ASA", "TPU", "TPR"]

GUIA_MATERIAIS = {
    "PLA": (
        "Fácil de imprimir e versátil.",
        "O PLA é o material mais usado na impressão 3D: imprime em temperaturas mais baixas, "
        "deforma pouco e aceita uma grande variedade de cores e acabamentos, como silk, fosco e "
        "marmorizado. É indicado para protótipos, peças decorativas e uso geral em ambientes sem calor excessivo.",
    ),
    "PETG": (
        "Resistência e boa durabilidade.",
        "O PETG combina facilidade de impressão com mais resistência a impacto e à umidade do que o PLA. "
        "É uma boa escolha para peças funcionais e objetos que precisam de mais durabilidade no dia a dia.",
    ),
    "ABS": (
        "Boa resistência mecânica e térmica.",
        "O ABS suporta temperaturas mais altas e esforços mecânicos. Costuma pedir mesa aquecida e "
        "ambiente fechado para evitar empenamento, e é usado em peças técnicas e funcionais.",
    ),
    "ASA": (
        "Resistente ao sol e ao tempo.",
        "O ASA tem comportamento parecido com o ABS, com melhor resistência a raios UV e intempéries. "
        "É indicado para peças que ficam em ambientes externos.",
    ),
    "TPU": (
        "Flexível para peças funcionais.",
        "O TPU é um filamento flexível e elástico, usado em capas, vedações, amortecedores e peças que "
        "precisam dobrar sem quebrar. Imprime melhor em velocidades mais baixas.",
    ),
    "TPR": (
        "Flexível e macio ao toque.",
        "O TPR é uma borracha termoplástica flexível, indicada para peças macias e com aderência.",
    ),
}

ICONE_BUSCA = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9.5 6 6 6-6 6"></path></svg>'
ICONE_MAIS = '<span class="card-open-plus" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 6v12M6 12h12"></path></svg></span>'


# ------------------------------------------------------------------
# Regras de nome, slug, seção, preço e estoque (espelham o script.js)
# ------------------------------------------------------------------
def normalizar(texto: Any) -> str:
    texto = unicodedata.normalize("NFD", str(texto or "").lower())
    return "".join(ch for ch in texto if not ("̀" <= ch <= "ͯ"))


def slugificar(texto: Any) -> str:
    valor = normalizar(texto).replace("&", " e ")
    valor = re.sub(r"[^a-z0-9]+", "-", valor)
    return valor.strip("-")


def normalizar_busca(texto: Any) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", normalizar(texto))).strip()


def e(valor: Any) -> str:
    return html.escape(str(valor if valor is not None else ""), quote=True)


def nome_completo(p: dict) -> str:
    partes = [p.get("marca"), p.get("material")]
    if p.get("linha"):
        partes.append(p["linha"])
    return " ".join(str(x) for x in partes if x is not None)


def secao(p: dict) -> str:
    if normalizar(p.get("secao")) == "acessorios":
        return "acessorios"
    tipo = normalizar(p.get("tipoProduto") or "filamento")
    return "acessorios" if tipo and tipo != "filamento" else "filamentos"


def categoria(p: dict) -> str:
    valor = str(p.get("categoria") or "").strip()
    if valor:
        return valor
    texto = normalizar_busca(" ".join(str(p.get(k) or "") for k in ("marca", "material", "linha", "tipoProduto")))
    return "Etiquetas" if "etiqueta" in texto else "Acessórios"


def nome_interface(p: dict) -> str:
    if secao(p) != "acessorios":
        return nome_completo(p)
    partes = [p.get("marca")]
    material = normalizar(p.get("material"))
    redundante = material in ("outras", normalizar(p.get("categoria"))) or any(material in normalizar(x) for x in partes)
    if p.get("material") and not redundante:
        partes.append(p["material"])
    if p.get("linha"):
        partes.append(p["linha"])
    return " ".join(str(x) for x in partes if x)


def status_estoque(c: dict) -> str:
    if c.get("disponivel") is False or c.get("statusEstoque") == "sem_estoque":
        return "sem_estoque"
    if c.get("statusEstoque") == "ultimas_unidades":
        return "ultimas_unidades"
    return "em_estoque"


def rotulo_estoque(c: dict) -> tuple[str, str]:
    return ("Últimas unidades", "stock--low") if status_estoque(c) == "ultimas_unidades" else ("Em estoque", "stock--ok")


def preco(p: dict, c: dict) -> float:
    try:
        valor = float(c.get("preco"))
        if valor > 0:
            return valor
    except (TypeError, ValueError):
        pass
    try:
        return float(p.get("preco") or 0)
    except (TypeError, ValueError):
        return 0.0


def centavos(valor: float) -> float:
    return round(valor + 1e-9, 2)


def resumo_preco(valor: float) -> dict:
    normal = centavos(valor)
    desconto = centavos(normal * 0.05)
    return {"normal": normal, "pix": centavos(normal - desconto), "parcela": centavos(normal / 3)}


def moeda(valor: float) -> str:
    inteiro, dec = f"{valor:,.2f}".split(".")
    return f"R$ {inteiro.replace(',', '.')},{dec}"


# Ordem de exibição das cores por família (espelha getColorFamily / sortVariantsByColorFamily do script.js).
# Só reordena: nome, preço, estoque, fotos e IDs das variações não mudam.
FAMILIAS_ORDEM_COR = [
    (1, {"branco", "branca", "white", "natural", "skin", "pele", "bege", "beige", "creme", "marfim", "ivory", "perola"}, {"cream"}),
    (2, {"amarelo", "yellow", "dourado", "dourada", "gold", "ouro", "champagne"}, {"limao", "lemon", "mel", "honey", "manga", "mango", "abacaxi", "pineapple", "canario"}),
    (3, {"laranja", "orange", "tangerina", "tangerine"}, {"alaranjado", "melon"}),
    (4, {"vermelho", "red", "coral", "vinho", "wine", "bordo"}, set()),
    (5, {"rosa", "pink", "rose", "rosehip", "fuchsia", "fucsia"}, {"strawberry", "dragon"}),
    (6, {"roxo", "purple", "violeta", "violet", "lavanda", "lavender", "lilas", "magenta", "purpura"}, {"iris"}),
    (7, {"azul", "blue", "ciano", "cyan", "tiffany", "turquesa", "marinho", "navy"}, {"midnight", "azulado", "ice"}),
    (8, {"verde", "green", "greenery", "mint", "menta", "honeydew", "oliva", "olive", "matcha"}, {"esverdeado", "citrus"}),
    (9, {"marrom", "brown", "madeira", "wood", "sand", "areia", "cafe", "chocolate", "caramelo", "castanho", "deserto"}, {"cobre", "copper", "bronze"}),
    (10, {"cinza", "gray", "grey", "prata", "prateado", "silver", "aco", "cromado"}, {"marmore", "marble", "marmorizado"}),
    (11, {"preto", "preta", "black", "carbono"}, set()),
]
FAMILIA_TRANSLUCIDA, FAMILIA_MULTICOR, FAMILIA_OUTROS = 12, 13, 14
TERMOS_TRANSLUCIDO = re.compile(r"\b(translucido|transparente|translucent|crystal|cristal|glass)\b")
TERMOS_MULTICOR = re.compile(r"\b(rainbow|arco iris|macaron|colors|candy|lollipop|ice cream|dual|duo|tricolor|termo)\b")


def familia_por_palavras(palavras: list[str]) -> int:
    for tipo in (1, 2):
        for palavra in palavras:
            for familia in FAMILIAS_ORDEM_COR:
                if palavra in familia[tipo]:
                    return familia[0]
    return 0


def familia_cor(nome: Any, efeito: Any = "") -> int:
    bruto = str(nome or "")
    texto = normalizar_busca(bruto)
    if normalizar(efeito) == "glass" or TERMOS_TRANSLUCIDO.search(texto):
        return FAMILIA_TRANSLUCIDA
    if TERMOS_MULTICOR.search(texto):
        return FAMILIA_MULTICOR
    partes = re.sub(r"\s+/\s+", " ", bruto).split("/")
    if len(partes) > 1 and len({familia_por_palavras(normalizar_busca(x).split(" ")) for x in partes}) > 1:
        return FAMILIA_MULTICOR
    return familia_por_palavras(texto.split(" ")) or FAMILIA_OUTROS


def ordenar_cores_por_familia(cores: list[dict]) -> list[dict]:
    # Mesmo critério do script.js: família, depois nome (sem distinguir acentos/maiúsculas), depois ordem original.
    return [c for _, _, _, c in sorted(
        ((familia_cor(c.get("nome"), c.get("efeito")), normalizar(c.get("nome")), i, c) for i, c in enumerate(cores)),
        key=lambda x: x[:3],
    )]


def fotos(p: dict, c: dict) -> list[str]:
    imagens = [x for x in (c.get("imagens") or []) if isinstance(x, str) and x.strip()]
    if imagens:
        return list(dict.fromkeys(imagens))
    if c.get("imagem"):
        return [c["imagem"]]
    return [f"assets/fotos/{slugificar(nome_completo(p))}/{slugificar(c.get('nome'))}.webp"]


def destaque(p: dict) -> str | None:
    marca = str(p.get("marca") or "").strip().lower()
    material = str(p.get("material") or "").strip().upper()
    linha = str(p.get("linha") or "").strip().lower()
    if (marca == "polyflow" and material == "PLA") or (marca == "masterprint" and material == "PETG" and linha == "5kg"):
        return "Produto novo"
    if (marca, material) in {("masterprint", "PETG"), ("closin", "PLA"), ("multifila", "PLA")}:
        return "Novas cores"
    return None


def rotulo_variacao(p: dict, plural: bool) -> str:
    if secao(p) == "acessorios":
        return (p.get("rotuloVariacaoPlural") or "opções") if plural else (p.get("rotuloVariacaoSingular") or "opção")
    return (p.get("rotuloVariacaoPlural") or "cores") if plural else (p.get("rotuloVariacaoSingular") or "cor")


# ------------------------------------------------------------------
# Catálogo publicado
# ------------------------------------------------------------------
def carregar_catalogo(caminho: Path, controle: Path | None) -> list[dict]:
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    pausados_p: set[str] = set()
    pausadas_c: set[str] = set()
    if controle and controle.exists():
        ctl = json.loads(controle.read_text(encoding="utf-8"))
        pausados_p = {str(x).strip() for x in ctl.get("produtosPausados", [])}
        pausadas_c = {str(x).strip() for x in ctl.get("coresPausadas", [])}

    produtos: list[dict] = []
    for p in dados:
        if not isinstance(p, dict) or not isinstance(p.get("cores"), list):
            continue
        pid = p.get("idCatalogo") or "|".join(slugificar(p.get(k)) for k in ("marca", "material", "linha"))
        if pid in pausados_p:
            continue
        cores = [
            c for c in p["cores"]
            if status_estoque(c) != "sem_estoque" and (c.get("idCatalogo") or f"{pid}|{slugificar(c.get('nome'))}") not in pausadas_c
        ]
        if cores:
            # Acessórios mantêm a ordem cadastrada; a cor padrão continua sendo a primeira do cadastro.
            ordenadas = cores if secao(p) == "acessorios" else ordenar_cores_por_familia(cores)
            produtos.append({**p, "cores": ordenadas, "_cor_padrao": cores[0]})

    usados: set[str] = set()
    for indice, p in enumerate(produtos):
        slug = slugificar(nome_interface(p)) or slugificar(nome_completo(p))
        if slug in usados:
            slug = slugificar(nome_completo(p))
        if slug in usados:
            raise SystemExit(f"Slug de produto duplicado: {slug}")
        usados.add(slug)
        p["_slug"] = slug
        p["_slug_link"] = slugificar(nome_completo(p))
        p["_nome"] = nome_interface(p)
        p["_secao"] = secao(p)
        p["_indice"] = indice
        p["_destaque"] = destaque(p)
    return produtos


def ordem_padrao(produtos: list[dict]) -> list[dict]:
    return sorted(produtos, key=lambda p: (0 if p["_destaque"] else 1, p["_indice"]))


# ------------------------------------------------------------------
# HTML compartilhado
# ------------------------------------------------------------------
class Pagina:
    def __init__(self, versao: str):
        self.versao = versao

    def cabecalho(self, *, raiz: str, titulo: str, descricao: str, canonical: str, imagem: str,
                  jsonld: list[dict], indexavel: bool = True, og_tipo: str = "website") -> str:
        v = f"?v={self.versao}" if self.versao else ""
        robots = "index,follow,max-image-preview:large" if indexavel else "noindex,follow"
        blocos = "\n".join(
            f'  <script type="application/ld+json">{json.dumps(bloco, ensure_ascii=False, separators=(",", ":"))}</script>'
            for bloco in jsonld
        )
        return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#00248E">
  <title>{e(titulo)}</title>
  <meta name="description" content="{e(descricao)}">
  <meta name="robots" content="{robots}">
  {f'<link rel="canonical" href="{e(canonical)}">' if indexavel else ''}
  <meta property="og:locale" content="pt_BR">
  <meta property="og:type" content="{og_tipo}">
  <meta property="og:site_name" content="3ZK Filamentos">
  <meta property="og:title" content="{e(titulo)}">
  <meta property="og:description" content="{e(descricao)}">
  <meta property="og:url" content="{e(canonical)}">
  <meta property="og:image" content="{e(imagem)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(titulo)}">
  <meta name="twitter:description" content="{e(descricao)}">
  <meta name="twitter:image" content="{e(imagem)}">
  <link rel="icon" type="image/x-icon" href="{raiz}assets/favicon/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="{raiz}assets/favicon/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="{raiz}assets/favicon/apple-touch-icon.png">
  <link rel="manifest" href="{raiz}assets/favicon/site.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{raiz}style.css{v}">
{blocos}
</head>
<body>
<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
<header class="site-header seo-static-header">
  <div class="shell seo-static-headrow">
    <a href="{raiz}" class="brand" aria-label="3ZK Filamentos — início"><img src="{raiz}assets/logo-fundo-invisivel.png" alt="3ZK Filamentos" width="96" height="55"></a>
    <nav class="seo-static-nav" aria-label="Navegação principal">
      <a href="{raiz}filamentos/">Filamentos</a>
      <a href="{raiz}filamentos/pla/">PLA</a>
      <a href="{raiz}filamentos/petg/">PETG</a>
      <a href="{raiz}filamentos/abs/">ABS</a>
      <a href="{raiz}filamentos/tpu/">TPU</a>
      <a href="{raiz}acessorios/">Acessórios</a>
      <a href="{raiz}guia-de-materiais/">Guia</a>
    </nav>
    <a class="seo-catalog-cta" href="{raiz}#catalogo">Abrir catálogo</a>
  </div>
</header>
<main id="conteudo" class="seo-page-main"><div class="shell">
"""

    def rodape(self, *, raiz: str, scripts: list[str] | None = None) -> str:
        v = f"?v={self.versao}" if self.versao else ""
        tags = "".join(f'\n<script src="{raiz}{s}{v}"></script>' for s in (scripts or []))
        return f"""</div></main>
<footer class="site-footer seo-static-footer">
  <div class="shell footer-grid">
    <div class="footer-brand"><img src="{raiz}assets/logo-fundo-invisivel.png" alt="3ZK Filamentos" width="96" height="55" loading="lazy" decoding="async"><p>Filamentos e soluções para impressão 3D.</p><p>Envio rápido para Curitiba e região · Retirada disponível</p></div>
    <div><h2>Filamentos</h2><a href="{raiz}filamentos/pla/">PLA</a><a href="{raiz}filamentos/petg/">PETG</a><a href="{raiz}filamentos/abs/">ABS</a><a href="{raiz}filamentos/asa/">ASA</a><a href="{raiz}filamentos/tpu/">TPU</a></div>
    <div><h2>Catálogo</h2><a href="{raiz}">Catálogo completo</a><a href="{raiz}acessorios/">Acessórios</a><a href="{raiz}marcas/">Marcas</a><a href="{raiz}guia-de-materiais/">Guia de materiais</a><a href="{raiz}sobre/">Sobre a 3ZK</a></div>
    <div><h2>Atendimento</h2><a href="{WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a><a href="https://www.instagram.com/3zk.filamentos/" target="_blank" rel="noopener">Instagram</a><a href="{LOJA_ONLINE}" target="_blank" rel="noopener">Loja online</a></div>
  </div>
</footer>{tags}
</body>
</html>
"""


def breadcrumb_html(raiz: str, itens: list[tuple[str, str | None]]) -> str:
    partes = []
    for nome, href in itens:
        if href is None:
            partes.append(f'<li aria-current="page">{e(nome)}</li>')
        else:
            partes.append(f'<li><a href="{raiz}{href}">{e(nome)}</a></li>')
    return f'<nav class="seo-breadcrumb" aria-label="Breadcrumb"><ol>{"".join(partes)}</ol></nav>\n'


def breadcrumb_ld(itens: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": nome, "item": BASE_URL + url}
            for i, (nome, url) in enumerate(itens)
        ],
    }


ORGANIZACAO_LD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": BASE_URL + "#organizacao",
    "name": "3ZK Filamentos",
    "alternateName": "3ZK",
    "url": BASE_URL,
    "logo": BASE_URL + "assets/logo-fundo-azul.png",
    "sameAs": ["https://www.instagram.com/3zk.filamentos/", LOJA_ONLINE],
}


def card_html(p: dict, raiz: str, posicao: int = 99) -> str:
    """Mesmo markup do card gerado pelo script.js (evita salto visual ao carregar)."""
    cores = p["cores"]
    c = p["_cor_padrao"]
    titulo = p["_nome"]
    href = f"{raiz}produto/{p['_slug']}/"
    muitas = len(cores) > 1
    acessorio = p["_secao"] == "acessorios"
    kicker = categoria(p) if acessorio else p.get("marca")
    badge = "ACESSÓRIO" if acessorio else p.get("material")
    estoque, classe = rotulo_estoque(c)
    cta = "Ver produto" if not muitas else ("Ver opções" if acessorio else "Ver cores")
    minis = ""
    if muitas:
        mostradas = cores[:4]
        if not any(v is c for v in mostradas):
            mostradas = [c] + [v for v in cores if v is not c][:3]
        minis = "".join(
            f'<button type="button" class="variant-mini{" is-active" if v is c else ""}" data-variant="{cores.index(v)}" aria-label="Pré-visualizar {e(v.get("nome"))}" aria-pressed="{"true" if v is c else "false"}" title="{e(v.get("nome"))}" '
            f'data-name="{e(v.get("nome"))}" data-image="{raiz}{e(fotos(p, v)[0])}" data-price="{preco(p, v):.2f}" data-stock="{e(rotulo_estoque(v)[0])}" data-stock-class="{rotulo_estoque(v)[1]}">'
            f'<img src="{raiz}{e(fotos(p, v)[0])}" alt="" loading="lazy" decoding="async"></button>'
            for v in mostradas
        )
        extra = len(cores) - len(mostradas)
        if extra > 0:
            minis += f'<a href="{href}" class="more-variants" data-open-product aria-label="Ver mais {extra} {e(rotulo_variacao(p, extra > 1))}">+{extra}</a>'
    flag = f'<span class="product-flag">{e(p["_destaque"])}</span>' if p["_destaque"] else ""
    resumo = f'<small>{len(cores)} {e(rotulo_variacao(p, True))}</small>' if muitas else ""
    return (
        f'<article class="product-card" data-product="{e(p["_slug_link"])}">'
        f'<div class="card-media"><span class="product-badge">{e(badge)}</span>{flag}<a class="card-media-open" href="{href}" data-open-product aria-label="Abrir {e(titulo)}"></a>'
        f'<img src="{raiz}{e(fotos(p, c)[0])}" alt="{e(titulo)} — {e(c.get("nome"))}" {'fetchpriority="high"' if posicao < 4 else 'loading="lazy"'} decoding="async">{ICONE_MAIS}</div>'
        f'<div class="card-body"><p class="product-kicker">{e(kicker)}</p><h3 class="product-title"><a href="{href}" data-open-product>{e(titulo)}</a></h3>'
        f'<p class="variant-summary"><span title="{e(c.get("nome"))}">{e(c.get("nome"))}</span>{resumo}</p>'
        f'<div class="card-variants">{minis}</div>'
        f'{card_price_block(preco(p, c), estoque, classe)}'
        f'<a class="primary-button card-cta" href="{href}" data-open-product>{cta}{ICONE_BUSCA}</a></div></article>'
    )


def grade(produtos: list[dict], raiz: str, acima_da_dobra: bool = True) -> str:
    return '<div class="product-grid seo-product-grid">' + "".join(card_html(p, raiz, i if acima_da_dobra else 99) for i, p in enumerate(produtos)) + "</div>"


def price_block(valor: float) -> str:
    r = resumo_preco(valor)
    return (
        f'<strong class="price-main">{moeda(r["normal"])}</strong>'
        f'<span class="price-pix">{moeda(r["pix"])} no Pix <em>5% OFF</em></span>'
        f'<span class="price-installments">ou 3x de {moeda(r["parcela"])} sem juros no cartão</span>'
    )


def card_price_block(valor: float, estoque: str, classe: str) -> str:
    """Mesmo markup de cardPriceBlock no script.js."""
    r = resumo_preco(valor)
    return (
        f'<div class="card-price-row"><span class="price">{moeda(r["normal"])}</span>'
        f'<span class="card-pix"><span>{moeda(r["pix"])} no Pix</span><em>5% OFF</em></span>'
        f'<span class="card-installments">ou 3x de {moeda(r["parcela"])} sem juros no cartão</span>'
        f'<span class="stock {classe}">{e(estoque)}</span></div>'
    )


# ------------------------------------------------------------------
# Páginas
# ------------------------------------------------------------------
def escrever(destino: Path, conteudo: str) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(conteudo, encoding="utf-8")


def pagina_produto(pg: Pagina, p: dict, site: Path) -> str:
    raiz = "../../"
    url = f"produto/{p['_slug']}/"
    acessorio = p["_secao"] == "acessorios"
    nome = p["_nome"]
    cores = p["cores"]
    c0 = p["_cor_padrao"]
    n = len(cores)
    plural = rotulo_variacao(p, True)
    material = p.get("material") or ""
    marca = p.get("marca") or ""

    if acessorio:
        descricao = f"{nome} no catálogo 3ZK: {n} {plural if n > 1 else rotulo_variacao(p, False)} com foto, preço e disponibilidade. Monte seu pedido e envie pelo WhatsApp."
        titulo = f"{nome} | Acessórios para impressão 3D | 3ZK"
        trilha = [("Início", ""), ("Acessórios", "acessorios/"), (nome, None)]
        trilha_ld = [("Início", ""), ("Acessórios", "acessorios/"), (nome, url)]
    else:
        descricao = f"Filamento {nome} para impressão 3D com {n} {plural if n > 1 else rotulo_variacao(p, False)} no catálogo 3ZK. Confira fotos, preço e disponibilidade de cada cor."
        titulo = f"Filamento {nome} | {n} {plural if n > 1 else rotulo_variacao(p, False)} | 3ZK"
        mat_slug = slugificar(material)
        trilha = [("Início", ""), ("Filamentos", "filamentos/"), (material, f"filamentos/{mat_slug}/"), (nome, None)]
        trilha_ld = [("Início", ""), ("Filamentos", "filamentos/"), (material, f"filamentos/{mat_slug}/"), (nome, url)]

    imagens_abs = []
    for c in cores:
        for f in fotos(p, c):
            if f not in imagens_abs:
                imagens_abs.append(f)
    imagens_abs = [BASE_URL + f for f in imagens_abs[:12]]

    ofertas = []
    for c in cores:
        ofertas.append({
            "@type": "Offer",
            "name": f"{nome} — {c.get('nome')}",
            "priceCurrency": "BRL",
            "price": f"{preco(p, c):.2f}",
            "availability": "https://schema.org/LimitedAvailability" if status_estoque(c) == "ultimas_unidades" else "https://schema.org/InStock",
            "url": f"{BASE_URL}{url}?cor={slugificar(c.get('nome'))}",
            "seller": {"@id": ORGANIZACAO_LD["@id"]},
        })
    produto_ld: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": nome,
        "url": BASE_URL + url,
        "description": descricao,
        "image": imagens_abs,
        "brand": {"@type": "Brand", "name": marca},
        "category": "Acessórios para impressão 3D" if acessorio else f"Filamento {material} para impressão 3D",
        "offers": ofertas if len(ofertas) > 1 else ofertas[0],
    }
    if not acessorio:
        produto_ld["material"] = material

    variantes = "".join(
        f'<a class="seo-variant-button{" is-active" if c is c0 else ""}" href="?cor={slugificar(c.get("nome"))}" data-seo-variant '
        f'data-name="{e(c.get("nome"))}" data-price="{preco(p, c):.2f}" data-stock="{e(rotulo_estoque(c)[0])}" data-stock-class="{rotulo_estoque(c)[1]}" '
        f'data-image="{raiz}{e(fotos(p, c)[0])}" data-slug="{slugificar(c.get("nome"))}">'
        f'<img src="{raiz}{e(fotos(p, c)[0])}" alt="{e(nome)} — {e(c.get("nome"))}" loading="lazy" decoding="async"><span>{e(c.get("nome"))}</span></a>'
        for c in cores
    )
    nomes = [str(c.get("nome")) for c in cores]
    lista_nomes = ", ".join(nomes[:12]) + (" e outras" if len(nomes) > 12 else "")
    precos = sorted({preco(p, c) for c in cores})
    faixa = moeda(precos[0]) if len(precos) == 1 else f"de {moeda(precos[0])} a {moeda(precos[-1])}"
    estoque0, classe0 = rotulo_estoque(c0)
    link_catalogo = f"{raiz}?produto={p['_slug_link']}&cor={slugificar(c0.get('nome'))}"
    categoria_href = f"{raiz}acessorios/" if acessorio else f"{raiz}filamentos/{slugificar(material)}/"
    fatos = [("Marca", marca)] if not acessorio else [("Categoria", categoria(p))]
    if not acessorio:
        fatos.append(("Material", material))
        if p.get("linha"):
            fatos.append(("Linha", p["linha"]))
    fatos.append((plural.capitalize(), str(n)))
    fatos.append(("Preço", faixa))

    corpo = breadcrumb_html(raiz, trilha)
    corpo += f"""<div class="seo-product-layout">
  <section class="seo-product-gallery" aria-label="Foto do produto"><img id="seoProductImage" src="{raiz}{e(fotos(p, c0)[0])}" alt="{e(nome)} — {e(c0.get('nome'))}" width="800" height="800" fetchpriority="high"></section>
  <section class="seo-product-info">
    <p class="seo-product-kicker">{e(categoria(p) if acessorio else f"{material} · {marca}")}</p>
    <h1>{e(nome)}</h1>
    <p class="seo-current-variant" id="seoVariantName">{e(c0.get('nome'))}</p>
    <div class="price-block" id="seoProductPrice">{price_block(preco(p, c0))}</div>
    <p class="stock-line {classe0}" id="seoProductStock">{estoque0}</p>
    <p>{e(descricao)}</p>
    <div class="seo-product-actions"><a class="primary-button" id="seoCatalogLink" data-produto="{e(p['_slug_link'])}" href="{e(link_catalogo)}">Adicionar ao pedido no catálogo</a><a class="secondary-button" href="{categoria_href}">Ver {'acessórios' if acessorio else f'filamentos {e(material)}'}</a></div>
  </section>
</div>
<section class="seo-section" aria-labelledby="variacoes"><h2 id="variacoes">{e(plural.capitalize())} disponíveis</h2><p>Selecione uma opção para ver a foto, o preço e a disponibilidade.</p><div class="seo-variant-list">{variantes}</div></section>
<section class="seo-section" aria-labelledby="dados-produto"><h2 id="dados-produto">Informações do produto</h2><div class="seo-facts">{''.join(f'<div class="seo-fact"><strong>{e(k)}</strong><span>{e(v)}</span></div>' for k, v in fatos)}</div></section>
<section class="seo-content-block"><h2>Sobre {e(nome)}</h2><p>{e(descricao)} {e(plural.capitalize())} disponíveis no momento: {e(lista_nomes)}. O preço e a disponibilidade podem variar conforme a opção escolhida; o pedido é montado no catálogo e confirmado pela equipe 3ZK pelo WhatsApp, com 5% de desconto no Pix ou dinheiro.</p></section>
"""
    relacionados = [x for x in PRODUTOS if x is not p and x["_secao"] == p["_secao"] and (acessorio or x.get("material") == material)][:4]
    if relacionados:
        corpo += f'<section class="seo-section" aria-labelledby="relacionados"><h2 id="relacionados">Veja também</h2>{grade(relacionados, raiz, False)}</section>\n'

    html_pg = pg.cabecalho(
        raiz=raiz, titulo=titulo, descricao=descricao, canonical=BASE_URL + url,
        imagem=imagens_abs[0] if imagens_abs else BASE_URL + "assets/social/catalogo-3zk.jpg",
        jsonld=[ORGANIZACAO_LD, breadcrumb_ld([(n_, u) for n_, u in trilha_ld]), produto_ld], og_tipo="product",
    ) + corpo + pg.rodape(raiz=raiz, scripts=["seo-produto.js"])
    escrever(site / url / "index.html", html_pg)
    return url


def pagina_lista(pg: Pagina, site: Path, *, url: str, titulo: str, h1: str, descricao: str, intro: str,
                 trilha: list[tuple[str, str | None]], produtos: list[dict], extra_html: str = "",
                 titulo_lista: str = "") -> bool:
    raiz = "../" * url.count("/")
    indexavel = bool(produtos) or bool(extra_html)
    trilha_ld = [(n, u if u is not None else url) for n, u in trilha]
    item_list = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": h1,
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "url": f"{BASE_URL}produto/{p['_slug']}/", "name": p["_nome"]}
            for i, p in enumerate(produtos)
        ],
    }
    corpo = breadcrumb_html(raiz, trilha)
    corpo += f'<section class="seo-page-hero"><h1>{e(h1)}</h1><p>{e(intro)}</p></section>\n'
    corpo += extra_html
    if produtos:
        rotulo = "produto" if len(produtos) == 1 else "produtos"
        corpo += f'<section class="seo-section"><h2>{e(titulo_lista or h1)}</h2><p>{len(produtos)} {rotulo} com estoque no catálogo 3ZK.</p>{grade(produtos, raiz)}</section>\n'
    else:
        corpo += f'<section class="seo-section"><h2>Sem produtos disponíveis no momento</h2><p>O estoque é atualizado várias vezes ao dia. <a href="{raiz}">Veja o catálogo completo</a>.</p></section>\n'
    jsonld = [ORGANIZACAO_LD, breadcrumb_ld(trilha_ld)]
    if produtos:
        jsonld.append(item_list)
    escrever(site / url / "index.html", pg.cabecalho(
        raiz=raiz, titulo=titulo, descricao=descricao, canonical=BASE_URL + url,
        imagem=BASE_URL + "assets/social/catalogo-3zk.jpg", jsonld=jsonld, indexavel=indexavel,
    ) + corpo + pg.rodape(raiz=raiz))
    return indexavel


def link_cards(itens: list[tuple[str, str, str]]) -> str:
    return '<div class="seo-category-grid">' + "".join(
        f'<a class="seo-link-card" href="{href}"><strong>{e(nome)}</strong><span>{e(texto)}</span></a>' for nome, href, texto in itens
    ) + "</div>"


def pre_renderizar_home(site: Path) -> None:
    index = site / "index.html"
    texto = index.read_text(encoding="utf-8")
    grade_vazia = '<div class="product-grid" id="productGrid" aria-busy="true"></div>'
    dir_vazio = '<div class="seo-directory" id="seoDirectory" hidden></div>'
    if grade_vazia not in texto or dir_vazio not in texto:
        raise SystemExit("index.html não tem os marcadores esperados para pré-renderização.")
    cards = "".join(card_html(p, "", i) for i, p in enumerate(ordem_padrao(PRODUTOS)))
    texto = texto.replace(grade_vazia, f'<div class="product-grid" id="productGrid" aria-busy="true">{cards}</div>')
    diretorio = "".join(f'<a href="produto/{p["_slug"]}/">{e(p["_nome"])}</a>' for p in PRODUTOS)
    texto = texto.replace(dir_vazio, f'<div class="seo-directory" id="seoDirectory" data-prerender="1"><details><summary>Explorar todos os produtos por nome</summary><div class="seo-directory-grid">{diretorio}</div></details></div>')
    texto = texto.replace('<span id="resultCount">…</span>', f'<span id="resultCount">{len(PRODUTOS)}</span>')
    index.write_text(texto, encoding="utf-8")


PRODUTOS: list[dict] = []


def main() -> int:
    global PRODUTOS
    parser = argparse.ArgumentParser(description="Gera páginas estáticas de SEO a partir do catálogo público.")
    parser.add_argument("--catalogo", default="_site/dados/produtos.json")
    parser.add_argument("--controle", default="", help="Opcional: aplica pausas (uso local com o catálogo completo).")
    parser.add_argument("--site", default="_site")
    parser.add_argument("--versao", default="")
    args = parser.parse_args()

    site = Path(args.site)
    PRODUTOS = carregar_catalogo(Path(args.catalogo), Path(args.controle) if args.controle else None)
    if not PRODUTOS:
        raise SystemExit("Catálogo sem produtos publicados; páginas de SEO não geradas.")
    pg = Pagina(args.versao)
    urls: list[str] = [""]

    filamentos = [p for p in ordem_padrao(PRODUTOS) if p["_secao"] == "filamentos"]
    acessorios = [p for p in ordem_padrao(PRODUTOS) if p["_secao"] == "acessorios"]

    for p in PRODUTOS:
        urls.append(pagina_produto(pg, p, site))

    materiais_com_produto = []
    for material in MATERIAIS_FILAMENTO:
        lista = [p for p in filamentos if str(p.get("material") or "").upper() == material]
        curto, longo = GUIA_MATERIAIS[material]
        marcas = sorted({p.get("marca") for p in lista}, key=normalizar)
        intro = f"{longo} No catálogo 3ZK: {', '.join(marcas)}." if marcas else longo
        url = f"filamentos/{slugificar(material)}/"
        if pagina_lista(
            pg, site, url=url,
            titulo=f"Filamento {material} para Impressão 3D | Cores e Preços | 3ZK",
            h1=f"Filamento {material} para impressão 3D",
            descricao=f"Filamento {material} para impressão 3D: {len(lista)} produtos com fotos das cores, preço e disponibilidade no catálogo 3ZK, com vendas em Curitiba.",
            intro=intro, trilha=[("Início", ""), ("Filamentos", "filamentos/"), (material, None)],
            produtos=lista, titulo_lista=f"Filamentos {material} disponíveis",
        ):
            urls.append(url)
            materiais_com_produto.append((material, len(lista)))

    cards_mat = link_cards([
        (f"Filamento {m}", f"{slugificar(m)}/", f"{GUIA_MATERIAIS[m][0]} {n} {'produto' if n == 1 else 'produtos'}.")
        for m, n in materiais_com_produto
    ])
    pagina_lista(
        pg, site, url="filamentos/",
        titulo="Filamentos para Impressão 3D | PLA, PETG, ABS, ASA e TPU | 3ZK",
        h1="Filamentos para impressão 3D",
        descricao="Filamentos PLA, PETG, ABS, ASA, TPU e TPR para impressão 3D, com fotos reais das cores, preço e disponibilidade no catálogo 3ZK.",
        intro="Compare materiais, marcas e cores. Cada cor tem foto e disponibilidade atualizada várias vezes ao dia.",
        trilha=[("Início", ""), ("Filamentos", None)], produtos=filamentos,
        extra_html=f'<section class="seo-section"><h2>Escolha pelo material</h2>{cards_mat}</section>\n', titulo_lista="Todos os filamentos",
    )
    urls.append("filamentos/")

    if pagina_lista(
        pg, site, url="acessorios/",
        titulo="Acessórios para Impressão 3D | Ferramentas, Colas e Resina UV | 3ZK",
        h1="Acessórios para impressão 3D",
        descricao="Acessórios para impressão 3D no catálogo 3ZK: ferramentas, colas, resina UV, luminárias, chaveiros e mais, com preço e disponibilidade.",
        intro="Ferramentas, colas, resina UV, iluminação e outros itens para o dia a dia da impressão 3D.",
        trilha=[("Início", ""), ("Acessórios", None)], produtos=acessorios,
    ):
        urls.append("acessorios/")

    marcas: dict[str, list[dict]] = {}
    for p in filamentos:
        marcas.setdefault(p.get("marca"), []).append(p)
    cards_marcas = []
    for marca, lista in sorted(marcas.items(), key=lambda kv: normalizar(kv[0])):
        url = f"marcas/{slugificar(marca)}/"
        mats = sorted({p.get("material") for p in lista}, key=lambda m: MATERIAIS_FILAMENTO.index(m) if m in MATERIAIS_FILAMENTO else 99)
        pagina_lista(
            pg, site, url=url,
            titulo=f"Filamentos {marca} para Impressão 3D | 3ZK",
            h1=f"Filamentos {marca}",
            descricao=f"Filamentos {marca} ({', '.join(mats)}) no catálogo 3ZK: cores com foto, preço e disponibilidade atualizada.",
            intro=f"Produtos {marca} com estoque no catálogo 3ZK: {', '.join(mats)}.",
            trilha=[("Início", ""), ("Marcas", "marcas/"), (marca, None)], produtos=lista,
        )
        urls.append(url)
        cards_marcas.append((marca, f"{slugificar(marca)}/", f"{', '.join(mats)} · {len(lista)} {'produto' if len(lista) == 1 else 'produtos'}"))
    pagina_lista(
        pg, site, url="marcas/",
        titulo="Marcas de Filamento para Impressão 3D | 3ZK",
        h1="Marcas de filamento",
        descricao="Marcas de filamento para impressão 3D no catálogo 3ZK: " + ", ".join(m for m, _, _ in cards_marcas) + ".",
        intro="Escolha a marca para ver os filamentos disponíveis.",
        trilha=[("Início", ""), ("Marcas", None)], produtos=[],
        extra_html=f'<section class="seo-section">{link_cards(cards_marcas)}</section>\n',
    )
    urls.append("marcas/")

    # Guia de materiais
    raiz = "../"
    secoes = ""
    for material in MATERIAIS_FILAMENTO:
        curto, longo = GUIA_MATERIAIS[material]
        tem = any(m == material for m, _ in materiais_com_produto)
        link = f'<div class="seo-content-links"><a href="{raiz}filamentos/{slugificar(material)}/">Ver filamentos {material}</a></div>' if tem else ""
        secoes += f'<section class="seo-content-block"><h2>{material}: {e(curto.rstrip(".").lower())}</h2><p>{e(longo)}</p>{link}</section>\n'
    corpo = breadcrumb_html(raiz, [("Início", ""), ("Guia de materiais", None)])
    corpo += '<section class="seo-page-hero"><h1>Guia de filamentos para impressão 3D</h1><p>Um resumo direto dos materiais presentes no catálogo 3ZK. As características podem variar entre fabricantes, linhas e configurações de impressão. Em caso de dúvida, fale com a equipe pelo WhatsApp.</p></section>\n' + secoes
    escrever(site / "guia-de-materiais/index.html", pg.cabecalho(
        raiz=raiz, titulo="Guia de Filamentos para Impressão 3D: PLA, PETG, ABS, ASA e TPU | 3ZK",
        descricao="Guia rápido para escolher filamento de impressão 3D: diferenças entre PLA, PETG, ABS, ASA, TPU e TPR e quando usar cada um.",
        canonical=BASE_URL + "guia-de-materiais/", imagem=BASE_URL + "assets/social/catalogo-3zk.jpg",
        jsonld=[ORGANIZACAO_LD, breadcrumb_ld([("Início", ""), ("Guia de materiais", "guia-de-materiais/")])],
    ) + corpo + pg.rodape(raiz=raiz))
    urls.append("guia-de-materiais/")

    # Sobre
    corpo = breadcrumb_html(raiz, [("Início", ""), ("Sobre a 3ZK", None)])
    corpo += f"""<section class="seo-page-hero"><h1>Sobre a 3ZK Filamentos</h1><p>A 3ZK Filamentos trabalha com materiais para impressão 3D e faz vendas locais em Curitiba. No catálogo, cada cor aparece com foto real e disponibilidade atualizada, para você escolher com mais confiança.</p></section>
<section class="seo-content-block"><h2>Filamentos e acessórios</h2><p>Filamentos PLA, PETG, ABS, ASA, TPU e TPR de marcas como Masterprint, Closin, Flashforge, Multifila e PolyFlow, além de acessórios para o dia a dia da impressão 3D: ferramentas, colas, resina UV e luminária de cura.</p><div class="seo-content-links"><a href="{raiz}filamentos/">Ver filamentos</a><a href="{raiz}acessorios/">Ver acessórios</a></div></section>
<section class="seo-content-block"><h2>Pedido pelo WhatsApp</h2><p>Escolha os produtos, monte o pedido no catálogo e envie pelo WhatsApp. A equipe confirma estoque e valores e combina a retirada ou a entrega em Curitiba e região. Pagamento com 5% de desconto no Pix ou dinheiro, ou em até 3x sem juros no cartão.</p><div class="seo-content-links"><a href="{raiz}">Abrir catálogo</a><a href="{WHATSAPP}" target="_blank" rel="noopener">Falar no WhatsApp</a></div></section>
<section class="seo-content-block"><h2>Manutenção de impressoras 3D</h2><p>Impressora parada, entupindo ou imprimindo com falha? Conte o que aconteceu: a equipe da 3ZK analisa as informações e entra em contato para orientar os próximos passos.</p><div class="seo-content-links"><a href="https://forms.gle/VcvL8WY9HG8YU87f6" target="_blank" rel="noopener">Descrever o problema</a></div></section>
<section class="seo-content-block"><h2>Compras fora de Curitiba</h2><p>A loja online da 3ZK tem vendas para todo o Brasil.</p><div class="seo-content-links"><a href="{LOJA_ONLINE}" target="_blank" rel="noopener">Acessar 3zkfilamentos.com.br</a></div></section>
"""
    escrever(site / "sobre/index.html", pg.cabecalho(
        raiz=raiz, titulo="Sobre a 3ZK Filamentos | Filamentos 3D em Curitiba",
        descricao="A 3ZK Filamentos vende filamentos e acessórios para impressão 3D em Curitiba, com pedido pelo WhatsApp e manutenção de impressoras 3D.",
        canonical=BASE_URL + "sobre/", imagem=BASE_URL + "assets/social/catalogo-3zk.jpg",
        jsonld=[ORGANIZACAO_LD, breadcrumb_ld([("Início", ""), ("Sobre a 3ZK", "sobre/")])],
    ) + corpo + pg.rodape(raiz=raiz))
    urls.append("sobre/")

    # 404 (na raiz: caminhos absolutos, pois pode ser servido em qualquer URL)
    corpo = '<section class="seo-page-hero"><h1>Página não encontrada</h1><p>O endereço pode ter mudado ou o produto saiu do catálogo. Veja os produtos disponíveis:</p></section>\n'
    corpo += f'<section class="seo-section">{link_cards([("Catálogo completo", "/", "Todos os produtos com estoque"), ("Filamentos", "/filamentos/", "PLA, PETG, ABS, ASA, TPU e TPR"), ("Acessórios", "/acessorios/", "Ferramentas, colas, resina UV e mais")])}</section>\n'
    escrever(site / "404.html", pg.cabecalho(
        raiz="/", titulo="Página não encontrada | 3ZK", descricao="Página não encontrada no catálogo 3ZK.",
        canonical=BASE_URL, imagem=BASE_URL + "assets/social/catalogo-3zk.jpg", jsonld=[], indexavel=False,
    ) + corpo + pg.rodape(raiz="/"))

    pre_renderizar_home(site)

    urls = list(dict.fromkeys(urls))
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sitemap += [f"  <url><loc>{BASE_URL}{u}</loc></url>" for u in urls]
    sitemap.append("</urlset>")
    (site / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")

    print(f"SEO: {len(PRODUTOS)} produtos, {len(urls)} URLs no sitemap.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
