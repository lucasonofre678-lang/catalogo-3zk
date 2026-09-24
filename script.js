/* ============================================================
   3ZK — CATÁLOGO (visual V4)
   Dados: dados/produtos.json + dados/controle-catalogo.json.
   Preço, estoque, pausas, carrinho e mensagem do WhatsApp seguem
   as regras oficiais do catálogo; o visual segue o padrão V4.
   ============================================================ */
(() => {
  "use strict";

  /* ============================================================
     CONFIGURAÇÕES QUE VOCÊ PODE ALTERAR
     ============================================================ */

  // TROQUE O NÚMERO ABAIXO SOMENTE SE O WHATSAPP DA LOJA MUDAR.
  const WHATSAPP_NUMERO = "554184539430";

  // LINK PADRÃO DA LOJA ONLINE (usado quando o produto não tem linkLoja).
  const LINK_LOJA_PADRAO = "https://3zkfilamentos.com.br/";

  /*
    Cada publicação troca o parâmetro ?v= do script.js pelo identificador
    do commit publicado. O mesmo identificador é usado nas requisições do
    catálogo, impedindo que o navegador reaproveite um JSON de outra versão.
  */
  const VERSAO_PUBLICACAO_3ZK = (() => {
    try {
      const urlScript = new URL(document.currentScript?.src || "", window.location.href);
      return urlScript.searchParams.get("v") || Date.now().toString(36);
    } catch (erro) {
      return Date.now().toString(36);
    }
  })();

  function obterUrlSemCache3ZK(caminho) {
    const url = new URL(caminho, window.location.href);
    url.searchParams.set("v", VERSAO_PUBLICACAO_3ZK);
    return url.href;
  }

  /* ============================================================
     ESTADO
     ============================================================ */
  let produtos = [];
  let controleCatalogo = { versao: 1, produtosPausados: [], coresPausadas: [] };

  const MATERIAIS_FILAMENTO = ["PLA", "PETG", "ABS", "ASA", "TPU", "TPR"];
  const MATERIAIS_FILTRO = [...MATERIAIS_FILAMENTO, "Resina"];
  const CATEGORIAS_BARRA = ["Todos", "PLA", "PETG", "ABS", "ASA", "TPU", "Acessórios"];

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = () => (reducedMotion() ? "auto" : "smooth");
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const state = {
    carregado: false,
    category: "Todos", query: "",
    materials: new Set(), brands: new Set(), colors: new Set(), finishes: new Set(),
    sort: "relevance", selected: new Map(),
    modal: null, modalVariant: 0, modalImage: 0, modalQty: 1, lastFocus: null, urlAntesDoProduto: null,
    zoomOpen: false, zoomScale: 1, zoomX: 0, zoomY: 0, zoomDragging: false, zoomMoved: false, zoomStartX: 0, zoomStartY: 0,
    swipe: null, swipeSuppressClickUntil: 0,
    openGroups: { materials: true, colors: true, brands: false, finishes: false },
    reviewStep: 2
  };

  const els = {
    grid: $("#productGrid"), resultCount: $("#resultCount"), resultLabel: $("#resultLabel"), catalogTitle: $("#catalog-title"), activeFilters: $("#activeFilters"), empty: $("#emptyState"), emptyTitle: $("#emptyTitle"), emptyText: $("#emptyText"), emptyAction: $("#emptyAction"),
    filterDesktop: $("#filtersDesktopContent"), filterMobile: $("#filtersMobileContent"), filterCount: $("#mobileFilterCount"), filterApplyCount: $("#filterApplyCount"), filterApplyLabel: $("#filterApplyLabel"), sidebarClear: $("#sidebarClear"), sort: $("#sortSelect"),
    search: $("#searchInput"), searchM: $("#searchInputMobile"), clear: $("#searchClear"), clearM: $("#searchClearMobile"), suggestions: $("#searchSuggestions"),
    backdrop: $("#drawerBackdrop"), filterDrawer: $("#filterDrawer"), cartDrawer: $("#cartDrawer"), cartItems: $("#cartItems"), cartOpen: $("#cartOpen"), cartCount: $("#cartCount"), cartTotal: $("#cartTotal"), cartPix: $("#cartPix"), cartSub: $("#cartSub"), cartClear: $("#cartClear"), cartContinue: $("#cartContinue"),
    mobileBottomCount: $("#mobileBottomCartCount"), mobileNavCatalog: $("#mobileNavCatalog"), mobileNavSearch: $("#mobileNavSearch"), mobileNavCart: $("#mobileNavCart"), swipeCartHint: $("#swipeCartHint"), swipeCatalogHint: $("#swipeCatalogHint"),
    modalBackdrop: $("#modalBackdrop"), modal: $("#productModal"), modalClose: $("#modalClose"), modalShare: $("#modalShare"), modalImage: $("#modalImage"), modalImageZoom: $("#modalImageZoom"), modalImageThumbs: $("#modalImageThumbs"), modalPrevImage: $("#modalPrevImage"), modalNextImage: $("#modalNextImage"), modalKicker: $("#modalKicker"), modalTitle: $("#modalTitle"), modalVariantName: $("#modalVariantName"), modalPrice: $("#modalPrice"), modalStock: $("#modalStock"), modalObs: $("#modalObs"), modalVariants: $("#modalVariants"), modalVariantLabel: $("#modalVariantLabel"), modalVariantCount: $("#modalVariantCount"), modalVariantPos: $("#modalVariantPos"), modalPrevVariant: $("#modalPrevVariant"), modalNextVariant: $("#modalNextVariant"), modalQty: $("#modalQty"), modalAdd: $("#modalAdd"), modalPageLink: $("#modalPageLink"), modalStoreLink: $("#modalStoreLink"),
    zoomBackdrop: $("#zoomBackdrop"), zoomModal: $("#zoomModal"), zoomImage: $("#zoomImage"), zoomImageWrap: $("#zoomImageWrap"), zoomStage: $("#zoomStage"), zoomClose: $("#zoomClose"), zoomPrev: $("#zoomPrev"), zoomNext: $("#zoomNext"), zoomIn: $("#zoomIn"), zoomOut: $("#zoomOut"), zoomReset: $("#zoomReset"), zoomPhotos: $("#zoomPhotos"), zoomKicker: $("#zoomKicker"), zoomTitle: $("#zoomTitle"), zoomVariantBadge: $("#zoomVariantBadge"), zoomSwatch: $("#zoomSwatch"), zoomVariantKind: $("#zoomVariantKind"), zoomVariantName: $("#zoomVariantName"), zoomStock: $("#zoomStock"), zoomPriceBlock: $("#zoomPriceBlock"), zoomVariantLabel: $("#zoomVariantLabel"), zoomVariantCount: $("#zoomVariantCount"), zoomVariantStrip: $("#zoomVariantStrip"), zoomQty: $("#zoomQty"), zoomQtyMinus: $("#zoomQtyMinus"), zoomQtyPlus: $("#zoomQtyPlus"), zoomAdd: $("#zoomAdd"),
    review: $("#reviewBackdrop"), reviewModal: $("#reviewModal"), reviewEyebrow: $("#reviewEyebrow"), reviewTitle: $("#reviewTitle"), reviewItems: $("#reviewItems"), reviewData: $("#reviewData"), reviewLines: $("#reviewLines"), reviewTotal: $("#reviewTotal"), reviewTotalLabel: $("#reviewTotalLabel"), reviewCode: $("#reviewCode"), reviewBack: $("#reviewBack"), reviewNext: $("#reviewNext"), reviewCopy: $("#reviewCopy"),
    orderForm: $("#orderForm"), orderNote: $("#orderNote"), orderNoteCount: $("#orderNoteCount"), orderPhone: $("#orderPhone"),
    maintenance: $("#maintenanceBackdrop"), maintenanceModal: $("#manutencao"), maintenanceClose: $("#maintenanceClose"), contactMenu: $("#contactMenu"),
    seoDirectory: $("#seoDirectory"),
    toast: $("#toast"), toastMsg: $("#toastMsg"), toastAction: $("#toastAction")
  };

  /* ============================================================
     TEXTO, FORMATOS E SLUGS
     ============================================================ */
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  // Formato usado na mensagem oficial do pedido (sem centavos em valores inteiros).
  const formatarPreco = (valor) => {
    const numero = Number(valor) || 0;
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
      maximumFractionDigits: 2
    });
  };

  function normalizar(texto = "") {
    return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function slugificar(texto = "") {
    return normalizar(texto).replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function esc(valor = "") {
    return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  /* ============================================================
     BUSCA INTELIGENTE DE CORES
     Expande nomes equivalentes (ex.: bege -> Skin/pele) e tolera
     pequenos erros de digitação sem alterar os dados do catálogo.
     ============================================================ */
  const STOPWORDS_BUSCA = new Set(["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "com", "cor", "cores", "tom", "tons"]);

  const FAMILIAS_COR_BUSCA = [
    { id: "verde", rotulo: "verde", aliases: ["verde", "green", "greenery", "esverdeado", "oliva", "olive", "menta", "mint", "limao", "lime", "floresta", "forest", "sea green", "honeydew"] },
    { id: "azul", rotulo: "azul", aliases: ["azul", "blue", "ciano", "cyan", "turquesa", "turquoise", "marinho", "navy", "celeste", "oceano", "ocean"] },
    { id: "vermelho", rotulo: "vermelho", aliases: ["vermelho", "red", "vinho", "wine", "bordo", "bordô"] },
    { id: "rosa", rotulo: "rosa", aliases: ["rosa", "pink", "magenta", "fuchsia", "fucsia"] },
    { id: "roxo", rotulo: "roxo", aliases: ["roxo", "purple", "violeta", "violet", "lavanda", "lavender", "lilas", "lilac"] },
    { id: "amarelo", rotulo: "amarelo", aliases: ["amarelo", "yellow", "manga", "mango", "mel", "honey"] },
    { id: "laranja", rotulo: "laranja", aliases: ["laranja", "orange", "tangerina", "tangerine"] },
    { id: "preto", rotulo: "preto", aliases: ["preto", "black", "midnight"] },
    { id: "branco", rotulo: "branco", aliases: ["branco", "white", "marfim", "ivory"] },
    { id: "cinza", rotulo: "cinza", aliases: ["cinza", "gray", "grey", "grafite", "graphite"] },
    { id: "marrom", rotulo: "marrom", aliases: ["marrom", "brown", "cafe", "café", "chocolate", "madeira", "wood"] },
    { id: "bege", rotulo: "bege / pele", aliases: ["bege", "beige", "skin", "cor da pele", "pele", "nude", "areia", "sand", "creme"] },
    { id: "dourado", rotulo: "dourado", aliases: ["dourado", "gold", "ouro"] },
    { id: "prata", rotulo: "prata", aliases: ["prata", "silver"] },
    { id: "cobre", rotulo: "cobre", aliases: ["cobre", "copper", "bronze"] },
    { id: "transparente", rotulo: "transparente", aliases: ["transparente", "transparent", "translucido", "translúcido", "translucent", "cristal", "crystal"] }
  ].map((familia) => ({ ...familia, aliasesNormalizados: familia.aliases.map((alias) => normalizar(alias)) }));

  function normalizarBusca(texto = "") {
    return normalizar(texto).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function distanciaEdicaoAte(textoA, textoB, limite = 2) {
    const a = String(textoA || "");
    const b = String(textoB || "");
    if (Math.abs(a.length - b.length) > limite) return limite + 1;
    if (a === b) return 0;
    let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      const atual = [i];
      let menorLinha = atual[0];
      for (let j = 1; j <= b.length; j += 1) {
        const custo = a[i - 1] === b[j - 1] ? 0 : 1;
        const valor = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
        atual[j] = valor;
        menorLinha = Math.min(menorLinha, valor);
      }
      if (menorLinha > limite) return limite + 1;
      anterior = atual;
    }
    return anterior[b.length];
  }

  function tokenCombinaComTexto(texto, token) {
    const textoNormalizado = normalizarBusca(texto);
    const tokenNormalizado = normalizarBusca(token);
    if (!tokenNormalizado) return true;
    if (textoNormalizado.includes(tokenNormalizado)) return true;
    if (tokenNormalizado.length < 4) return false;
    const limite = tokenNormalizado.length >= 7 ? 2 : 1;
    return textoNormalizado.split(" ").some((palavra) => palavra.length >= 3 && distanciaEdicaoAte(palavra, tokenNormalizado, limite) <= limite);
  }

  function textoContemFraseBusca(texto = "", frase = "") {
    const textoNormalizado = ` ${normalizarBusca(texto)} `;
    const fraseNormalizada = normalizarBusca(frase);
    if (!fraseNormalizada) return false;
    return textoNormalizado.includes(` ${fraseNormalizada} `);
  }

  function obterFamiliasDoTexto(texto = "") {
    const normalizado = normalizarBusca(texto);
    const familias = new Set();
    FAMILIAS_COR_BUSCA.forEach((familia) => {
      if (familia.aliasesNormalizados.some((alias) => textoContemFraseBusca(normalizado, alias))) familias.add(familia.id);
    });
    return familias;
  }

  function criarConsultaBusca(termo = "") {
    const normalizado = normalizarBusca(termo);
    const tokens = normalizado.split(" ").filter(Boolean).filter((token) => !STOPWORDS_BUSCA.has(token));
    return { original: String(termo || "").trim(), normalizado, tokens, familias: obterFamiliasDoTexto(normalizado) };
  }

  function obterFamiliasCor(cor) {
    return obterFamiliasDoTexto(cor?.nome || "");
  }

  function pontuarCorNaBusca(cor, consulta) {
    if (!consulta?.normalizado) return 0;
    const nome = normalizarBusca(cor?.nome || "");
    const familiasCor = obterFamiliasCor(cor);
    if (consulta.familias.size && ![...consulta.familias].some((familia) => familiasCor.has(familia))) return 0;
    let pontos = 0;
    if (nome === consulta.normalizado) pontos += 160;
    else if (nome.startsWith(consulta.normalizado)) pontos += 120;
    else if (nome.includes(consulta.normalizado)) pontos += 95;
    consulta.familias.forEach((familia) => { if (familiasCor.has(familia)) pontos += 70; });
    consulta.tokens.forEach((token) => { if (tokenCombinaComTexto(nome, token)) pontos += 22; });
    return pontos;
  }

  function corCorrespondeConsulta(cor, consulta) {
    if (!consulta?.normalizado) return true;
    const nome = normalizarBusca(cor?.nome || "");
    const familiasCor = obterFamiliasCor(cor);
    return consulta.tokens.every((token) => {
      const familiasDoToken = obterFamiliasDoTexto(token);
      if (familiasDoToken.size) return [...familiasDoToken].some((familia) => familiasCor.has(familia));
      return tokenCombinaComTexto(nome, token);
    });
  }

  /* ============================================================
     VISUAL DA COR (amostras do pedido e do visualizador)
     ============================================================ */
  const VISUAL_COR_EXATO = {
    "natural transparente": { css: "#EEF0EF", hexBase: "#EEF0EF" },
    "transparente": { css: "#DEDFDE", hexBase: "#DEDFDE" },
    "translucent": { css: "#D9DDD8", hexBase: "#D9DDD8" },
    "natural": { css: "#E2E1DB", hexBase: "#E2E1DB" },
    "lavanda": { css: "#B49BC8", hexBase: "#B49BC8" },
    "verde escuro": { css: "#365447", hexBase: "#365447" },
    "honeydew / verde melao": { css: "#A7D0B8", hexBase: "#A7D0B8" },
    "sea green / verde mar azulado": { css: "#63A79B", hexBase: "#63A79B" },
    "azul esverdeado": { css: "#65C2D2", hexBase: "#65C2D2" },
    "cool gray / cinza azulado": { css: "#8F9EAA", hexBase: "#8F9EAA" },
    "light coral / rosa-alaranjado claro": { css: "#E07A68", hexBase: "#E07A68" },
    "tangerina": { css: "#E95E2E", hexBase: "#E95E2E" },
    "wood": { css: "#9B7651", hexBase: "#9B7651" },
    "madeira": { css: "#8E7957", hexBase: "#8E7957" },
    "marmorizado": { css: "linear-gradient(135deg, #E2E0DA 0%, #BFC0BC 48%, #EBE8E1 100%)", hexBase: "#D8D6D0" },
    "marmore": { css: "linear-gradient(135deg, #E0DDD6 0%, #C8C5BD 48%, #F0EEE9 100%)", hexBase: "#D7D3CB" },
    "rainbow": { css: "linear-gradient(135deg, #E4868E 0%, #E9B46B 27%, #78C78B 53%, #6EA0D8 76%, #B98BD4 100%)", hexBase: "#D98A92" },
    "silk rainbow": { css: "linear-gradient(135deg, #E98A9C 0%, #F0C468 25%, #79CC93 52%, #6FA2E2 77%, #BE92DB 100%)", hexBase: "#DE8D97" },
    "fosforescente natural/rainbow": { css: "linear-gradient(135deg, #ECE9DC 0%, #A8DAF6 25%, #B6E2A9 50%, #F2C26E 75%, #D3B0EB 100%)", hexBase: "#ECE9DC" },
    "fosforescente natural/azul": { css: "linear-gradient(135deg, #ECE9DD 0%, #8EC3EA 100%)", hexBase: "#ECE9DD" },
    "fosforescente natural/verde": { css: "linear-gradient(135deg, #ECE9DD 0%, #A8D49C 100%)", hexBase: "#ECE9DD" },
    "silk vermelho purpura": { css: "linear-gradient(135deg, #D94D54 0%, #B54B94 100%)", hexBase: "#D05B7D" },
    "dreamy crystal preto/vermelho": { css: "linear-gradient(135deg, #1F2228 0%, #B84A52 100%)", hexBase: "#6D444A" },
    "transparente preto/azul com glitter": { css: "linear-gradient(135deg, #18202A 0%, #356EA8 100%)", hexBase: "#243F67" }
  };

  const PALETA_TOKEN_COR = {
    preto: "#171B22", black: "#171B22", branco: "#E8E8E2", white: "#E8E8E2", natural: "#E6E7E2", transparente: "#E2E4E2", translucido: "#E1E3E2", translucent: "#E1E3E2",
    cinza: "#8B9096", gray: "#8B9096", grey: "#8B9096", prata: "#B3B8BE", silver: "#B3B8BE", dourado: "#C99A3E", gold: "#C99A3E", bronze: "#8D744A", champagne: "#D5B77B",
    cobre: "#B87343", marrom: "#6B4B33", brown: "#6B4B33", cafe: "#6C4F44", madeira: "#8E7957", wood: "#9B7651", pele: "#C79A7D", skin: "#C79A7D", bege: "#D6C3A1", beige: "#D6C3A1",
    creme: "#E4D6B8", amendoa: "#90749E", amarelo: "#E2C53E", yellow: "#E2C53E", manga: "#F1B82F", abacaxi: "#C9AE39", mel: "#D4A34E", limao: "#C7D64A",
    laranja: "#D97A39", orange: "#D97A39", tangerina: "#E95E2E", coral: "#D56F5C", vermelho: "#C94843", red: "#C94843", rosa: "#D96A96", pink: "#D96A96", fuchsia: "#C55C92",
    roxo: "#8253A1", purple: "#8253A1", violeta: "#7E5AC7", purpura: "#B14C8D", lavanda: "#B49BC8", lavender: "#C7B8E8", azul: "#4A7FCF", blue: "#4A7FCF", ciano: "#0B89DC",
    azure: "#3A8CA3", safira: "#4F8FD4", oceano: "#4C98B5", ocean: "#4C98B5", peacock: "#466F78", ceu: "#5AAFCB", verde: "#59A06A", green: "#59A06A", floresta: "#315B42",
    forest: "#315B42", menta: "#8FC9A8", mint: "#8FC9A8", melao: "#A7D0B8", mar: "#5AA8A0", sea: "#5AA8A0", oliva: "#79814E", olive: "#79814E", esverdeado: "#83A064", greenery: "#83A064"
  };

  const TOKENS_IGNORADOS_COR = new Set(["silk", "dual", "duo", "color", "tricolor", "termo", "com", "glitter", "fosforescente", "fosco", "new", "master", "pcv", "outdoor", "dark", "cool", "light", "hot", "space", "dreamy", "crystal"]);

  function hexParaRgb(hex) {
    const valor = String(hex || "").trim().replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(valor)) return { r: 204, g: 204, b: 204 };
    return { r: parseInt(valor.slice(0, 2), 16), g: parseInt(valor.slice(2, 4), 16), b: parseInt(valor.slice(4, 6), 16) };
  }

  function misturarCores(hexA, hexB, fator = 0.5) {
    const a = hexParaRgb(hexA), b = hexParaRgb(hexB);
    const canal = (x, y) => Math.round(x + (y - x) * fator).toString(16).padStart(2, "0");
    return `#${canal(a.r, b.r)}${canal(a.g, b.g)}${canal(a.b, b.b)}`;
  }

  function montarGradienteVisual(cores) {
    const lista = [...new Set(cores.filter(Boolean))];
    if (lista.length <= 1) return lista[0] || "#cccccc";
    if (lista.length === 2) return `linear-gradient(135deg, ${lista[0]} 0 48%, ${lista[1]} 52% 100%)`;
    const passo = 100 / lista.length;
    return `conic-gradient(from 220deg, ${lista.map((cor, i) => `${cor} ${Math.round(i * passo)}% ${Math.round((i + 1) * passo)}%`).join(", ")})`;
  }

  function obterCoresDoNome(nome) {
    const tokens = normalizar(nome).replace(/[^a-z0-9/]+/g, " ").split(/[\s/]+/).map((t) => t.trim()).filter(Boolean).filter((t) => !TOKENS_IGNORADOS_COR.has(t));
    return [...new Set(tokens.map((t) => PALETA_TOKEN_COR[t]).filter(Boolean))];
  }

  function nomeIndicaMulticor(nome) {
    const valor = normalizar(nome);
    return /\S\/\S/.test(String(nome || "")) || ["dual", "duo", "tricolor", "rainbow", "macaron", " e ", "termo"].some((trecho) => valor.includes(trecho));
  }

  function obterVisualCatalogoCor(cor) {
    const nomeNormalizado = normalizar(cor?.nome || "");
    const hexOriginal = cor?.hex || "#D9DFE8";
    if (VISUAL_COR_EXATO[nomeNormalizado]) return VISUAL_COR_EXATO[nomeNormalizado];
    if (cor?.gradiente) return { css: cor.gradiente, hexBase: hexOriginal };
    if ((cor?.efeito || "") === "glass") {
      const claro = misturarCores(hexOriginal, "#FFFFFF", 0.42);
      return { css: `linear-gradient(135deg, ${claro} 0%, ${hexOriginal} 100%)`, hexBase: claro };
    }
    const coresDoNome = obterCoresDoNome(cor?.nome || "");
    if (coresDoNome.length >= 2 && nomeIndicaMulticor(cor?.nome || "")) return { css: montarGradienteVisual(coresDoNome), hexBase: coresDoNome[0] };
    if (coresDoNome.length === 1) return { css: coresDoNome[0], hexBase: coresDoNome[0] };
    return { css: hexOriginal, hexBase: hexOriginal };
  }

  const obterCorVisual = (cor) => obterVisualCatalogoCor(cor).css;
  const obterHexBaseVisual = (cor) => obterVisualCatalogoCor(cor).hexBase;

  /* ============================================================
     ORDEM DE EXIBIÇÃO DAS CORES POR FAMÍLIA
     Só reordena a lista exibida: nome, preço, estoque, fotos e IDs
     de cada variação continuam exatamente como vieram do JSON.
     Espelhado em automacao/gerar_paginas_seo.py (familia_cor).
     ============================================================ */
  const FAMILIAS_ORDEM_COR = [
    // [família, palavras que decidem sozinhas, palavras que só decidem se nada mais casar]
    [1, ["branco", "branca", "white", "natural", "skin", "pele", "bege", "beige", "creme", "marfim", "ivory", "perola"], ["cream"]],
    [2, ["amarelo", "yellow", "dourado", "dourada", "gold", "ouro", "champagne"], ["limao", "lemon", "mel", "honey", "manga", "mango", "abacaxi", "pineapple", "canario"]],
    [3, ["laranja", "orange", "tangerina", "tangerine"], ["alaranjado", "melon"]],
    [4, ["vermelho", "red", "coral", "vinho", "wine", "bordo"], []],
    [5, ["rosa", "pink", "rose", "rosehip", "fuchsia", "fucsia"], ["strawberry", "dragon"]],
    [6, ["roxo", "purple", "violeta", "violet", "lavanda", "lavender", "lilas", "magenta", "purpura"], ["iris"]],
    [7, ["azul", "blue", "ciano", "cyan", "tiffany", "turquesa", "marinho", "navy"], ["midnight", "azulado", "ice"]],
    [8, ["verde", "green", "greenery", "mint", "menta", "honeydew", "oliva", "olive", "matcha"], ["esverdeado", "citrus"]],
    [9, ["marrom", "brown", "madeira", "wood", "sand", "areia", "cafe", "chocolate", "caramelo", "castanho", "deserto"], ["cobre", "copper", "bronze"]],
    [10, ["cinza", "gray", "grey", "prata", "prateado", "silver", "aco", "cromado"], ["marmore", "marble", "marmorizado"]],
    [11, ["preto", "preta", "black", "carbono"], []]
  ].map(([familia, fortes, fracas]) => ({ familia, fortes: new Set(fortes), fracas: new Set(fracas) }));

  const FAMILIA_TRANSLUCIDA = 12, FAMILIA_MULTICOR = 13, FAMILIA_OUTROS = 14;
  const TERMOS_TRANSLUCIDO = /\b(translucido|transparente|translucent|crystal|cristal|glass)\b/;
  const TERMOS_MULTICOR = /\b(rainbow|arco iris|macaron|colors|candy|lollipop|ice cream|dual|duo|tricolor|termo)\b/;

  function familiaPorPalavras(palavras) {
    for (const tipo of ["fortes", "fracas"]) {
      for (const palavra of palavras) {
        const encontrada = FAMILIAS_ORDEM_COR.find((f) => f[tipo].has(palavra));
        if (encontrada) return encontrada.familia;
      }
    }
    return 0;
  }

  // Família visual (1–14) usada apenas para ordenar a exibição.
  function getColorFamily(nome, efeito = "") {
    const bruto = String(nome || "");
    const texto = normalizarBusca(bruto);
    if (efeito === "glass" || TERMOS_TRANSLUCIDO.test(texto)) return FAMILIA_TRANSLUCIDA;
    if (TERMOS_MULTICOR.test(texto)) return FAMILIA_MULTICOR;
    // "Silk Azul/Roxo" (barra sem espaços) mistura cores; "Red / Vermelho" é só nome bilíngue.
    const partes = bruto.replace(/\s+\/\s+/g, " ").split("/");
    if (partes.length > 1 && new Set(partes.map((parte) => familiaPorPalavras(normalizarBusca(parte).split(" ")))).size > 1) return FAMILIA_MULTICOR;
    return familiaPorPalavras(texto.split(" ")) || FAMILIA_OUTROS;
  }

  // Ordena por família e, dentro dela, pelo nome. Não altera os objetos da lista.
  function sortVariantsByColorFamily(variacoes) {
    return variacoes
      .map((cor, indice) => ({ cor, indice, familia: getColorFamily(cor?.nome, normalizar(cor?.efeito || "")) }))
      .sort((a, b) => a.familia - b.familia || String(a.cor?.nome || "").localeCompare(String(b.cor?.nome || ""), "pt-BR") || a.indice - b.indice)
      .map((item) => item.cor);
  }

  /* ============================================================
     CONTROLE MANUAL DO CATÁLOGO
     Produtos e cores podem ser pausados sem serem apagados.
     O arquivo dados/controle-catalogo.json é administrado pelo
     Painel Local 3ZK e tem prioridade sobre o estoque da Olist.
     ============================================================ */
  function obterIdCatalogoProduto(produto) {
    const idSalvo = String(produto?.idCatalogo || "").trim();
    if (idSalvo) return idSalvo;
    return [slugificar(produto?.marca || ""), slugificar(produto?.material || ""), slugificar(produto?.linha || "")].join("|");
  }

  function obterIdCatalogoCor(produto, cor) {
    const idSalvo = String(cor?.idCatalogo || "").trim();
    if (idSalvo) return idSalvo;
    return `${obterIdCatalogoProduto(produto)}|${slugificar(cor?.nome || "")}`;
  }

  function normalizarListaControle(valor) {
    if (!Array.isArray(valor)) return [];
    return [...new Set(valor.map((item) => String(item || "").trim()).filter(Boolean))];
  }

  function normalizarControleCatalogo(valor) {
    const controle = valor && typeof valor === "object" ? valor : {};
    return {
      versao: 1,
      atualizadoEm: controle.atualizadoEm || null,
      produtosPausados: normalizarListaControle(controle.produtosPausados),
      coresPausadas: normalizarListaControle(controle.coresPausadas)
    };
  }

  async function carregarControleCatalogo() {
    try {
      const resposta = await fetch(obterUrlSemCache3ZK("dados/controle-catalogo.json"), { cache: "no-store" });
      if (resposta.status === 404) return normalizarControleCatalogo({});
      if (!resposta.ok) throw new Error(`controle-catalogo.json respondeu ${resposta.status}`);
      return normalizarControleCatalogo(await resposta.json());
    } catch (erro) {
      /*
        Segurança operacional: uma falha no arquivo de controle não derruba
        o catálogo. O site continua usando somente o estoque da Olist.
      */
      console.warn("[3ZK] Controle manual indisponível. Catálogo mantido ativo.", erro);
      return normalizarControleCatalogo({});
    }
  }

  const produtoEstaPausado = (produto) => controleCatalogo.produtosPausados.includes(obterIdCatalogoProduto(produto));
  const corEstaPausada = (produto, cor) => controleCatalogo.coresPausadas.includes(obterIdCatalogoCor(produto, cor));

  function aplicarControleCatalogo(lista) {
    return lista
      .filter((produto) => !produtoEstaPausado(produto))
      .map((produto) => ({ ...produto, cores: produto.cores.filter((cor) => !corEstaPausada(produto, cor) && corEstaDisponivel(cor)) }))
      .filter((produto) => produto.cores.length > 0);
  }

  /* ============================================================
     REGRAS OFICIAIS DE PRODUTO, ESTOQUE E PREÇO
     ============================================================ */
  function obterNomeCompletoProduto(produto) {
    const partes = [produto.marca, produto.material];
    if (produto.linha) partes.push(produto.linha);
    return partes.join(" ");
  }

  const obterPastaProduto = (produto) => slugificar(obterNomeCompletoProduto(produto));

  /*
    Cada cor pode ter uma ou várias fotos.
    Exemplo no produtos.json:
    "imagens": ["assets/fotos/flashforge-pla/vermelho-coral.webp", "assets/fotos/flashforge-pla/vermelho-coral-2.webp"]
  */
  function obterFotosCor(produto, cor) {
    if (Array.isArray(cor.imagens) && cor.imagens.length > 0) {
      return [...new Set(cor.imagens.filter((caminho) => typeof caminho === "string" && caminho.trim()))];
    }
    if (cor.imagem) return [cor.imagem];
    return [`assets/fotos/${obterPastaProduto(produto)}/${slugificar(cor.nome)}.webp`];
  }

  function obterStatusEstoque(cor) {
    if (cor.disponivel === false || cor.statusEstoque === "sem_estoque") return "sem_estoque";
    if (cor.statusEstoque === "ultimas_unidades") return "ultimas_unidades";
    if (cor.statusEstoque === "em_estoque") return "em_estoque";
    /*
      Compatibilidade temporária com arquivos antigos que ainda tenham
      o número do estoque. O número nunca é mostrado ao cliente.
    */
    const estoque = Number(cor.estoque);
    if (Number.isFinite(estoque)) {
      if (estoque <= 0) return "sem_estoque";
      if (estoque <= 3) return "ultimas_unidades";
    }
    return "em_estoque";
  }

  const corEstaDisponivel = (cor) => obterStatusEstoque(cor) !== "sem_estoque";

  function stockLabel(cor) {
    const status = obterStatusEstoque(cor);
    if (status === "sem_estoque") return ["Sem estoque", "stock--out"];
    return status === "ultimas_unidades" ? ["Últimas unidades", "stock--low"] : ["Em estoque", "stock--ok"];
  }

  const obterTipoProduto = (produto) => produto.tipoProduto || "filamento";

  function obterPrecoProdutoOuVariacao(produto, cor) {
    const precoCor = Number(cor && cor.preco);
    if (Number.isFinite(precoCor) && precoCor > 0) return precoCor;
    return Number(produto.preco) || 0;
  }

  const obterLinkLoja = (produto) => produto.linkLoja || LINK_LOJA_PADRAO;

  function obterSecaoProduto(produto) {
    if (normalizar(produto?.secao) === "acessorios") return "acessorios";
    const tipo = normalizar(obterTipoProduto(produto));
    if (tipo && tipo !== "filamento") return "acessorios";
    return "filamentos";
  }

  function obterCategoriaProduto(produto) {
    const categoria = String(produto?.categoria || "").trim();
    if (categoria) return categoria;
    const texto = normalizarBusca([produto?.marca, produto?.material, produto?.linha, produto?.tipoProduto, produto?.idCatalogo].filter(Boolean).join(" "));
    if (texto.includes("etiqueta")) return "Etiquetas";
    return "Acessórios";
  }

  function obterNomeProdutoParaInterface(produto) {
    if (obterSecaoProduto(produto) !== "acessorios") return obterNomeCompletoProduto(produto);
    const partes = [produto.marca];
    const material = normalizar(produto.material);
    // Em acessórios o "material" costuma repetir a categoria (ex.: "Colas"); só entra no nome quando acrescenta informação.
    const redundante = material === "outras" || material === normalizar(produto.categoria) || partes.some((parte) => normalizar(parte).includes(material));
    if (produto.material && !redundante) partes.push(produto.material);
    if (produto.linha) partes.push(produto.linha);
    return partes.filter(Boolean).join(" ");
  }

  // Link direto: ?produto=flashforge-pla&cor=vermelho-coral
  const obterSlugProduto = (produto) => slugificar(obterNomeCompletoProduto(produto));
  const obterSlugCor = (cor) => slugificar(cor.nome);

  function obterDestaqueProduto(produto) {
    const marca = String(produto?.marca || "").trim().toLowerCase();
    const material = String(produto?.material || "").trim().toUpperCase();
    const linha = String(produto?.linha || "").trim().toLowerCase();
    if ((marca === "polyflow" && material === "PLA") || (marca === "masterprint" && material === "PETG" && linha === "5kg")) return { titulo: "Produto novo" };
    if ((marca === "masterprint" && material === "PETG") || (marca === "closin" && material === "PLA") || (marca === "multifila" && material === "PLA")) return { titulo: "Novas cores" };
    return null;
  }

  /* ---------- classificação para os filtros (derivada dos dados, sem alterá-los) ---------- */
  function obterMaterialFiltro(produto) {
    const material = String(produto.material || "").trim().toUpperCase();
    if (obterSecaoProduto(produto) === "filamentos" && MATERIAIS_FILAMENTO.includes(material)) return material;
    if (normalizarBusca(`${produto.marca} ${produto.linha || ""}`).includes("resina")) return "Resina";
    return null;
  }

  const GRUPO_POR_FAMILIA = {
    preto: "Preto", branco: "Branco", cinza: "Cinza", prata: "Cinza", azul: "Azul", verde: "Verde", vermelho: "Vermelho",
    amarelo: "Amarelo", dourado: "Amarelo", laranja: "Laranja", cobre: "Laranja", rosa: "Rosa", roxo: "Roxo",
    marrom: "Marrom / Bege", bege: "Marrom / Bege", transparente: "Transparente"
  };

  function familiasNaOrdem(texto) {
    const normalizado = ` ${normalizarBusca(texto)} `;
    return FAMILIAS_COR_BUSCA
      .map((familia) => ({ id: familia.id, pos: Math.min(...familia.aliasesNormalizados.map((alias) => { const i = normalizado.indexOf(` ${normalizarBusca(alias)} `); return i < 0 ? Infinity : i; })) }))
      .filter((item) => item.pos !== Infinity)
      .sort((a, b) => a.pos - b.pos)
      .map((item) => item.id);
  }

  function obterGrupoCor(cor) {
    const nome = String(cor?.nome || "");
    const n = normalizarBusca(nome);
    if (/\b(rainbow|arco iris|macaron|colors)\b/.test(n)) return "Multicor";
    const todas = familiasNaOrdem(nome);
    const grupos = [...new Set(todas.map((id) => GRUPO_POR_FAMILIA[id]).filter(Boolean))];
    if (grupos.length >= 2 && nomeIndicaMulticor(nome) && !/ \/ /.test(nome)) return "Multicor";
    // Nomes bilíngues ("Midnight / Azul Escuro"): a parte em português decide o grupo.
    const partes = nome.split(" / ");
    const preferida = partes.length > 1 ? familiasNaOrdem(partes[partes.length - 1]) : todas;
    const id = preferida[0] || todas[0];
    return (id && GRUPO_POR_FAMILIA[id]) || "Outros";
  }

  function obterAcabamento(produto, cor) {
    if (obterSecaoProduto(produto) !== "filamentos") return null;
    const efeito = normalizar(cor?.efeito || "");
    const t = ` ${normalizarBusca(`${produto.linha || ""} ${cor?.nome || ""}`)} `;
    const tem = (...palavras) => palavras.some((p) => t.includes(` ${p} `) || t.includes(` ${p}`));
    if (efeito === "silk" || tem("silk")) return "Silk";
    if (efeito === "marmorizado" || tem("marble", "marmore", "marmorizado")) return "Marble";
    if (efeito === "fosco" || tem("fosco", "matte")) return "Fosco / Matte";
    if (efeito === "glass" || tem("translucido", "transparente", "glass", "cristal", "crystal")) return "Translúcido / Glass";
    if (efeito === "neon" || tem("fluo", "neon", "fluorescente")) return "Fluorescente / Neon";
    if (efeito === "glow" || tem("fosforescente", "luminous", "glow")) return "Fosforescente";
    if (tem("termo")) return "Termocromático";
    if (tem("rainbow")) return "Rainbow";
    return "Comum";
  }

  /* ---------- preparação dos produtos ---------- */
  function prepararProdutos(lista) {
    const slugsSeo = new Set();
    return lista.map((produto, indice) => {
      const secao = obterSecaoProduto(produto);
      const nome = obterNomeProdutoParaInterface(produto);
      let slugSeo = slugificar(nome) || obterSlugProduto(produto);
      if (slugsSeo.has(slugSeo)) slugSeo = obterSlugProduto(produto);
      slugsSeo.add(slugSeo);
      // Acessórios mantêm a ordem cadastrada (kits, tamanhos); filamentos são agrupados por família de cor.
      const coresOrdenadas = secao === "acessorios" ? produto.cores : sortVariantsByColorFamily(produto.cores);
      const cores = coresOrdenadas.map((cor) => ({
        ...cor,
        _slug: obterSlugCor(cor),
        _fotos: obterFotosCor(produto, cor),
        _grupo: obterGrupoCor(cor),
        _acabamento: obterAcabamento(produto, cor),
        _visual: obterCorVisual(cor),
        _ordemOriginal: produto.cores.indexOf(cor)
      }));
      return {
        ...produto,
        cores,
        _key: obterSlugProduto(produto),
        _slugSeo: slugSeo,
        _secao: secao,
        _acessorio: secao === "acessorios",
        _nome: nome,
        _materialFiltro: obterMaterialFiltro(produto),
        _destaque: obterDestaqueProduto(produto),
        _indice: indice
      };
    });
  }

  function getName(p) { return p._nome; }
  function getKicker(p) { return p._acessorio ? obterCategoriaProduto(p) : p.marca; }
  function productHref(p) { return `produto/${p._slugSeo}/`; }
  function variantNoun(p, plural) {
    if (p._acessorio) return plural ? (p.rotuloVariacaoPlural || "opções") : (p.rotuloVariacaoSingular || "opção");
    return plural ? (p.rotuloVariacaoPlural || "cores") : (p.rotuloVariacaoSingular || "cor");
  }
  const getPrice = (p, c) => obterPrecoProdutoOuVariacao(p, c);
  const firstImage = (c) => c?._fotos?.[0] || "";

  /* ============================================================
     PREÇO — Pix e parcelamento seguem o cálculo oficial
     ============================================================ */
  const LIMITE_QUANTIDADE_ITEM = 99;
  const DESCONTO_PAGAMENTO_PERCENTUAL = 0.05;
  const PARCELAS_SEM_JUROS = 3;

  const arredondarCentavos = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

  function formatarPrecoPedido(valor) {
    return arredondarCentavos(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function calcularDescontoPagamento(valor) {
    return arredondarCentavos(arredondarCentavos(Number(valor) || 0) * DESCONTO_PAGAMENTO_PERCENTUAL);
  }

  function obterResumoPrecoCatalogo(valor) {
    const precoNormal = arredondarCentavos(Number(valor) || 0);
    const descontoPix = calcularDescontoPagamento(precoNormal);
    return { precoNormal, precoPix: arredondarCentavos(precoNormal - descontoPix), valorParcela: arredondarCentavos(precoNormal / PARCELAS_SEM_JUROS) };
  }

  function priceBlock(p, c) {
    const r = obterResumoPrecoCatalogo(getPrice(p, c));
    return `<strong class="price-main">${money.format(r.precoNormal)}</strong><span class="price-pix">${money.format(r.precoPix)} no Pix <em>5% OFF</em></span><span class="price-installments">ou ${PARCELAS_SEM_JUROS}x de ${money.format(r.valorParcela)} sem juros no cartão</span>`;
  }

  // Versão compacta do mesmo cálculo para os cards (mesmo markup em automacao/gerar_paginas_seo.py).
  function cardPriceBlock(p, c) {
    const r = obterResumoPrecoCatalogo(getPrice(p, c)), [stock, stockClass] = stockLabel(c);
    return `<div class="card-price-row"><span class="price">${money.format(r.precoNormal)}</span><span class="card-pix"><span>${money.format(r.precoPix)} no Pix</span><em>5% OFF</em></span><span class="card-installments">ou ${PARCELAS_SEM_JUROS}x de ${money.format(r.valorParcela)} sem juros no cartão</span><span class="stock ${stockClass}">${stock}</span></div>`;
  }

  // Variação mostrada por padrão: a primeira do cadastro, mesmo com as cores reordenadas por família.
  function indiceVariacaoPadrao(p, variants = p.cores) {
    const primeira = variants.reduce((melhor, v) => (!melhor || v._ordemOriginal < melhor._ordemOriginal ? v : melhor), null);
    return Math.max(0, p.cores.indexOf(primeira));
  }

  /* ============================================================
     FILTROS
     ============================================================ */
  function categoryMatch(p) {
    if (state.category === "Todos") return true;
    if (state.category === "Acessórios") return p._acessorio;
    return !p._acessorio && normalizar(p.material) === normalizar(state.category);
  }

  function textoDoProduto(p) {
    return [p.marca, p.material, p.linha || "", p.obs || "", p._acessorio ? obterCategoriaProduto(p) : "", p._acessorio ? p.tipoProduto || "" : ""].join(" ");
  }

  // Busca oficial: todos os termos precisam casar com o produto ou com alguma cor.
  function produtoCorresponde(p, termo) {
    if (!termo) return true;
    const consulta = criarConsultaBusca(termo);
    const texto = textoDoProduto(p);
    return consulta.tokens.every((token) => {
      if (tokenCombinaComTexto(texto, token)) return true;
      const consultaToken = criarConsultaBusca(token);
      return p.cores.some((cor) => corCorrespondeConsulta(cor, consultaToken));
    });
  }

  function obterTokensDeCorParaProduto(p, termo) {
    const consulta = criarConsultaBusca(termo);
    if (!consulta.normalizado) return [];
    const texto = textoDoProduto(p);
    return consulta.tokens.filter((token) => obterFamiliasDoTexto(token).size || !tokenCombinaComTexto(texto, token));
  }

  function corCombinaComBusca(p, cor, termo) {
    const tokensCor = obterTokensDeCorParaProduto(p, termo);
    if (!tokensCor.length) return true;
    return tokensCor.every((token) => corCorrespondeConsulta(cor, criarConsultaBusca(token)));
  }

  function queryMatch(p) { return produtoCorresponde(p, state.query); }

  function filteredVariants(p) {
    return p.cores.filter((c) =>
      (!state.query || corCombinaComBusca(p, c, state.query)) &&
      (!state.colors.size || state.colors.has(c._grupo)) &&
      (!state.finishes.size || state.finishes.has(c._acabamento))
    );
  }

  function filterMatch(p) {
    if (!categoryMatch(p) || !queryMatch(p)) return false;
    if (state.materials.size && !state.materials.has(p._materialFiltro)) return false;
    if (state.brands.size && !state.brands.has(p.marca)) return false;
    return filteredVariants(p).length > 0;
  }

  function withVisible(p) { return { ...p, _visibleCores: filteredVariants(p), _base: p }; }

  function pontuarProdutoNaBusca(p, termo) {
    const consulta = criarConsultaBusca(termo);
    if (!consulta.normalizado) return 0;
    const texto = normalizarBusca([p.marca, p.material, p.linha || "", p.obs || "", obterCategoriaProduto(p)].join(" "));
    let pontos = p.cores.reduce((melhor, cor) => Math.max(melhor, pontuarCorNaBusca(cor, consulta)), 0) * 2;
    if (texto === consulta.normalizado) pontos += 180;
    else if (texto.startsWith(consulta.normalizado)) pontos += 125;
    else if (texto.includes(consulta.normalizado)) pontos += 90;
    consulta.tokens.forEach((token) => { if (tokenCombinaComTexto(texto, token)) pontos += 38; });
    return pontos;
  }

  function getFiltered() {
    const list = produtos.filter(filterMatch).map(withVisible);
    const minPrice = (p) => Math.min(...p._visibleCores.map((c) => getPrice(p, c)));
    const maxPrice = (p) => Math.max(...p._visibleCores.map((c) => getPrice(p, c)));
    const prioridade = (p) => (p._destaque ? 0 : 1);
    if (state.sort === "price-asc") list.sort((a, b) => minPrice(a) - minPrice(b) || a._indice - b._indice);
    else if (state.sort === "price-desc") list.sort((a, b) => maxPrice(b) - maxPrice(a) || a._indice - b._indice);
    else if (state.sort === "name") list.sort((a, b) => getName(a).localeCompare(getName(b), "pt-BR"));
    else if (state.query) {
      const pontos = new Map(list.map((p) => [p._key, pontuarProdutoNaBusca(p, state.query)]));
      list.sort((a, b) => pontos.get(b._key) - pontos.get(a._key) || prioridade(a) - prioridade(b) || a._indice - b._indice);
    } else list.sort((a, b) => prioridade(a) - prioridade(b) || a._indice - b._indice);
    return list;
  }

  // Material lista apenas materiais reais; Marca lista apenas marcas de filamento.
  function countsFor(key) {
    const map = new Map();
    produtos.forEach((p) => {
      if (!categoryMatch(p) || !queryMatch(p)) return;
      if (key === "materials" && p._materialFiltro) map.set(p._materialFiltro, (map.get(p._materialFiltro) || 0) + 1);
      if (key === "brands" && !p._acessorio) map.set(p.marca, (map.get(p.marca) || 0) + 1);
      if (key === "colors") [...new Set(p.cores.map((c) => c._grupo))].forEach((v) => map.set(v, (map.get(v) || 0) + 1));
      if (key === "finishes") [...new Set(p.cores.map((c) => c._acabamento).filter(Boolean))].forEach((v) => map.set(v, (map.get(v) || 0) + 1));
    });
    // Seleções ativas continuam visíveis mesmo quando a contagem cai para zero.
    state[key].forEach((v) => { if (!map.has(v)) map.set(v, 0); });
    const last = (v) => (v === "Outros" ? 3 : v === "Multicor" ? 2 : v === "Transparente" ? 1 : v === "Comum" ? -1 : 0);
    if (key === "materials") return [...map].sort((a, b) => MATERIAIS_FILTRO.indexOf(a[0]) - MATERIAIS_FILTRO.indexOf(b[0]));
    if (key === "brands") return [...map].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
    return [...map].sort((a, b) => last(a[0]) - last(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  }

  const colorCss = {
    Preto: "#202124", Branco: "#fff", Azul: "#2D66D7", Verde: "#3F9B61", Vermelho: "#D94B4B", Amarelo: "#E6B933", Laranja: "#E77C33", Rosa: "#E672A7", Roxo: "#7B5EC9",
    Cinza: "#9399A2", "Marrom / Bege": "#B28E6A", Transparente: "linear-gradient(135deg,#F4F7FA 0%,#D5DEE6 55%,#F4F7FA 100%)",
    Multicor: "conic-gradient(#D94B4B 0 25%,#E6B933 0 50%,#3F9B61 0 75%,#2D66D7 0)", Outros: "#CBD2DC"
  };

  function filterGroup(title, key, items, scope) {
    if (!items.length) return "";
    const set = state[key], active = set.size ? `<span class="filter-group__count">${set.size}</span>` : "";
    return `<details class="filter-group" data-filter-group="${key}" ${state.openGroups[key] ? "open" : ""}><summary><span>${title}</span>${active}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 10 4 4 4-4"></path></svg></summary><div class="filter-options">${items.map(([value, count]) => {
      const id = `f-${scope}-${key}-${slugificar(value)}`;
      return `<label class="check-row${count ? "" : " is-empty"}" for="${id}"><input type="checkbox" id="${id}" data-filter="${key}" value="${esc(value)}" ${set.has(value) ? "checked" : ""}>${key === "colors" ? `<span class="color-dot" data-bg="${esc(colorCss[value] || "#CBD2DC")}"></span>` : ""}<span class="check-label">${esc(value)}</span><small>${count}</small></label>`;
    }).join("")}</div></details>`;
  }

  // CSP do site bloqueia atributos style inline: cores são aplicadas via CSSOM.
  function applyBg(root) { $$("[data-bg]", root).forEach((el) => { el.style.background = el.dataset.bg; }); }

  function renderFilters() {
    const groups = (scope) => filterGroup("Material", "materials", countsFor("materials"), scope) + filterGroup("Cor", "colors", countsFor("colors"), scope) + filterGroup("Marca", "brands", countsFor("brands"), scope) + filterGroup("Acabamento", "finishes", countsFor("finishes"), scope);
    const focused = document.activeElement?.matches?.("input[data-filter]") ? document.activeElement.id : null;
    els.filterDesktop.innerHTML = groups("d");
    els.filterMobile.innerHTML = groups("m");
    applyBg(els.filterDesktop); applyBg(els.filterMobile);
    if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
    updateFilterBadge();
  }

  function onFilterChange(e) {
    const input = e.target.closest("input[data-filter]"); if (!input) return;
    const set = state[input.dataset.filter];
    input.checked ? set.add(input.value) : set.delete(input.value);
    renderAll();
  }
  function onGroupToggle(e) { const d = e.target; if (d.matches?.("details[data-filter-group]")) state.openGroups[d.dataset.filterGroup] = d.open; }
  [els.filterDesktop, els.filterMobile].forEach((root) => { root.addEventListener("change", onFilterChange); root.addEventListener("toggle", onGroupToggle, true); });

  const filterSelectionCount = () => state.materials.size + state.brands.size + state.colors.size + state.finishes.size;
  function updateFilterBadge() {
    const n = filterSelectionCount();
    els.filterCount.textContent = n; els.filterCount.hidden = !n;
    els.sidebarClear.hidden = !(n || state.query || state.category !== "Todos");
  }

  function renderActive() {
    const chips = [];
    if (state.query) chips.push(["query", `“${state.query}”`, state.query]);
    ["materials", "colors", "brands", "finishes"].forEach((k) => state[k].forEach((v) => chips.push([k, v, v])));
    els.activeFilters.hidden = !chips.length;
    els.activeFilters.innerHTML = chips.map(([k, label, v]) => `<span class="active-filter">${esc(label)}<button type="button" aria-label="Remover filtro ${esc(label)}" data-remove-filter="${k}" data-value="${esc(v)}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 8 8 8M16 8l-8 8"></path></svg></button></span>`).join("") + (chips.length > 1 ? '<button type="button" class="active-clear" data-clear-all>Limpar tudo</button>' : "");
  }

  /* ============================================================
     CARDS
     ============================================================ */
  function cardCta(p) {
    if (p.cores.length <= 1) return "Ver produto";
    return p._acessorio ? "Ver opções" : "Ver cores";
  }

  function melhorIndiceParaBusca(p, variants) {
    const termo = state.query;
    if (!termo) return -1;
    const consulta = criarConsultaBusca(termo);
    let melhor = -1, melhorPontos = 0;
    variants.forEach((v) => { const pts = pontuarCorNaBusca(v, consulta); if (pts > melhorPontos) { melhorPontos = pts; melhor = p.cores.indexOf(v); } });
    return melhor;
  }

  function card(p, posicao = 99) {
    const variants = p._visibleCores || p.cores;
    let idx = state.selected.has(p._key) ? state.selected.get(p._key) : -1;
    if (idx < 0 || idx >= p.cores.length || !variants.includes(p.cores[idx])) {
      const busca = melhorIndiceParaBusca(p, variants);
      idx = busca >= 0 ? busca : indiceVariacaoPadrao(p, variants);
      state.selected.set(p._key, idx);
    }
    const c = p.cores[idx], title = getName(p), many = p.cores.length > 1;
    // A variação selecionada sempre aparece entre as miniaturas.
    let shown = variants.slice(0, 4);
    if (!shown.includes(c)) shown = [c, ...variants.filter((v) => v !== c).slice(0, 3)];
    const extra = variants.length - shown.length;
    const href = esc(productHref(p));
    return `<article class="product-card${corEstaDisponivel(c) ? "" : " is-out"}" data-product="${esc(p._key)}">
      <div class="card-media"><span class="product-badge">${p._acessorio ? "ACESSÓRIO" : esc(p.material)}</span>${p._destaque ? `<span class="product-flag">${esc(p._destaque.titulo)}</span>` : ""}<a class="card-media-open" href="${href}" data-open-product aria-label="Abrir ${esc(title)}"></a><img src="${esc(firstImage(c))}" alt="${esc(`${title} — ${c.nome}`)}" ${posicao < 4 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><span class="card-open-plus" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 6v12M6 12h12"></path></svg></span></div>
      <div class="card-body"><p class="product-kicker">${esc(getKicker(p))}</p><h3 class="product-title"><a href="${href}" data-open-product>${esc(title)}</a></h3><p class="variant-summary"><span title="${esc(c.nome)}">${esc(c.nome)}</span>${many ? `<small>${variants.length < p.cores.length ? `${variants.length} de ` : ""}${p.cores.length} ${variantNoun(p, true)}</small>` : ""}</p>
      <div class="card-variants">${many ? shown.map((v) => { const vi = p.cores.indexOf(v); return `<button type="button" class="variant-mini ${vi === idx ? "is-active" : ""}" data-variant="${vi}" aria-label="Pré-visualizar ${esc(v.nome)}" aria-pressed="${vi === idx}" title="${esc(v.nome)}"><img src="${esc(firstImage(v))}" alt="" loading="lazy" decoding="async"></button>`; }).join("") + (extra > 0 ? `<a href="${href}" class="more-variants" data-open-product aria-label="Ver mais ${extra} ${variantNoun(p, extra > 1)}">+${extra}</a>` : "") : ""}</div>
      ${cardPriceBlock(p, c)}
      <a class="primary-button card-cta" href="${href}" data-open-product>${esc(cardCta(p))}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9.5 6 6 6-6 6"></path></svg></a></div></article>`;
  }

  let ultimaLista = [];
  function renderProducts() {
    if (!state.carregado) return;
    const list = getFiltered(), n = list.length;
    ultimaLista = list;
    const label = n === 1 ? "produto" : "produtos";
    els.resultCount.textContent = n; els.resultLabel.textContent = label;
    els.filterApplyCount.textContent = n; els.filterApplyLabel.textContent = label;
    els.grid.innerHTML = list.map((p, i) => card(p, i)).join("");
    els.grid.removeAttribute("aria-busy");
    els.grid.hidden = !n; els.empty.hidden = !!n;
    if (!n) {
      els.emptyTitle.textContent = "Nenhum produto encontrado";
      els.emptyText.textContent = state.query ? `Não encontramos resultados para “${state.query}”. Tente um termo mais geral ou remova filtros.` : "Nenhum produto combina com todos os filtros escolhidos. Remova algum filtro para ver mais opções.";
      els.emptyAction.hidden = false;
    }
  }

  // Atualiza só o card afetado (troca de variação) em vez de reconstruir o grid inteiro.
  function refreshCard(p) {
    const base = p?._base || p;
    if (!base) return;
    const el = els.grid.querySelector(`[data-product="${CSS.escape(base._key)}"]`); if (!el) return;
    const focusVariant = el.contains(document.activeElement) ? document.activeElement.dataset.variant : null;
    el.outerHTML = card(withVisible(base));
    if (focusVariant != null) els.grid.querySelector(`[data-product="${CSS.escape(base._key)}"] [data-variant="${focusVariant}"]`)?.focus();
  }

  function catalogTitle() {
    if (state.category === "Todos") return "Todos os produtos";
    if (state.category === "Acessórios") return "Acessórios";
    return `Filamentos ${state.category}`;
  }

  function renderAll() { renderProducts(); renderActive(); renderFilters(); updateCategoryUI(); els.catalogTitle.textContent = catalogTitle(); }

  const findProduct = (key) => produtos.find((p) => p._key === key);
  function cardProduct(el) { const c = el.closest("[data-product]"); return c ? findProduct(c.dataset.product) : null; }

  els.grid.addEventListener("click", (e) => {
    const p = cardProduct(e.target); if (!p) return;
    const variant = e.target.closest("[data-variant]");
    if (variant) { state.selected.set(p._key, Number(variant.dataset.variant)); refreshCard(p); return; }
    if (e.target.closest("[data-open-product]")) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // nova aba: segue o link real
      e.preventDefault(); openProduct(p);
    }
  });

  // Foto ausente: mostra a amostra de cor no lugar, sem quebrar o layout.
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallback) return;
    img.dataset.fallback = "1";
    img.classList.add("img-missing");
    img.removeAttribute("src");
  }, true);

  /* ============================================================
     DRAWER DO PRODUTO
     ============================================================ */
  function openProduct(p, variantIndex) {
    const base = p._base || p;
    if (els.modalBackdrop.hidden) { state.lastFocus = document.activeElement; state.urlAntesDoProduto = location.href; }
    state.modal = base;
    state.modalVariant = variantIndex ?? (state.selected.has(base._key) ? state.selected.get(base._key) : indiceVariacaoPadrao(base));
    state.modalVariant = clamp(state.modalVariant, 0, base.cores.length - 1);
    state.modalImage = 0; state.modalQty = 1;
    renderModal(); els.modalBackdrop.hidden = false; document.body.classList.add("no-scroll");
    $(".pd-body", els.modal).scrollTop = 0; els.modal.querySelector(".modal-info").scrollTop = 0;
    setTimeout(() => els.modalClose.focus(), 0);
  }

  function closeModal() {
    closeZoom(false);
    els.modalBackdrop.hidden = true; state.modal = null; document.body.classList.remove("no-scroll");
    if (state.urlAntesDoProduto) { try { history.replaceState(history.state, "", limparUrlProduto(state.urlAntesDoProduto)); } catch (erro) { /* sem histórico */ } }
    state.urlAntesDoProduto = null;
    state.lastFocus?.focus?.({ preventScroll: true });
  }

  function limparUrlProduto(href) {
    const url = new URL(href);
    url.searchParams.delete("produto"); url.searchParams.delete("cor");
    return url.pathname + url.search + url.hash;
  }

  function setModalVariant(i) {
    state.modalVariant = i; state.modalImage = 0;
    if (state.zoomOpen) resetZoom();
    renderModal(); refreshCard(state.modal);
  }

  function moveModalVariant(step) {
    if (!state.modal || !state.modal.cores?.length) return;
    const total = state.modal.cores.length; let next = state.modalVariant;
    for (let tries = 0; tries < total; tries++) {
      next = (next + step + total) % total;
      if (corEstaDisponivel(state.modal.cores[next])) { setModalVariant(next); return; }
    }
  }

  function moveModalImage(step) {
    const c = state.modal?.cores[state.modalVariant]; const n = c?._fotos?.length || 0; if (n < 2) return;
    state.modalImage = (state.modalImage + step + n) % n; renderModal();
  }

  function variantPosition(p) {
    return p.cores.length > 1 ? `<b>${state.modalVariant + 1} / ${p.cores.length}</b><span>${esc(p.cores[state.modalVariant].nome)}</span>` : `<span>${esc(p.cores[0].nome)}</span>`;
  }

  function criarLinkDiretoCor(produto, cor) {
    const url = new URL(window.location.href);
    url.search = ""; url.hash = "";
    url.searchParams.set("produto", obterSlugProduto(produto));
    url.searchParams.set("cor", obterSlugCor(cor));
    return url.toString();
  }

  function renderModal() {
    const p = state.modal; if (!p) return;
    const c = p.cores[state.modalVariant] || p.cores[0], imgs = c._fotos || [], disponivel = corEstaDisponivel(c);
    state.selected.set(p._key, state.modalVariant);
    state.modalImage = Math.max(0, Math.min(state.modalImage, imgs.length - 1));
    setImage(els.modalImage, imgs[state.modalImage], `${getName(p)} — ${c.nome}`);
    els.modalKicker.textContent = p._acessorio ? getKicker(p) : [p.material, p.marca].filter(Boolean).join(" • ");
    els.modalTitle.textContent = getName(p); els.modalVariantName.textContent = c.nome;
    els.modalPrice.innerHTML = priceBlock(p, c);
    const [s, cl] = stockLabel(c); els.modalStock.className = `stock-line ${cl}`; els.modalStock.textContent = s;
    els.modalObs.textContent = p.obs || ""; els.modalObs.hidden = !p.obs;
    els.modalVariantLabel.textContent = p._acessorio ? `Escolha a ${variantNoun(p, false)}` : "Escolha a cor";
    els.modalVariantCount.textContent = `${p.cores.length} ${variantNoun(p, p.cores.length > 1)}`;
    els.modalVariantPos.innerHTML = variantPosition(p);
    els.modalQty.textContent = state.modalQty;
    els.modalAdd.disabled = !disponivel; els.modalAdd.textContent = disponivel ? "Adicionar ao pedido" : "Indisponível";
    // Setas do cabeçalho = variações (sempre visíveis quando há mais de uma). Setas sobre a foto = fotos da mesma variação.
    const multiVariant = p.cores.filter(corEstaDisponivel).length > 1;
    els.modalPrevVariant.hidden = !multiVariant; els.modalNextVariant.hidden = !multiVariant;
    const multiPhoto = imgs.length > 1;
    els.modalPrevImage.hidden = !multiPhoto; els.modalNextImage.hidden = !multiPhoto;
    els.modalImageThumbs.hidden = !multiPhoto;
    els.modalImageThumbs.innerHTML = multiPhoto ? imgs.map((im, i) => `<button class="modal-thumb ${i === state.modalImage ? "is-active" : ""}" type="button" data-modal-img="${i}" aria-label="Ver foto ${i + 1} de ${imgs.length}" aria-pressed="${i === state.modalImage}"><img src="${esc(im)}" alt=""></button>`).join("") : "";
    els.modalVariants.classList.toggle("is-long", p.cores.length > 16);
    els.modalVariants.hidden = p.cores.length <= 1; els.modalVariants.previousElementSibling.hidden = p.cores.length <= 1;
    els.modalVariants.innerHTML = p.cores.map((v, i) => variantChoice(v, i, "data-modal-variant")).join("");
    els.modalVariants.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
    els.modalPageLink.href = `${productHref(p)}?cor=${encodeURIComponent(c._slug)}`;
    els.modalStoreLink.href = obterLinkLoja(p);
    try { history.replaceState(history.state, "", criarLinkDiretoCor(p, c)); } catch (erro) { /* sem histórico */ }
    syncZoom();
  }

  function setImage(img, src, alt) {
    delete img.dataset.fallback; img.classList.remove("img-missing");
    if (src) img.src = src; else img.removeAttribute("src");
    img.alt = alt;
  }

  function variantChoice(v, i, attr) {
    const off = !corEstaDisponivel(v), on = i === state.modalVariant;
    return `<button class="variant-choice ${on ? "is-active" : ""}" type="button" ${attr}="${i}" aria-pressed="${on}" title="${esc(v.nome)}${off ? " — sem estoque" : ""}" ${off ? "disabled" : ""}><span class="variant-choice-image"><img src="${esc(firstImage(v))}" alt="" loading="lazy" decoding="async"></span><span class="variant-choice-name">${esc(v.nome)}</span>${off ? "<small>Sem estoque</small>" : ""}</button>`;
  }

  function setQty(n) { state.modalQty = clamp(n, 1, LIMITE_QUANTIDADE_ITEM); els.modalQty.textContent = state.modalQty; els.zoomQty.textContent = state.modalQty; }

  async function compartilharCor() {
    const p = state.modal; if (!p) return;
    const cor = p.cores[state.modalVariant];
    const nomeProduto = obterNomeCompletoProduto(p);
    const link = criarLinkDiretoCor(p, cor);
    const mensagem = `${nomeProduto} — ${cor.nome}\n\nVeja esta ${variantNoun(p, false)} no catálogo da 3ZK:\n${link}`;
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title: `${nomeProduto} — ${cor.nome}`, text: `Veja esta ${variantNoun(p, false)} no catálogo da 3ZK:`, url: link }); return; }
      catch (erro) { if (erro.name === "AbortError") return; }
    }
    if (await copiarTexto(mensagem, "Copie a mensagem abaixo:")) toast("Link copiado", { icon: true });
  }

  els.modalClose.addEventListener("click", closeModal);
  els.modalShare.addEventListener("click", compartilharCor);
  els.modalBackdrop.addEventListener("click", (e) => { if (e.target === els.modalBackdrop) closeModal(); });
  els.modalPrevVariant.addEventListener("click", () => moveModalVariant(-1));
  els.modalNextVariant.addEventListener("click", () => moveModalVariant(1));
  els.modalPrevImage.addEventListener("click", () => moveModalImage(-1));
  els.modalNextImage.addEventListener("click", () => moveModalImage(1));
  els.modalImageZoom.addEventListener("click", openZoom);
  els.modalVariants.addEventListener("click", (e) => { const b = e.target.closest("[data-modal-variant]"); if (b) setModalVariant(Number(b.dataset.modalVariant)); });
  els.modalImageThumbs.addEventListener("click", (e) => { const b = e.target.closest("[data-modal-img]"); if (!b) return; state.modalImage = Number(b.dataset.modalImg); renderModal(); });
  $("#modalQtyMinus").addEventListener("click", () => setQty(state.modalQty - 1));
  $("#modalQtyPlus").addEventListener("click", () => setQty(state.modalQty + 1));
  els.modalAdd.addEventListener("click", () => {
    const p = state.modal, c = p?.cores[state.modalVariant];
    if (!c || !corEstaDisponivel(c)) return;
    adicionarAoCarrinho(p, c, state.modalQty); closeModal();
  });

  /* ============================================================
     VISUALIZADOR COMPLETO (ZOOM)
     ============================================================ */
  function applyZoomTransform() {
    els.zoomImage.style.transform = `translate(${state.zoomX}px, ${state.zoomY}px) scale(${state.zoomScale})`;
    els.zoomReset.textContent = `${Math.round(state.zoomScale * 100)}%`;
    els.zoomImageWrap.classList.toggle("is-zoomed", state.zoomScale > 1);
    els.zoomImageWrap.classList.toggle("is-dragging", state.zoomDragging);
    els.zoomOut.disabled = state.zoomScale <= 1; els.zoomIn.disabled = state.zoomScale >= 4;
  }
  function resetZoom() { state.zoomScale = 1; state.zoomX = 0; state.zoomY = 0; applyZoomTransform(); }
  function setZoom(nextScale, originX = null, originY = null) {
    const prev = state.zoomScale; state.zoomScale = clamp(nextScale, 1, 4);
    if (state.zoomScale === 1) { state.zoomX = 0; state.zoomY = 0; }
    else if (originX != null && originY != null) {
      const rect = els.zoomImageWrap.getBoundingClientRect();
      const dx = originX - (rect.left + rect.width / 2), dy = originY - (rect.top + rect.height / 2), ratio = state.zoomScale / prev;
      state.zoomX = (state.zoomX - dx) * ratio + dx; state.zoomY = (state.zoomY - dy) * ratio + dy;
    }
    applyZoomTransform();
  }
  function openZoom() {
    if (!state.modal) return;
    const c = state.modal.cores[state.modalVariant] || state.modal.cores[0];
    if (!c._fotos?.length) return;
    state.zoomOpen = true; els.zoomBackdrop.hidden = false; resetZoom(); syncZoom();
    els.zoomModal.querySelector(".zoom-product-content").scrollTop = 0;
    els.zoomClose.focus();
  }
  function syncZoom() {
    if (!state.zoomOpen || !state.modal) return;
    const p = state.modal, c = p.cores[state.modalVariant] || p.cores[0], imgs = c._fotos || [];
    if (!imgs.length) return;
    setImage(els.zoomImage, imgs[state.modalImage], `${getName(p)} — ${c.nome}`);
    els.zoomKicker.textContent = p._acessorio ? getKicker(p) : [p.material, p.marca, p.linha].filter(Boolean).join(" • ");
    els.zoomTitle.textContent = getName(p);
    els.zoomVariantBadge.innerHTML = variantPosition(p);
    els.zoomVariantKind.textContent = p._acessorio ? variantNoun(p, false).toUpperCase() : "COR";
    els.zoomVariantName.textContent = c.nome;
    els.zoomSwatch.style.background = c._visual || c.hex || "#CBD2DC";
    const [stock, stockClass] = stockLabel(c); els.zoomStock.className = `stock-line ${stockClass}`; els.zoomStock.textContent = stock;
    els.zoomPriceBlock.innerHTML = priceBlock(p, c);
    els.zoomQty.textContent = state.modalQty;
    const disponivel = corEstaDisponivel(c); els.zoomAdd.disabled = !disponivel; els.zoomAdd.textContent = disponivel ? "Adicionar ao pedido" : "Indisponível";
    const many = p.cores.length > 1;
    els.zoomVariantLabel.textContent = p._acessorio ? `Outras ${variantNoun(p, true)}` : "Outras cores";
    els.zoomVariantLabel.parentElement.hidden = !many; els.zoomVariantStrip.hidden = !many;
    els.zoomVariantCount.textContent = `${p.cores.length} ${variantNoun(p, true)}`;
    els.zoomVariantStrip.classList.toggle("is-long", p.cores.length > 12);
    els.zoomVariantStrip.innerHTML = many ? p.cores.map((v, i) => variantChoice(v, i, "data-zoom-variant")).join("") : "";
    els.zoomVariantStrip.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
    const multiVariant = p.cores.filter(corEstaDisponivel).length > 1; els.zoomPrev.hidden = !multiVariant; els.zoomNext.hidden = !multiVariant;
    els.zoomPhotos.hidden = imgs.length < 2;
    els.zoomPhotos.innerHTML = imgs.length < 2 ? "" : imgs.map((im, i) => `<button class="modal-thumb ${i === state.modalImage ? "is-active" : ""}" type="button" data-zoom-img="${i}" aria-label="Ver foto ${i + 1} de ${imgs.length}" aria-pressed="${i === state.modalImage}"><img src="${esc(im)}" alt=""></button>`).join("");
    applyZoomTransform();
  }
  function closeZoom(restoreFocus = true) {
    if (!state.zoomOpen) return;
    state.zoomOpen = false; state.zoomDragging = false; els.zoomBackdrop.hidden = true;
    if (restoreFocus) els.modalImageZoom.focus({ preventScroll: true });
  }
  els.zoomClose.addEventListener("click", () => closeZoom());
  els.zoomBackdrop.addEventListener("click", (e) => { if (e.target === els.zoomBackdrop) closeZoom(); });
  els.zoomPrev.addEventListener("click", () => moveModalVariant(-1));
  els.zoomNext.addEventListener("click", () => moveModalVariant(1));
  els.zoomIn.addEventListener("click", () => setZoom(state.zoomScale + 0.5));
  els.zoomOut.addEventListener("click", () => setZoom(state.zoomScale - 0.5));
  els.zoomReset.addEventListener("click", resetZoom);
  els.zoomPhotos.addEventListener("click", (e) => { const b = e.target.closest("[data-zoom-img]"); if (!b) return; state.modalImage = Number(b.dataset.zoomImg); resetZoom(); renderModal(); });
  els.zoomImageWrap.addEventListener("click", (e) => {
    if (state.zoomMoved) { state.zoomMoved = false; return; } // soltar depois de arrastar não conta como clique
    if (state.zoomScale === 1) setZoom(2, e.clientX, e.clientY); else if (state.zoomScale < 3) setZoom(state.zoomScale + 0.75, e.clientX, e.clientY); else resetZoom();
  });
  els.zoomStage.addEventListener("wheel", (e) => { if (!state.zoomOpen || e.target.closest(".zoom-photos")) return; e.preventDefault(); setZoom(state.zoomScale + (e.deltaY < 0 ? 0.25 : -0.25), e.clientX, e.clientY); }, { passive: false });
  els.zoomImageWrap.addEventListener("pointerdown", (e) => {
    state.zoomMoved = false; if (state.zoomScale <= 1) return;
    state.zoomDragging = true; state.zoomStartX = e.clientX - state.zoomX; state.zoomStartY = e.clientY - state.zoomY; state.zoomDownX = e.clientX; state.zoomDownY = e.clientY;
    els.zoomImageWrap.setPointerCapture?.(e.pointerId); applyZoomTransform();
  });
  els.zoomImageWrap.addEventListener("pointermove", (e) => {
    if (!state.zoomDragging) return;
    if (Math.abs(e.clientX - state.zoomDownX) + Math.abs(e.clientY - state.zoomDownY) > 4) state.zoomMoved = true;
    state.zoomX = e.clientX - state.zoomStartX; state.zoomY = e.clientY - state.zoomStartY; applyZoomTransform();
  });
  const stopDrag = () => { if (!state.zoomDragging) return; state.zoomDragging = false; applyZoomTransform(); };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => els.zoomImageWrap.addEventListener(t, stopDrag));
  els.zoomVariantStrip.addEventListener("click", (e) => { const b = e.target.closest("[data-zoom-variant]"); if (b) setModalVariant(Number(b.dataset.zoomVariant)); });
  els.zoomQtyMinus.addEventListener("click", () => setQty(state.modalQty - 1));
  els.zoomQtyPlus.addEventListener("click", () => setQty(state.modalQty + 1));
  els.zoomAdd.addEventListener("click", () => {
    if (!state.modal) return;
    const c = state.modal.cores[state.modalVariant];
    if (!corEstaDisponivel(c)) return;
    adicionarAoCarrinho(state.modal, c, state.modalQty);
  });

  /* ============================================================
     CARRINHO 3ZK — MONTADOR DE PEDIDO
     O carrinho funciona inteiramente no navegador e envia o
     pedido pronto para confirmação no WhatsApp.
     ============================================================ */
  const CHAVE_CARRINHO_3ZK = "3zk-carrinho-v1";
  const CHAVE_DADOS_PEDIDO_3ZK = "3zk-dados-pedido-v1";
  const CHAVE_CODIGO_PEDIDO_3ZK = "3zk-codigo-pedido-v1";

  function lerLocalStorage(chave, valorPadrao) {
    try { const salvo = window.localStorage.getItem(chave); return salvo ? JSON.parse(salvo) : valorPadrao; }
    catch (erro) { console.warn(`[3ZK] Não foi possível ler ${chave}.`, erro); return valorPadrao; }
  }
  function gravarLocalStorage(chave, valor) {
    try { window.localStorage.setItem(chave, JSON.stringify(valor)); }
    catch (erro) { console.warn(`[3ZK] Não foi possível salvar ${chave}.`, erro); }
  }
  function removerLocalStorage(chave) {
    try { window.localStorage.removeItem(chave); }
    catch (erro) { console.warn(`[3ZK] Não foi possível remover ${chave}.`, erro); }
  }

  function gerarCaracteresCodigoPedido(quantidade) {
    // Sem 0, O, 1, I e L para evitar confusão ao copiar.
    const alfabeto = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    let resultado = "";
    if (window.crypto?.getRandomValues) {
      const numeros = new Uint32Array(quantidade);
      window.crypto.getRandomValues(numeros);
      numeros.forEach((numero) => { resultado += alfabeto[numero % alfabeto.length]; });
      return resultado;
    }
    for (let i = 0; i < quantidade; i += 1) resultado += alfabeto[Math.floor(Math.random() * alfabeto.length)];
    return resultado;
  }

  // Identificador interno robusto do pedido (não é mostrado ao cliente).
  function gerarNovoCodigoPedido() {
    const caracteres = gerarCaracteresCodigoPedido(8);
    return `3ZK-${caracteres.slice(0, 4)}-${caracteres.slice(4)}`;
  }

  // Código curto exibido ao cliente e no WhatsApp: 3 letras + hífen + 1 número (ex.: KZT-7). Sem I e O.
  function gerarCodigoVisivelPedido() {
    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ", numeros = new Uint32Array(4);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(numeros);
    else numeros.forEach((_, i) => { numeros[i] = Math.floor(Math.random() * 0xffffffff); });
    return `${[0, 1, 2].map((i) => letras[numeros[i] % letras.length]).join("")}-${numeros[3] % 10}`;
  }

  const REGEX_ID_PEDIDO = /^3ZK-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;
  const REGEX_CODIGO_VISIVEL = /^[A-HJ-NP-Z]{3}-[0-9]$/;

  // Retorna { id, codigoVisivel }. Pedidos salvos no formato antigo (só o id) ganham o código curto sem perder o id.
  function obterIdentificacaoPedido() {
    const salvo = lerLocalStorage(CHAVE_CODIGO_PEDIDO_3ZK, null);
    const idSalvo = typeof salvo === "string" ? salvo : salvo?.id;
    const id = REGEX_ID_PEDIDO.test(idSalvo || "") ? idSalvo : gerarNovoCodigoPedido();
    const codigoVisivel = id === idSalvo && REGEX_CODIGO_VISIVEL.test(salvo?.codigoVisivel || "") ? salvo.codigoVisivel : gerarCodigoVisivelPedido();
    if (id !== idSalvo || codigoVisivel !== salvo?.codigoVisivel) gravarLocalStorage(CHAVE_CODIGO_PEDIDO_3ZK, { id, codigoVisivel });
    return { id, codigoVisivel };
  }

  const obterCodigoPedido = () => obterIdentificacaoPedido().codigoVisivel;

  function sincronizarCodigoPedidoComCarrinho() {
    if (carrinho.length === 0) { removerLocalStorage(CHAVE_CODIGO_PEDIDO_3ZK); return; }
    obterIdentificacaoPedido();
  }

  function carregarCarrinhoSalvo() {
    const salvo = lerLocalStorage(CHAVE_CARRINHO_3ZK, []);
    if (!Array.isArray(salvo)) return [];
    return salvo
      .filter((item) => item && typeof item.id === "string" && typeof item.nomeProduto === "string" && typeof item.corNome === "string")
      .map((item) => ({ ...item, preco: Number(item.preco) || 0, quantidade: Math.min(LIMITE_QUANTIDADE_ITEM, Math.max(1, Number(item.quantidade) || 1)) }));
  }

  let carrinho = carregarCarrinhoSalvo();

  const salvarCarrinho = () => gravarLocalStorage(CHAVE_CARRINHO_3ZK, carrinho);
  const obterIdItemCarrinho = (produto, cor) => `${obterSlugProduto(produto)}::${obterSlugCor(cor)}`;
  const obterQuantidadeTotalCarrinho = () => carrinho.reduce((total, item) => total + item.quantidade, 0);
  const obterValorTotalCarrinho = () => carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0);
  const obterTextoQuantidade = (quantidade) => (quantidade === 1 ? "1 item" : `${quantidade} itens`);

  function criarItemCarrinho(produto, cor) {
    const fotos = obterFotosCor(produto, cor);
    return {
      id: obterIdItemCarrinho(produto, cor),
      produtoSlug: obterSlugProduto(produto),
      corSlug: obterSlugCor(cor),
      nomeProduto: obterNomeCompletoProduto(produto),
      marca: produto.marca,
      material: produto.material,
      linha: produto.linha || "",
      corNome: cor.nome,
      preco: obterPrecoProdutoOuVariacao(produto, cor),
      hex: obterHexBaseVisual(cor),
      visual: obterCorVisual(cor),
      efeito: cor.efeito || "",
      imagem: fotos[0] || "",
      quantidade: 1
    };
  }

  function adicionarAoCarrinho(produto, cor, quantidade = 1) {
    const id = obterIdItemCarrinho(produto, cor);
    const existente = carrinho.find((item) => item.id === id);
    const qtd = clamp(Number(quantidade) || 1, 1, LIMITE_QUANTIDADE_ITEM);
    if (existente) {
      existente.preco = obterPrecoProdutoOuVariacao(produto, cor) || existente.preco;
      existente.imagem = obterFotosCor(produto, cor)[0] || existente.imagem;
      existente.hex = obterHexBaseVisual(cor) || existente.hex;
      existente.visual = obterCorVisual(cor) || existente.visual;
      existente.quantidade = Math.min(LIMITE_QUANTIDADE_ITEM, existente.quantidade + qtd);
    } else {
      carrinho.push({ ...criarItemCarrinho(produto, cor), quantidade: qtd });
    }
    salvarCarrinho(); sincronizarCodigoPedidoComCarrinho(); renderizarCarrinho(); bumpCount();
    toast(`${qtd > 1 ? `${qtd}× ` : ""}${getName(produto)} ${cor.nome} adicionado`, { action: true, icon: true });
  }

  function alterarQuantidadeItem(id, diferenca) {
    const item = carrinho.find((x) => x.id === id); if (!item) return;
    const novaQuantidade = item.quantidade + diferenca;
    if (novaQuantidade <= 0) carrinho = carrinho.filter((x) => x.id !== id);
    else item.quantidade = Math.min(LIMITE_QUANTIDADE_ITEM, novaQuantidade);
    salvarCarrinho(); sincronizarCodigoPedidoComCarrinho(); renderizarCarrinho();
  }

  function removerItemCarrinho(id) {
    carrinho = carrinho.filter((item) => item.id !== id);
    salvarCarrinho(); sincronizarCodigoPedidoComCarrinho(); renderizarCarrinho();
  }

  function limparCarrinho() {
    if (carrinho.length === 0) return;
    if (!window.confirm("Remover todos os produtos do seu pedido?")) return;
    carrinho = [];
    salvarCarrinho(); sincronizarCodigoPedidoComCarrinho(); renderizarCarrinho();
    els.cartDrawer.querySelector(".icon-button")?.focus();
  }

  function reconciliarCarrinhoComCatalogo() {
    const itensPermitidos = new Set(produtos.flatMap((produto) => produto.cores.map((cor) => obterIdItemCarrinho(produto, cor))));
    const quantidadeAnterior = carrinho.length;
    carrinho = carrinho.filter((item) => itensPermitidos.has(item.id));
    if (carrinho.length !== quantidadeAnterior) { salvarCarrinho(); sincronizarCodigoPedidoComCarrinho(); }
  }

  function localizarItem(item) {
    const p = produtos.find((x) => x._key === item.produtoSlug) || produtos.find((x) => obterSlugProduto(x) === String(item.id).split("::")[0]);
    const i = p ? p.cores.findIndex((c) => c._slug === item.corSlug) : -1;
    return { p, i };
  }

  /* ---------- dados do formulário (etapa 2) ---------- */
  function obterDadosFormulario() {
    if (!els.orderForm) return { nome: "", telefone: "", entrega: "retirada", pagamento: "pix", observacao: "" };
    const dados = new FormData(els.orderForm);
    return {
      nome: String(dados.get("nome") || "").trim(),
      telefone: String(dados.get("telefone") || "").trim(),
      entrega: String(dados.get("entrega") || "retirada"),
      pagamento: String(dados.get("pagamento") || "pix"),
      observacao: String(dados.get("observacao") || "").trim()
    };
  }

  function salvarDadosFormulario() {
    gravarLocalStorage(CHAVE_DADOS_PEDIDO_3ZK, obterDadosFormulario());
    els.orderNoteCount.textContent = String(els.orderNote.value.length);
  }

  function preencherDadosFormulario() {
    const dados = lerLocalStorage(CHAVE_DADOS_PEDIDO_3ZK, {}) || {};
    const campo = (nome) => els.orderForm.elements.namedItem(nome);
    campo("nome").value = dados.nome || "";
    campo("telefone").value = dados.telefone || "";
    campo("observacao").value = dados.observacao || "";
    const entrega = els.orderForm.querySelector(`input[name="entrega"][value="${CSS.escape(dados.entrega || "retirada")}"]`);
    const pagamento = els.orderForm.querySelector(`input[name="pagamento"][value="${CSS.escape(dados.pagamento || "pix")}"]`);
    if (entrega) entrega.checked = true;
    if (pagamento) pagamento.checked = true;
    salvarDadosFormulario();
  }

  const obterRotuloEntrega = (valor) => (valor === "entrega" ? "Consultar entrega" : "Retirada");
  function obterRotuloPagamento(valor) {
    const rotulos = { pix: "Pix — 5% de desconto", dinheiro: "Dinheiro — 5% de desconto", combinar: "Combinar no WhatsApp" };
    return rotulos[valor] || "Combinar no WhatsApp";
  }

  function obterPagamentoComDesconto() {
    const pagamento = obterDadosFormulario().pagamento;
    if (pagamento === "pix") return { aplica: true, nome: "Pix", nomeCurto: "Pix" };
    if (pagamento === "dinheiro") return { aplica: true, nome: "Dinheiro", nomeCurto: "dinheiro" };
    return { aplica: false, nome: "", nomeCurto: "" };
  }

  function obterResumoFinanceiroPedido() {
    const subtotal = arredondarCentavos(obterValorTotalCarrinho());
    const pagamentoComDesconto = obterPagamentoComDesconto();
    const desconto = pagamentoComDesconto.aplica ? calcularDescontoPagamento(subtotal) : 0;
    return {
      subtotal, desconto, total: arredondarCentavos(subtotal - desconto),
      aplicaDesconto: pagamentoComDesconto.aplica, formaDesconto: pagamentoComDesconto.nome, formaDescontoCurta: pagamentoComDesconto.nomeCurto
    };
  }

  function criarMensagemPedidoWhatsApp(opcoes = {}) {
    const rapido = opcoes.rapido === true;
    const dados = obterDadosFormulario();
    const financeiro = obterResumoFinanceiroPedido();
    const linhas = ["🛒 *NOVO PEDIDO — CATÁLOGO 3ZK*", `Pedido 3ZK ${obterCodigoPedido()}`];
    if (!rapido) {
      linhas.push("", `👤 *Cliente:* ${dados.nome}`);
      if (dados.telefone) linhas.push(`📱 *Telefone:* ${dados.telefone}`);
    }
    linhas.push("", "📦 *PRODUTOS*");
    carrinho.forEach((item, indice) => {
      linhas.push("", `*${indice + 1}. ${item.nomeProduto}*`, `Cor: ${item.corNome}`, `Quantidade: ${item.quantidade}`, `Valor unitário: ${formatarPreco(item.preco)}`, `Subtotal: ${formatarPreco(item.preco * item.quantidade)}`);
    });
    linhas.push("", `💰 *Subtotal dos produtos:* ${formatarPrecoPedido(financeiro.subtotal)}`);
    if (financeiro.aplicaDesconto) {
      linhas.push(`🏷️ *Desconto ${financeiro.formaDesconto} (5%):* − ${formatarPrecoPedido(financeiro.desconto)}`, `✅ *Total no ${financeiro.formaDesconto}: ${formatarPrecoPedido(financeiro.total)}*`);
    } else {
      linhas.push(`✅ *Total: ${formatarPrecoPedido(financeiro.total)}*`);
    }
    if (rapido) linhas.push("", "📌 *Falta combinar:* entrega e forma de pagamento.");
    else {
      linhas.push("", `🚚 *Entrega:* ${obterRotuloEntrega(dados.entrega)}`, `💳 *Pagamento:* ${obterRotuloPagamento(dados.pagamento)}`);
      if (dados.observacao) linhas.push("", "📝 *Observação:*", dados.observacao);
    }
    linhas.push("", "Pedido sujeito à confirmação de estoque, entrega e valor final.");
    return linhas.join("\n");
  }

  function enviarPedidoWhatsApp() {
    if (carrinho.length === 0) { closeReview(); return; }
    if (!els.orderForm.reportValidity()) { showReviewStep(2); return; }
    salvarDadosFormulario();
    const mensagem = criarMensagemPedidoWhatsApp();
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener");
  }

  async function copiarTexto(texto, rotuloPrompt = "Copie o pedido abaixo:") {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(texto); return true; }
      const campo = document.createElement("textarea");
      campo.value = texto; campo.setAttribute("readonly", "");
      campo.style.position = "fixed"; campo.style.left = "-9999px"; campo.style.opacity = "0";
      document.body.appendChild(campo); campo.focus(); campo.select();
      const copiou = document.execCommand("copy");
      campo.remove();
      if (!copiou) throw new Error("cópia bloqueada");
      return true;
    } catch (erro) {
      window.prompt(rotuloPrompt, texto);
      return false;
    }
  }

  async function copiarPedidoCarrinho() {
    if (carrinho.length === 0) return;
    const copiou = await copiarTexto(criarMensagemPedidoWhatsApp({ rapido: state.reviewStep !== 3 }));
    if (copiou) {
      els.reviewCopy.textContent = "Pedido copiado!"; els.reviewCopy.disabled = true;
      setTimeout(() => { els.reviewCopy.textContent = "Copiar pedido"; els.reviewCopy.disabled = false; }, 2200);
    }
  }

  /* ---------- renderização do pedido ---------- */
  function bumpCount() { [els.cartCount, els.mobileBottomCount].forEach((el) => { if (!el) return; el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump"); }); }

  const ICONE_MENOS = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12"></path></svg>';
  const ICONE_LIXEIRA = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M9.5 7V5h5v2M7 7l1 12h8l1-12"></path></svg>';
  const ICONE_MAIS = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 6v12M6 12h12"></path></svg>';

  function renderizarCarrinho() {
    const quantidade = obterQuantidadeTotalCarrinho();
    const subtotal = arredondarCentavos(obterValorTotalCarrinho());
    const possuiItens = carrinho.length > 0;
    els.cartCount.textContent = quantidade > 99 ? "99+" : String(quantidade); els.cartCount.classList.toggle("is-empty", !quantidade);
    els.mobileBottomCount.textContent = quantidade > 99 ? "99+" : String(quantidade); els.mobileBottomCount.hidden = !quantidade;
    const rotuloBotao = quantidade ? `Abrir pedido. ${obterTextoQuantidade(quantidade)}, subtotal ${formatarPrecoPedido(subtotal)}.` : "Abrir pedido. Nenhum produto selecionado.";
    els.cartOpen.setAttribute("aria-label", rotuloBotao); els.mobileNavCart.setAttribute("aria-label", rotuloBotao);
    els.cartTotal.textContent = formatarPrecoPedido(subtotal);
    els.cartPix.textContent = possuiItens ? `${formatarPrecoPedido(subtotal - calcularDescontoPagamento(subtotal))} no Pix ou dinheiro` : "";
    els.cartSub.textContent = possuiItens ? obterTextoQuantidade(quantidade) : "Nenhum item";
    els.cartClear.hidden = !possuiItens;
    els.cartContinue.disabled = !possuiItens;
    if (!possuiItens) {
      els.cartItems.innerHTML = '<div class="cart-empty"><div class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M6.8 7.5h10.4l1 12H5.8l1-12Z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg></div><strong>Seu pedido está vazio</strong><p>Escolha um produto e a cor para adicionar. Você pode continuar adicionando produtos antes de enviar.</p><button type="button" class="secondary-button" data-close-drawer>Ver catálogo</button></div>';
    } else {
      els.cartItems.innerHTML = carrinho.map((x) => `<article class="cart-item" data-cart-id="${esc(x.id)}"><button type="button" class="cart-item-media" data-cart-edit aria-label="Ver produto ${esc(x.nomeProduto)} — ${esc(x.corNome)}">${x.imagem ? `<img src="${esc(x.imagem)}" alt="" loading="lazy" decoding="async">` : ""}</button><div class="cart-item-info"><h3>${esc(x.nomeProduto)}</h3><p class="cart-variant"><span class="cart-swatch" data-bg="${esc(x.visual || x.hex || "#CBD2DC")}" aria-hidden="true"></span><span>${esc(x.corNome)}</span></p><div class="cart-line-actions"><span class="mini-qty" role="group" aria-label="Quantidade de ${esc(x.corNome)}"><button type="button" data-cart-minus aria-label="${x.quantidade > 1 ? "Diminuir quantidade" : "Remover do pedido"}">${x.quantidade > 1 ? ICONE_MENOS : ICONE_LIXEIRA}</button><output>${x.quantidade}</output><button type="button" data-cart-plus aria-label="Aumentar quantidade" ${x.quantidade >= LIMITE_QUANTIDADE_ITEM ? "disabled" : ""}>${ICONE_MAIS}</button></span><button class="link-button" type="button" data-cart-edit>Ver produto</button><button class="link-button link-button--danger" type="button" data-cart-remove>Remover</button></div></div><div class="cart-item-price"><strong>${money.format(x.preco * x.quantidade)}</strong>${x.quantidade > 1 ? `<small>${money.format(x.preco)} un.</small>` : ""}</div></article>`).join("");
      applyBg(els.cartItems);
    }
    if (!els.review.hidden) {
      if (!possuiItens) closeReview();
      else if (state.reviewStep === 3) renderizarRevisaoPedido();
    }
  }

  els.cartItems.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-drawer]")) { closeDrawers(); setMobileNavActive("mobileNavCatalog"); return; }
    const row = e.target.closest("[data-cart-id]"); if (!row) return;
    const id = row.dataset.cartId, item = carrinho.find((x) => x.id === id); if (!item) return;
    const index = carrinho.indexOf(item);
    if (e.target.closest("[data-cart-edit]")) {
      const { p, i } = localizarItem(item);
      if (p) { closeDrawers(false); setMobileNavActive("mobileNavCatalog"); openProduct(p, Math.max(0, i)); }
      return;
    }
    if (e.target.closest("[data-cart-minus]")) alterarQuantidadeItem(id, -1);
    else if (e.target.closest("[data-cart-plus]")) alterarQuantidadeItem(id, 1);
    else if (e.target.closest("[data-cart-remove]")) removerItemCarrinho(id);
    else return;
    const again = els.cartItems.querySelectorAll("[data-cart-id]")[Math.min(index, carrinho.length - 1)];
    (again?.querySelector("[data-cart-minus]") || els.cartDrawer.querySelector(".icon-button"))?.focus();
  });
  els.cartClear.addEventListener("click", limparCarrinho);

  /* ---------- etapas 2 e 3: dados e revisão ---------- */
  function renderizarRevisaoPedido() {
    const dados = obterDadosFormulario();
    const financeiro = obterResumoFinanceiroPedido();
    els.reviewCode.textContent = obterCodigoPedido();
    els.reviewItems.innerHTML = carrinho.map((x) => `<div class="review-item"><span class="cart-swatch" data-bg="${esc(x.visual || x.hex || "#CBD2DC")}" aria-hidden="true"></span><div><strong>${x.quantidade}× ${esc(x.nomeProduto)}</strong><span>${esc(x.corNome)} · ${formatarPreco(x.preco)} un.</span></div><b>${formatarPreco(x.preco * x.quantidade)}</b></div>`).join("");
    applyBg(els.reviewItems);
    const linhasDados = [["Cliente", dados.nome || "Não informado"], dados.telefone ? ["Telefone", dados.telefone] : null, ["Entrega", obterRotuloEntrega(dados.entrega)], ["Pagamento", obterRotuloPagamento(dados.pagamento)], dados.observacao ? ["Observação", dados.observacao] : null].filter(Boolean);
    els.reviewData.innerHTML = linhasDados.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
    els.reviewLines.innerHTML = `<div><span>Subtotal dos produtos</span><b>${formatarPrecoPedido(financeiro.subtotal)}</b></div>${financeiro.aplicaDesconto ? `<div class="review-lines__discount"><span>Desconto ${esc(financeiro.formaDesconto)} (5%)</span><b>− ${formatarPrecoPedido(financeiro.desconto)}</b></div>` : ""}`;
    els.reviewTotalLabel.textContent = financeiro.aplicaDesconto ? `Total no ${financeiro.formaDesconto}` : "Total dos produtos";
    els.reviewTotal.textContent = formatarPrecoPedido(financeiro.total);
  }

  const ICONE_WHATSAPP = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11.5a7.7 7.7 0 0 1-8 7.6 8.6 8.6 0 0 1-3.5-.75L4 19.5l1.2-3.9A7.6 7.6 0 1 1 20 11.5Z"></path><path d="M9.2 9.2c.3 2.4 2.2 4.4 4.6 4.8l1-1.1 1.6.8-.4 1.5c-3.6.2-7.2-3.3-7-7l1.5-.4.8 1.6Z"></path></svg>';

  function showReviewStep(step) {
    state.reviewStep = step;
    $$("[data-review-step]", els.reviewModal).forEach((el) => { el.hidden = Number(el.dataset.reviewStep) !== step; });
    $$("[data-order-step]", els.reviewModal).forEach((el) => {
      const n = Number(el.dataset.orderStep);
      el.classList.toggle("is-active", n === step); el.classList.toggle("is-done", n < step);
      if (n === step) el.setAttribute("aria-current", "step"); else el.removeAttribute("aria-current");
    });
    els.reviewEyebrow.textContent = `ETAPA ${step} DE 3`;
    els.reviewTitle.textContent = step === 2 ? "Como podemos atender você?" : "Revise antes de enviar";
    els.reviewBack.textContent = step === 2 ? "Voltar ao pedido" : "Voltar";
    if (step === 3) { renderizarRevisaoPedido(); els.reviewNext.innerHTML = `${ICONE_WHATSAPP}Enviar pedido no WhatsApp`; els.reviewNext.classList.add("is-whatsapp"); }
    else { els.reviewNext.textContent = "Revisar pedido"; els.reviewNext.classList.remove("is-whatsapp"); }
    els.reviewModal.scrollTop = 0;
  }

  function openReview() {
    if (!carrinho.length) { toast("Adicione ao menos um produto"); return; }
    closeDrawers(false);
    showReviewStep(2);
    els.review.hidden = false; document.body.classList.add("no-scroll");
    setTimeout(() => $("#orderName").focus(), 0);
  }

  function closeReview(restore = true) {
    els.review.hidden = true; document.body.classList.remove("no-scroll");
    if (restore) els.cartOpen.focus({ preventScroll: true });
  }

  els.cartContinue.addEventListener("click", openReview);
  $("#reviewClose").addEventListener("click", () => closeReview());
  els.review.addEventListener("click", (e) => { if (e.target === els.review) closeReview(); });
  els.reviewBack.addEventListener("click", () => {
    if (state.reviewStep === 3) { showReviewStep(2); return; }
    closeReview(false); setMobileNavActive("mobileNavCart"); openDrawer(els.cartDrawer);
  });
  els.reviewNext.addEventListener("click", () => {
    if (state.reviewStep === 2) {
      if (!els.orderForm.reportValidity()) return;
      salvarDadosFormulario(); showReviewStep(3); els.reviewNext.focus(); return;
    }
    enviarPedidoWhatsApp();
  });
  els.reviewCopy.addEventListener("click", copiarPedidoCarrinho);
  els.orderForm.addEventListener("submit", (e) => { e.preventDefault(); els.reviewNext.click(); });
  els.orderForm.addEventListener("input", salvarDadosFormulario);
  els.orderForm.addEventListener("change", salvarDadosFormulario);
  els.orderPhone.addEventListener("input", () => {
    const numeros = els.orderPhone.value.replace(/\D/g, "").slice(0, 11);
    if (numeros.length <= 2) els.orderPhone.value = numeros;
    else if (numeros.length <= 6) els.orderPhone.value = `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    else if (numeros.length <= 10) els.orderPhone.value = `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    else els.orderPhone.value = `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    salvarDadosFormulario();
  });

  /* ============================================================
     GESTO CATÁLOGO ↔ PEDIDO (touch)
     ============================================================ */
  const GESTURE_MQ = "(max-width: 960px), (pointer: coarse)";
  function gestureEnabled() { return matchMedia(GESTURE_MQ).matches && !state.zoomOpen && els.modalBackdrop.hidden && els.review.hidden && els.maintenance.hidden; }
  function isGestureBlockedTarget(target) {
    if (target.closest("input, select, textarea, a, .category-scroll, .card-variants, .active-filters, .zoom-backdrop, .product-modal, .mobile-bottom-nav, .seo-directory")) return true;
    const button = target.closest("button,[role=\"button\"]");
    return !!(button && !button.closest(".product-card"));
  }
  function resetGestureStyles() {
    [els.cartDrawer, els.backdrop].forEach((el) => { el.style.removeProperty("transition"); el.style.removeProperty("transform"); el.style.removeProperty("opacity"); });
    [els.swipeCartHint, els.swipeCatalogHint].forEach((h) => { h.style.removeProperty("--swipe-progress"); h.classList.remove("is-visible"); });
    document.body.classList.remove("is-swipe-dragging");
  }
  function beginSwipe(e, mode) {
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    state.swipe = { mode, id: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastT: performance.now(), active: false, progress: 0, velocity: 0 };
  }
  function beginCatalogSwipe(e) {
    if (!gestureEnabled() || els.cartDrawer.classList.contains("is-open") || els.filterDrawer.classList.contains("is-open")) return;
    if (isGestureBlockedTarget(e.target)) return;
    beginSwipe(e, "to-cart");
  }
  function beginCartSwipe(e) {
    if (!gestureEnabled() || !els.cartDrawer.classList.contains("is-open")) return;
    if (e.target.closest("input, select, textarea, .mini-qty")) return;
    beginSwipe(e, "to-catalog");
  }
  function moveSwipe(e) {
    const s = state.swipe; if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.startX, dy = e.clientY - s.startY;
    if (!s.active) {
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      // gesto precisa ser claramente horizontal para não disputar com o scroll vertical
      if (Math.abs(dy) > Math.abs(dx) * 0.7) { state.swipe = null; return; }
      const valid = s.mode === "to-cart" ? dx < 0 : dx > 0;
      if (!valid) { state.swipe = null; return; }
      s.active = true; document.body.classList.add("is-swipe-dragging");
      els.cartDrawer.style.transition = "none"; els.backdrop.style.transition = "none";
      if (s.mode === "to-cart") { els.backdrop.hidden = false; els.cartDrawer.setAttribute("aria-hidden", "false"); els.swipeCartHint.classList.add("is-visible"); }
      else els.swipeCatalogHint.classList.add("is-visible");
    }
    e.preventDefault();
    const travel = Math.min(innerWidth * 0.58, 430);
    const p = clamp((s.mode === "to-cart" ? -dx : dx) / travel, 0, 1); s.progress = p;
    const now = performance.now(); s.velocity = (e.clientX - s.lastX) / Math.max(1, now - s.lastT); s.lastX = e.clientX; s.lastT = now;
    if (s.mode === "to-cart") { els.cartDrawer.style.transform = `translateX(${(1 - p) * 100}%)`; els.backdrop.style.opacity = String(0.05 + p * 0.95); els.swipeCartHint.style.setProperty("--swipe-progress", String(p)); }
    else { els.cartDrawer.style.transform = `translateX(${p * 100}%)`; els.backdrop.style.opacity = String(1 - p); els.swipeCatalogHint.style.setProperty("--swipe-progress", String(p)); }
  }
  function endSwipe(e) {
    const s = state.swipe; if (!s || s.id !== e.pointerId) return;
    state.swipe = null;
    if (!s.active) { resetGestureStyles(); return; }
    state.swipeSuppressClickUntil = performance.now() + 360;
    const fast = s.mode === "to-cart" ? s.velocity < -0.55 : s.velocity > 0.55;
    const commit = s.progress > 0.3 || fast;
    resetGestureStyles();
    if (s.mode === "to-cart") {
      if (commit) { openDrawer(els.cartDrawer); setMobileNavActive("mobileNavCart"); }
      else { els.cartDrawer.setAttribute("aria-hidden", "true"); els.backdrop.hidden = true; }
    } else if (commit) { closeDrawers(false); setMobileNavActive("mobileNavCatalog"); }
  }
  $("main").addEventListener("pointerdown", beginCatalogSwipe);
  els.cartDrawer.addEventListener("pointerdown", beginCartSwipe);
  document.addEventListener("click", (e) => { if (performance.now() < state.swipeSuppressClickUntil) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener("pointermove", moveSwipe, { passive: false });
  document.addEventListener("pointerup", endSwipe);
  document.addEventListener("pointercancel", endSwipe);

  /* ============================================================
     DRAWERS LATERAIS (filtros mobile / pedido)
     ============================================================ */
  function openDrawer(which) {
    const wasOpen = els.cartDrawer.classList.contains("is-open") || els.filterDrawer.classList.contains("is-open");
    if (!wasOpen) state.lastFocus = document.activeElement;
    closeDrawers(false); els.backdrop.hidden = false; which.setAttribute("aria-hidden", "false"); which.classList.add("is-open"); document.body.classList.add("no-scroll");
    if (which === els.cartDrawer) els.cartOpen.setAttribute("aria-expanded", "true");
    setTimeout(() => which.querySelector(".icon-button")?.focus(), 0);
  }
  function closeDrawers(restore = true) {
    const wasOpen = els.cartDrawer.classList.contains("is-open") || els.filterDrawer.classList.contains("is-open");
    els.backdrop.hidden = true;
    [els.filterDrawer, els.cartDrawer].forEach((x) => { x.classList.remove("is-open"); x.setAttribute("aria-hidden", "true"); });
    els.cartOpen.setAttribute("aria-expanded", "false");
    if (els.modalBackdrop.hidden && els.review.hidden) document.body.classList.remove("no-scroll");
    if (wasOpen) setMobileNavActive("mobileNavCatalog");
    if (restore && wasOpen) state.lastFocus?.focus?.({ preventScroll: true });
  }
  $("#filterOpen").addEventListener("click", () => openDrawer(els.filterDrawer));
  els.cartOpen.addEventListener("click", () => openDrawer(els.cartDrawer));
  els.backdrop.addEventListener("click", () => closeDrawers());
  $$(".drawer-head [data-close-drawer]").forEach((b) => b.addEventListener("click", () => closeDrawers()));
  $("#filterApply").addEventListener("click", () => closeDrawers());

  function clearAll() { state.query = ""; state.category = "Todos"; ["materials", "brands", "colors", "finishes"].forEach((k) => state[k].clear()); syncSearch(); renderAll(); }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-clear-all]")) clearAll(); });
  els.activeFilters.addEventListener("click", (e) => {
    const b = e.target.closest("[data-remove-filter]"); if (!b) return;
    const k = b.dataset.removeFilter, v = b.dataset.value;
    if (k === "query") state.query = ""; else state[k].delete(v);
    syncSearch(); renderAll();
  });

  function setCategory(cat) {
    if (!CATEGORIAS_BARRA.includes(cat)) return;
    state.category = cat; renderAll(); scrollToCatalog();
  }
  $("#categoryNav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-category]"); if (!b) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault(); setCategory(b.dataset.category);
  });
  function scrollToCatalog() { const cat = $("#catalogo"); if (cat.getBoundingClientRect().top < 0) cat.scrollIntoView({ behavior: scrollBehavior(), block: "start" }); }
  function updateCategoryUI() {
    $$("[data-category]").forEach((b) => { const on = b.dataset.category === state.category; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
  }
  $$("[data-footer-cat]").forEach((a) => a.addEventListener("click", (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault(); setCategory(a.dataset.footerCat); $("#catalogo").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }));
  els.sort.addEventListener("change", () => { state.sort = els.sort.value; renderProducts(); });

  /* ============================================================
     BUSCA
     ============================================================ */
  function onSearch(value) { state.query = value.trim(); syncSearch(); renderAll(); renderSuggestions(value); }
  function syncSearch() {
    if (els.search.value.trim() !== state.query) els.search.value = state.query;
    if (els.searchM.value.trim() !== state.query) els.searchM.value = state.query;
    els.clear.hidden = !state.query; els.clearM.hidden = !state.query;
  }
  els.search.addEventListener("input", () => onSearch(els.search.value));
  els.searchM.addEventListener("input", () => onSearch(els.searchM.value));
  els.clear.addEventListener("click", () => { onSearch(""); els.search.focus(); });
  els.clearM.addEventListener("click", () => { onSearch(""); els.searchM.focus(); });
  function hideSuggestions() { els.suggestions.hidden = true; }
  function renderSuggestions(v) {
    const q = normalizarBusca(v.trim()); if (q.length < 2 || !state.carregado) { hideSuggestions(); return; }
    const pool = [];
    produtos.forEach((p) => { pool.push([getName(p), p._acessorio ? "Acessório" : p.material]); p.cores.forEach((c) => pool.push([c.nome, getName(p)])); });
    const seen = new Set();
    const hits = pool.filter(([a, b]) => normalizarBusca(`${a} ${b}`).includes(q) && !seen.has(a) && seen.add(a)).slice(0, 6);
    if (!hits.length) { hideSuggestions(); return; }
    els.suggestions.innerHTML = hits.map(([a, b], i) => `<button class="suggestion" id="sugg-${i}" type="button" role="option" data-suggestion="${esc(a)}"><strong>${esc(a)}</strong><small>${esc(b)}</small></button>`).join("");
    els.suggestions.hidden = false;
  }
  els.suggestions.addEventListener("click", (e) => { const b = e.target.closest("[data-suggestion]"); if (!b) return; onSearch(b.dataset.suggestion); hideSuggestions(); els.search.focus(); });
  els.search.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && !els.suggestions.hidden) { e.preventDefault(); els.suggestions.querySelector(".suggestion")?.focus(); }
    if (e.key === "Enter") { hideSuggestions(); scrollToCatalog(); }
  });
  els.searchM.addEventListener("keydown", (e) => { if (e.key === "Enter") { els.searchM.blur(); scrollToCatalog(); } });
  els.suggestions.addEventListener("keydown", (e) => {
    const items = $$(".suggestion", els.suggestions), i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); i <= 0 ? els.search.focus() : items[i - 1].focus(); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".header-search")) hideSuggestions(); });
  window.addEventListener("scroll", hideSuggestions, { passive: true });

  /* ============================================================
     NAVEGAÇÃO INFERIOR MOBILE
     ============================================================ */
  function setMobileNavActive(id) {
    [els.mobileNavCatalog, els.mobileNavSearch, els.mobileNavCart].forEach((b) => { const on = b.id === id; b.classList.toggle("is-active", on); on ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"); });
  }
  els.mobileNavCatalog.addEventListener("click", () => { closeDrawers(false); setMobileNavActive("mobileNavCatalog"); $("#catalogo").scrollIntoView({ behavior: scrollBehavior(), block: "start" }); });
  els.mobileNavSearch.addEventListener("click", () => { closeDrawers(false); setMobileNavActive("mobileNavSearch"); window.scrollTo({ top: 0, behavior: scrollBehavior() }); els.searchM.focus({ preventScroll: true }); });
  els.searchM.addEventListener("blur", () => { if (els.mobileNavSearch.classList.contains("is-active")) setMobileNavActive("mobileNavCatalog"); });
  els.mobileNavCart.addEventListener("click", () => { setMobileNavActive("mobileNavCart"); openDrawer(els.cartDrawer); });

  /* ============================================================
     CONTATO E MANUTENÇÃO 3D
     ============================================================ */
  document.addEventListener("click", (e) => { if (els.contactMenu.open && !e.target.closest("#contactMenu")) els.contactMenu.open = false; });
  function openMaintenance() {
    state.lastFocus = document.activeElement;
    closeDrawers(false); els.contactMenu.open = false;
    els.maintenance.hidden = false; document.body.classList.add("no-scroll");
    setTimeout(() => els.maintenanceClose.focus(), 0);
  }
  function closeMaintenance() {
    els.maintenance.hidden = true; document.body.classList.remove("no-scroll");
    if (location.hash === "#manutencao") { try { history.replaceState(history.state, "", location.pathname + location.search); } catch (erro) { /* sem histórico */ } }
    state.lastFocus?.focus?.({ preventScroll: true });
  }
  $$('a[href="#manutencao"]').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); openMaintenance(); }));
  els.maintenanceClose.addEventListener("click", closeMaintenance);
  els.maintenance.addEventListener("click", (e) => { if (e.target === els.maintenance) closeMaintenance(); });

  /* ============================================================
     TOAST
     ============================================================ */
  function toast(msg, { action = false, icon = false } = {}) {
    els.toastMsg.innerHTML = (icon ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"></path></svg>' : "") + `<span>${esc(msg)}</span>`;
    els.toastAction.hidden = !action;
    els.toast.classList.toggle("toast--top", state.zoomOpen || !els.modalBackdrop.hidden); // não cobre a barra de compra
    els.toast.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { els.toast.hidden = true; }, action ? 4000 : 2400);
  }
  els.toastAction.addEventListener("click", () => {
    els.toast.hidden = true;
    if (state.zoomOpen) closeZoom(false);
    if (!els.modalBackdrop.hidden) closeModal();
    setMobileNavActive("mobileNavCart"); openDrawer(els.cartDrawer);
  });
  els.toast.addEventListener("mouseenter", () => clearTimeout(toast.t));
  els.toast.addEventListener("mouseleave", () => { toast.t = setTimeout(() => { els.toast.hidden = true; }, 1600); });

  /* ============================================================
     TECLADO E FOCO
     ============================================================ */
  function activeLayer() {
    if (state.zoomOpen) return els.zoomModal;
    if (!els.modalBackdrop.hidden) return els.modal;
    if (!els.review.hidden) return els.reviewModal;
    if (!els.maintenance.hidden) return els.maintenanceModal;
    if (els.cartDrawer.classList.contains("is-open")) return els.cartDrawer;
    if (els.filterDrawer.classList.contains("is-open")) return els.filterDrawer;
    return null;
  }
  function trapFocus(e, layer) {
    const f = $$('button:not([disabled]),[href],input:not([disabled]),select,textarea,summary,[tabindex]:not([tabindex="-1"])', layer).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!layer.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener("keydown", (e) => {
    const layer = activeLayer();
    if (e.key === "Tab" && layer) { trapFocus(e, layer); return; }
    if (e.key === "Escape") {
      if (!els.suggestions.hidden) { hideSuggestions(); return; }
      if (els.contactMenu.open) { els.contactMenu.open = false; els.contactMenu.querySelector("summary").focus(); return; }
      if (state.zoomOpen) closeZoom();
      else if (!els.modalBackdrop.hidden) closeModal();
      else if (!els.review.hidden) closeReview();
      else if (!els.maintenance.hidden) closeMaintenance();
      else closeDrawers();
      return;
    }
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && state.modal && (state.zoomOpen || !els.modalBackdrop.hidden)) {
      if (e.target.closest("input, select, textarea")) return;
      e.preventDefault(); moveModalVariant(e.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (state.zoomOpen && (e.key === "+" || e.key === "=")) setZoom(state.zoomScale + 0.5);
    if (state.zoomOpen && e.key === "-") setZoom(state.zoomScale - 0.5);
    if (state.zoomOpen && e.key === "0") resetZoom();
  });

  /* ============================================================
     CARREGAMENTO DO CATÁLOGO
     ============================================================ */
  async function buscarCatalogoJson(caminho, limiteMs = 2500) {
    const controlador = new AbortController();
    const temporizador = window.setTimeout(() => controlador.abort(), limiteMs);
    try {
      const resposta = await fetch(obterUrlSemCache3ZK(caminho), { cache: "no-store", signal: controlador.signal });
      if (!resposta.ok) return null;
      const dados = await resposta.json();
      if (!Array.isArray(dados)) return null;
      return dados.some((produto) => produto && Array.isArray(produto.cores)) ? dados : null;
    } catch (erro) {
      if (erro?.name !== "AbortError") console.warn(`[3ZK] Falha ao ler ${caminho}.`, erro);
      return null;
    } finally {
      window.clearTimeout(temporizador);
    }
  }

  function renderDiretorio() {
    if (!els.seoDirectory || els.seoDirectory.dataset.prerender) return;
    els.seoDirectory.innerHTML = `<details><summary>Explorar todos os produtos por nome</summary><div class="seo-directory-grid">${produtos.map((p) => `<a href="${esc(productHref(p))}">${esc(getName(p))}</a>`).join("")}</div></details>`;
    els.seoDirectory.hidden = false;
  }

  function aplicarLinkDireto() {
    const parametros = new URLSearchParams(window.location.search);
    const slug = parametros.get("produto");
    if (slug) {
      const p = produtos.find((x) => obterSlugProduto(x) === slug || x._slugSeo === slug);
      if (p) {
        const cor = parametros.get("cor");
        const i = cor ? p.cores.findIndex((c) => c._slug === cor) : -1;
        state.urlAntesDoProduto = location.href;
        state.lastFocus = els.grid;
        openProduct(p, i >= 0 ? i : undefined);
      }
    }
    const categoria = parametros.get("categoria");
    if (categoria) {
      const alvo = CATEGORIAS_BARRA.find((c) => slugificar(c) === slugificar(categoria));
      if (alvo) { state.category = alvo; renderAll(); }
    }
    if (parametros.get("abrirPedido") === "1") window.setTimeout(() => { setMobileNavActive("mobileNavCart"); openDrawer(els.cartDrawer); }, 80);
    if (location.hash === "#manutencao") openMaintenance();
  }

  async function carregarProdutos() {
    try {
      const parametros = new URLSearchParams(window.location.search);
      let dados = null;
      // O catálogo oficial é sempre a fonte padrão, inclusive no Live Server.
      // O preview só é usado quando o endereço contém explicitamente ?preview=1.
      if (parametros.get("preview") === "1") dados = await buscarCatalogoJson("dados/produtos-preview.json", 1200);
      if (!dados) dados = await buscarCatalogoJson("dados/produtos.json", 5000);
      if (!dados) throw new Error("Não foi possível carregar uma lista válida de produtos.");

      controleCatalogo = await carregarControleCatalogo();
      const produtosValidos = dados.filter((produto) => produto && Array.isArray(produto.cores));
      produtos = prepararProdutos(aplicarControleCatalogo(produtosValidos));
      reconciliarCarrinhoComCatalogo();
      state.carregado = true;
      document.dispatchEvent(new CustomEvent("3zk:produtos-carregados"));

      renderAll();
      renderizarCarrinho();
      renderDiretorio();
      aplicarLinkDireto();
    } catch (erro) {
      console.error("[3ZK] Erro ao carregar o catálogo:", erro);
      els.grid.removeAttribute("aria-busy");
      if (!els.grid.querySelector(".product-card")) {
        els.grid.hidden = true;
        els.empty.hidden = false;
        els.emptyTitle.textContent = "Não foi possível carregar os produtos";
        els.emptyText.textContent = "Atualize a página. Se estiver testando localmente, confirme se dados/produtos.json existe.";
        els.emptyAction.hidden = true;
        els.resultCount.textContent = "0";
      }
    }
  }

  preencherDadosFormulario();
  sincronizarCodigoPedidoComCarrinho();
  renderizarCarrinho();
  syncSearch();

  // Ao voltar pelo botão do navegador, descarta a cópia congelada pelo bfcache.
  window.addEventListener("pageshow", (evento) => { if (evento.persisted) window.location.reload(); });

  carregarProdutos();
})();
