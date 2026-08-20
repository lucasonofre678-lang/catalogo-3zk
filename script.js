/* ============================================================
   DADOS DOS PRODUTOS
   Agora os produtos são carregados de dados/produtos.json.
   ============================================================ */
let produtos = [];
let controleCatalogo = {
  versao: 1,
  produtosPausados: [],
  coresPausadas: []
};

/* ============================================================
   CONFIGURAÇÕES QUE VOCÊ PODE ALTERAR
   ============================================================ */

// TROQUE O NÚMERO ABAIXO SOMENTE SE O WHATSAPP DA LOJA MUDAR.
const WHATSAPP_NUMERO = "554184539430";

// TROQUE ESTE LINK PELO ENDEREÇO PRINCIPAL OU PELO LINK PADRÃO DE COMPRA.
const LINK_LOJA_PADRAO = "https://3zkfilamentos.com.br/";

/*
  NOMES AUTOMÁTICOS DAS FOTOS:
  assets/fotos/nome-do-produto/nome-da-cor.webp

  Exemplo:
  assets/fotos/flashforge-pla/azul-esverdeado.webp

  Basta colocar a foto na pasta correta. Não é necessário cadastrar
  o caminho de cada imagem manualmente.
*/

/* ============================================================
   ELEMENTOS PRINCIPAIS
   ============================================================ */
const listaProdutosEl = document.getElementById("lista-produtos");
const estadoVazioEl = document.getElementById("estado-vazio");
const campoBuscaEl = document.getElementById("campo-busca");
const filtrosEl = document.getElementById("filtros-material");

const formatarPreco = (valor) => {
  const numero = Number(valor) || 0;

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
    maximumFractionDigits: 2
  });
};

function obterCorVisual(cor) {
  return cor?._visualExtraidoFoto || obterVisualCatalogoCor(cor).css;
}

function obterHexBaseVisual(cor) {
  return cor?._visualExtraidoFoto || obterVisualCatalogoCor(cor).hexBase;
}

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugificar(texto = "") {
  return normalizar(texto)
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  "marmorizado": {
    css: "linear-gradient(135deg, #E2E0DA 0%, #BFC0BC 48%, #EBE8E1 100%)",
    hexBase: "#D8D6D0"
  },
  "marmore": {
    css: "linear-gradient(135deg, #E0DDD6 0%, #C8C5BD 48%, #F0EEE9 100%)",
    hexBase: "#D7D3CB"
  },
  "rainbow": {
    css: "linear-gradient(135deg, #E4868E 0%, #E9B46B 27%, #78C78B 53%, #6EA0D8 76%, #B98BD4 100%)",
    hexBase: "#D98A92"
  },
  "silk rainbow": {
    css: "linear-gradient(135deg, #E98A9C 0%, #F0C468 25%, #79CC93 52%, #6FA2E2 77%, #BE92DB 100%)",
    hexBase: "#DE8D97"
  },
  "fosforescente natural/rainbow": {
    css: "linear-gradient(135deg, #ECE9DC 0%, #A8DAF6 25%, #B6E2A9 50%, #F2C26E 75%, #D3B0EB 100%)",
    hexBase: "#ECE9DC"
  },
  "fosforescente natural/azul": {
    css: "linear-gradient(135deg, #ECE9DD 0%, #8EC3EA 100%)",
    hexBase: "#ECE9DD"
  },
  "fosforescente natural/verde": {
    css: "linear-gradient(135deg, #ECE9DD 0%, #A8D49C 100%)",
    hexBase: "#ECE9DD"
  },
  "silk vermelho purpura": {
    css: "linear-gradient(135deg, #D94D54 0%, #B54B94 100%)",
    hexBase: "#D05B7D"
  },
  "dreamy crystal preto/vermelho": {
    css: "linear-gradient(135deg, #1F2228 0%, #B84A52 100%)",
    hexBase: "#6D444A"
  },
  "transparente preto/azul com glitter": {
    css: "linear-gradient(135deg, #18202A 0%, #356EA8 100%)",
    hexBase: "#243F67"
  }
};

const PALETA_TOKEN_COR = {
  preto: "#171B22",
  black: "#171B22",
  branco: "#E8E8E2",
  white: "#E8E8E2",
  natural: "#E6E7E2",
  transparente: "#E2E4E2",
  translucido: "#E1E3E2",
  translucent: "#E1E3E2",
  cinza: "#8B9096",
  gray: "#8B9096",
  grey: "#8B9096",
  prata: "#B3B8BE",
  silver: "#B3B8BE",
  dourado: "#C99A3E",
  gold: "#C99A3E",
  bronze: "#8D744A",
  champagne: "#D5B77B",
  cobre: "#B87343",
  marrom: "#6B4B33",
  brown: "#6B4B33",
  cafe: "#6C4F44",
  madeira: "#8E7957",
  wood: "#9B7651",
  pele: "#C79A7D",
  skin: "#C79A7D",
  bege: "#D6C3A1",
  beige: "#D6C3A1",
  creme: "#E4D6B8",
  amendoa: "#90749E",
  amêndoa: "#90749E",
  amarelo: "#E2C53E",
  yellow: "#E2C53E",
  manga: "#F1B82F",
  abacaxi: "#C9AE39",
  mel: "#D4A34E",
  limao: "#C7D64A",
  limão: "#C7D64A",
  laranja: "#D97A39",
  orange: "#D97A39",
  tangerina: "#E95E2E",
  coral: "#D56F5C",
  vermelho: "#C94843",
  red: "#C94843",
  rosa: "#D96A96",
  pink: "#D96A96",
  fuchsia: "#C55C92",
  roxo: "#8253A1",
  purple: "#8253A1",
  violeta: "#7E5AC7",
  purpura: "#B14C8D",
  púrpura: "#B14C8D",
  lavanda: "#B49BC8",
  lavender: "#C7B8E8",
  azul: "#4A7FCF",
  blue: "#4A7FCF",
  ciano: "#0B89DC",
  azure: "#3A8CA3",
  safira: "#4F8FD4",
  oceano: "#4C98B5",
  ocean: "#4C98B5",
  peacock: "#466F78",
  ceu: "#5AAFCB",
  céu: "#5AAFCB",
  verde: "#59A06A",
  green: "#59A06A",
  floresta: "#315B42",
  forest: "#315B42",
  menta: "#8FC9A8",
  mint: "#8FC9A8",
  melao: "#A7D0B8",
  melao: "#A7D0B8",
  mar: "#5AA8A0",
  sea: "#5AA8A0",
  oliva: "#79814E",
  olive: "#79814E",
  esverdeado: "#83A064",
  greenery: "#83A064"
};

const TOKENS_IGNORADOS_COR = new Set([
  "silk", "dual", "duo", "color", "tricolor", "termo", "com", "glitter",
  "fosforescente", "fosco", "new", "master", "pcv", "outdoor", "dark",
  "cool", "light", "hot", "space", "dreamy", "crystal"
]);

function misturarCores(hexA, hexB, fator = 0.5) {
  const corA = hexParaRgb(hexA);
  const corB = hexParaRgb(hexB);
  const mistura = {
    r: Math.round(corA.r + (corB.r - corA.r) * fator),
    g: Math.round(corA.g + (corB.g - corA.g) * fator),
    b: Math.round(corA.b + (corB.b - corA.b) * fator)
  };

  return rgbParaHex(mistura);
}

function hexParaRgb(hex) {
  const valor = String(hex || "").trim().replace("#", "");

  if (!/^[0-9a-f]{6}$/i.test(valor)) {
    return { r: 204, g: 204, b: 204 };
  }

  return {
    r: Number.parseInt(valor.slice(0, 2), 16),
    g: Number.parseInt(valor.slice(2, 4), 16),
    b: Number.parseInt(valor.slice(4, 6), 16)
  };
}

function rgbParaHex({ r, g, b }) {
  const paraHex = (valor) =>
    Number(valor)
      .toString(16)
      .padStart(2, "0");

  return `#${paraHex(r)}${paraHex(g)}${paraHex(b)}`;
}

function montarGradienteVisual(cores) {
  const lista = [...new Set(cores.filter(Boolean))];

  if (lista.length <= 1) {
    return lista[0] || "#cccccc";
  }

  if (lista.length === 2) {
    return `linear-gradient(135deg, ${lista[0]} 0 48%, ${lista[1]} 52% 100%)`;
  }

  const passo = 100 / lista.length;
  const paradas = lista.map((cor, indice) => {
    const inicio = Math.round(indice * passo);
    const fim = Math.round((indice + 1) * passo);
    return `${cor} ${inicio}% ${fim}%`;
  });

  return `conic-gradient(from 220deg, ${paradas.join(", ")})`;
}

function extrairTokensDeCor(nome) {
  return normalizar(nome)
    .replace(/[^a-z0-9/]+/g, " ")
    .split(/[\s/]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !TOKENS_IGNORADOS_COR.has(token));
}

function obterCoresDoNome(nome) {
  const tokens = extrairTokensDeCor(nome);
  const cores = [];

  tokens.forEach((token) => {
    if (PALETA_TOKEN_COR[token]) {
      cores.push(PALETA_TOKEN_COR[token]);
    }
  });

  return [...new Set(cores)];
}

function nomeIndicaMulticor(nome) {
  const valor = normalizar(nome);
  const possuiBarraDireta = /\S\/\S/.test(String(nome || ""));

  return (
    possuiBarraDireta ||
    ["dual", "duo", "tricolor", "rainbow", "macaron", " e ", "termo"]
      .some((trecho) => valor.includes(trecho))
  );
}

function obterVisualCatalogoCor(cor) {
  const nomeNormalizado = normalizar(cor?.nome || "");
  const hexOriginal = cor?.hex || "#D9DFE8";

  if (VISUAL_COR_EXATO[nomeNormalizado]) {
    return VISUAL_COR_EXATO[nomeNormalizado];
  }

  if (cor?.gradiente) {
    return {
      css: cor.gradiente,
      hexBase: hexOriginal
    };
  }

  if ((cor?.efeito || "") === "glass") {
    const base = hexOriginal;
    const claro = misturarCores(base, "#FFFFFF", 0.42);
    return {
      css: `linear-gradient(135deg, ${claro} 0%, ${base} 100%)`,
      hexBase: claro
    };
  }

  const coresDoNome = obterCoresDoNome(cor?.nome || "");

  if (coresDoNome.length >= 2 && nomeIndicaMulticor(cor?.nome || "")) {
    return {
      css: montarGradienteVisual(coresDoNome),
      hexBase: coresDoNome[0]
    };
  }

  if (coresDoNome.length === 1) {
    return {
      css: coresDoNome[0],
      hexBase: coresDoNome[0]
    };
  }

  return {
    css: hexOriginal,
    hexBase: hexOriginal
  };
}


/* ============================================================
   CONTROLE MANUAL DO CATÁLOGO
   Produtos e cores podem ser pausados sem serem apagados.
   O arquivo dados/controle-catalogo.json é administrado pelo
   Painel Local 3ZK e tem prioridade sobre o estoque da Olist.
   ============================================================ */
function obterIdCatalogoProduto(produto) {
  const idSalvo = String(produto?.idCatalogo || "").trim();

  if (idSalvo) {
    return idSalvo;
  }

  return [
    slugificar(produto?.marca || ""),
    slugificar(produto?.material || ""),
    slugificar(produto?.linha || "")
  ].join("|");
}

function obterIdCatalogoCor(produto, cor) {
  const idSalvo = String(cor?.idCatalogo || "").trim();

  if (idSalvo) {
    return idSalvo;
  }

  return `${obterIdCatalogoProduto(produto)}|${slugificar(cor?.nome || "")}`;
}

function normalizarListaControle(valor) {
  if (!Array.isArray(valor)) {
    return [];
  }

  return [...new Set(
    valor
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  )];
}

function normalizarControleCatalogo(valor) {
  const controle = valor && typeof valor === "object"
    ? valor
    : {};

  return {
    versao: 1,
    atualizadoEm: controle.atualizadoEm || null,
    produtosPausados: normalizarListaControle(
      controle.produtosPausados
    ),
    coresPausadas: normalizarListaControle(
      controle.coresPausadas
    )
  };
}

async function carregarControleCatalogo() {
  try {
    const resposta = await fetch("dados/controle-catalogo.json", {
      cache: "no-store"
    });

    if (resposta.status === 404) {
      return normalizarControleCatalogo({});
    }

    if (!resposta.ok) {
      throw new Error(
        `controle-catalogo.json respondeu ${resposta.status}`
      );
    }

    return normalizarControleCatalogo(await resposta.json());
  } catch (erro) {
    /*
      Segurança operacional: uma falha no arquivo de controle não derruba
      o catálogo. O site continua usando somente o estoque da Olist.
    */
    console.warn(
      "[3ZK] Controle manual indisponível. Catálogo mantido ativo.",
      erro
    );

    return normalizarControleCatalogo({});
  }
}

function produtoEstaPausado(produto) {
  return controleCatalogo.produtosPausados.includes(
    obterIdCatalogoProduto(produto)
  );
}

function corEstaPausada(produto, cor) {
  return controleCatalogo.coresPausadas.includes(
    obterIdCatalogoCor(produto, cor)
  );
}

function aplicarControleCatalogo(lista) {
  return lista
    .filter((produto) => !produtoEstaPausado(produto))
    .map((produto) => ({
      ...produto,
      cores: produto.cores.filter(
        (cor) => !corEstaPausada(produto, cor) && corEstaDisponivel(cor)
      )
    }))
    .filter((produto) => produto.cores.length > 0);
}

function obterNomeCompletoProduto(produto) {
  const partes = [produto.marca, produto.material];

  if (produto.linha) {
    partes.push(produto.linha);
  }

  return partes.join(" ");
}

function obterPastaProduto(produto) {
  return slugificar(obterNomeCompletoProduto(produto));
}

/*
  Cada cor pode ter uma ou várias fotos.

  Exemplo no produtos.json:
  "imagens": [
    "assets/fotos/flashforge-pla/vermelho-coral.webp",
    "assets/fotos/flashforge-pla/vermelho-coral-2.webp"
  ]
*/
function obterFotosCor(produto, cor) {
  if (Array.isArray(cor.imagens) && cor.imagens.length > 0) {
    return [...new Set(
      cor.imagens.filter(
        (caminho) => typeof caminho === "string" && caminho.trim()
      )
    )];
  }

  if (cor.imagem) {
    return [cor.imagem];
  }

  return [
    `assets/fotos/${obterPastaProduto(produto)}/${slugificar(cor.nome)}.webp`
  ];
}

const cacheCorExtraidaDaFoto = new Map();

const MAPA_COR_SOLIDA_DA_FOTO = {
  "assets/fotos/anycubic-petg/laranja.webp": "#D75A2E",
  "assets/fotos/closin-petg/amarelo.webp": "#D3B53E",
  "assets/fotos/closin-petg/azul.webp": "#3E4F89",
  "assets/fotos/closin-petg/branco.webp": "#C9CCCD",
  "assets/fotos/closin-petg/cinza.webp": "#838686",
  "assets/fotos/closin-petg/fluo-blue.webp": "#182A8D",
  "assets/fotos/closin-petg/fluo-green.webp": "#45B123",
  "assets/fotos/closin-petg/fluo-yellow.webp": "#BFDB20",
  "assets/fotos/closin-petg/laranja.webp": "#D46F2F",
  "assets/fotos/closin-petg/pink.webp": "#E95F97",
  "assets/fotos/closin-petg/preto.webp": "#23232B",
  "assets/fotos/closin-petg/rosa.webp": "#E95E96",
  "assets/fotos/closin-petg/silver-prateado.webp": "#ACACA9",
  "assets/fotos/closin-petg/skin.webp": "#806450",
  "assets/fotos/closin-petg/verde.webp": "#3E7C64",
  "assets/fotos/closin-petg/vermelho.webp": "#9C3642",
  "assets/fotos/closin-pla/amarelo.webp": "#DDC54E",
  "assets/fotos/closin-pla/azul.webp": "#245AB0",
  "assets/fotos/closin-pla/branco-perola.webp": "#D8DADA",
  "assets/fotos/closin-pla/branco.webp": "#D0D4D4",
  "assets/fotos/closin-pla/ciano.webp": "#1287D9",
  "assets/fotos/closin-pla/fluo-blue.webp": "#2579D9",
  "assets/fotos/closin-pla/fluo-green.webp": "#5FD844",
  "assets/fotos/closin-pla/fluo-red.webp": "#CE303A",
  "assets/fotos/closin-pla/fluo-yellow.webp": "#E8CC53",
  "assets/fotos/closin-pla/gold.webp": "#886548",
  "assets/fotos/closin-pla/lemon-green.webp": "#87C394",
  "assets/fotos/closin-pla/marrom-claro.webp": "#755D4B",
  "assets/fotos/closin-pla/natural.webp": "#DCDEDC",
  "assets/fotos/closin-pla/pink-rosa-bebe.webp": "#E97A84",
  "assets/fotos/closin-pla/preto.webp": "#2D2824",
  "assets/fotos/closin-pla/silver.webp": "#A19C9B",
  "assets/fotos/closin-pla/skin.webp": "#BB9A83",
  "assets/fotos/closin-pla/transparente.webp": "#DBDAD9",
  "assets/fotos/closin-pla/verde.webp": "#44956D",
  "assets/fotos/closin-pla/vermelho.webp": "#BC3D48",
  "assets/fotos/closin-pla/violeta.webp": "#7C64B3",
  "assets/fotos/closin-pla/wood.webp": "#AAA296",
  "assets/fotos/creality-soleyin-ultra-pla/cinza.webp": "#7C8085",
  "assets/fotos/creality-soleyin-ultra-pla/rosehip.webp": "#DA6236",
  "assets/fotos/creality-soleyin-ultra-pla/strawberry-milk.webp": "#924A4B",
  "assets/fotos/creality-soleyin-ultra-pla/verde-claro.webp": "#8CB19F",
  "assets/fotos/elegoo-pla/grey.webp": "#797D7D",
  "assets/fotos/elegoo-pla/orange.webp": "#D05E3A",
  "assets/fotos/elegoo-pla/purple.webp": "#614C78",
  "assets/fotos/elegoo-pla/red.webp": "#A4413A",
  "assets/fotos/elegoo-pla/sky-blue.webp": "#59B3D0",
  "assets/fotos/elegoo-pla/space-grey.webp": "#5B6062",
  "assets/fotos/flashforge-pla/azul-esverdeado.webp": "#5898A6",
  "assets/fotos/flashforge-pla/laranja-escuro.webp": "#923122",
  "assets/fotos/flashforge-pla/vermelho-coral.webp": "#A14647",
  "assets/fotos/fusion-high-speed-petg/branco.webp": "#D5D3CE",
  "assets/fotos/fusionx-petg/amarelo-canario.webp": "#BB9361",
  "assets/fotos/fusionx-petg/amarelo.webp": "#AD893B",
  "assets/fotos/fusionx-petg/azul-marinho.webp": "#364F80",
  "assets/fotos/fusionx-petg/cafe.webp": "#6D5045",
  "assets/fotos/fusionx-petg/ciano.webp": "#498EA4",
  "assets/fotos/fusionx-petg/laranja.webp": "#DF5143",
  "assets/fotos/fusionx-petg/limao-siciliano.webp": "#D1B636",
  "assets/fotos/fusionx-petg/pink-purple-violeta.webp": "#7E60A6",
  "assets/fotos/fusionx-petg/tangerina.webp": "#F03E2D",
  "assets/fotos/fusionx-petg/verde-agua.webp": "#39989D",
  "assets/fotos/fusionx-petg/verde-escuro.webp": "#424751",
  "assets/fotos/fusionx-petg/verde.webp": "#467C54",
  "assets/fotos/masterprint-abs/amarelo.webp": "#DDCD3E",
  "assets/fotos/masterprint-abs/azul.webp": "#26548B",
  "assets/fotos/masterprint-abs/cinza.webp": "#909391",
  "assets/fotos/masterprint-abs/dourado.webp": "#C99244",
  "assets/fotos/masterprint-abs/laranja.webp": "#EC6240",
  "assets/fotos/masterprint-abs/marrom.webp": "#654F3C",
  "assets/fotos/masterprint-abs/natural.webp": "#D6D3C7",
  "assets/fotos/masterprint-abs/prata.webp": "#C0C6C1",
  "assets/fotos/masterprint-abs/preto.webp": "#3C4345",
  "assets/fotos/masterprint-abs/rosa.webp": "#DE6381",
  "assets/fotos/masterprint-abs/roxo.webp": "#6C4E9C",
  "assets/fotos/masterprint-abs/verde.webp": "#2F6E6E",
  "assets/fotos/masterprint-petg/amarelo.webp": "#E0B928",
  "assets/fotos/masterprint-petg/azul.webp": "#315FA8",
  "assets/fotos/masterprint-petg/branco.webp": "#F2F2F0",
  "assets/fotos/masterprint-petg/branco-pcv-outdoor.webp": "#ECEDE8",
  "assets/fotos/masterprint-petg/bronze.webp": "#4E4B37",
  "assets/fotos/masterprint-petg/cinza.webp": "#979690",
  "assets/fotos/masterprint-petg/cool-grey.webp": "#4F504E",
  "assets/fotos/masterprint-petg/dourado.webp": "#B58B3A",
  "assets/fotos/masterprint-petg/fluorescente-roxo.webp": "#5E4C8B",
  "assets/fotos/masterprint-petg/fosco-branco.webp": "#E7E5DE",
  "assets/fotos/masterprint-petg/green-olive.webp": "#55553C",
  "assets/fotos/masterprint-petg/laranja.webp": "#E8752D",
  "assets/fotos/masterprint-petg/lavanda.webp": "#665A91",
  "assets/fotos/masterprint-petg/madeira.webp": "#817158",
  "assets/fotos/masterprint-petg/marrom.webp": "#684630",
  "assets/fotos/masterprint-petg/prata.webp": "#6E6F6D",
  "assets/fotos/masterprint-petg/preto-sem-foto.webp": "#1B1B1B",
  "assets/fotos/masterprint-petg/rosa.webp": "#D96F98",
  "assets/fotos/masterprint-petg/roxo.webp": "#663C68",
  "assets/fotos/masterprint-petg/skin.webp": "#B48E7A",
  "assets/fotos/masterprint-petg/translucido-amarelo.webp": "#C1905E",
  "assets/fotos/masterprint-petg/translucido-azul.webp": "#8FB6D4",
  "assets/fotos/masterprint-petg/translucido-branco.webp": "#DDE2E3",
  "assets/fotos/masterprint-petg/translucido-verde.webp": "#729998",
  "assets/fotos/masterprint-petg/translucido-vermelho.webp": "#AD474F",
  "assets/fotos/masterprint-petg/translucido-vermelho-2.webp": "#AD474F",
  "assets/fotos/masterprint-petg/transparente.webp": "#D7D9D7",
  "assets/fotos/masterprint-petg/verde-sem-foto.webp": "#3E8B57",
  "assets/fotos/masterprint-petg/vermelho.webp": "#B5343A",
  "assets/fotos/masterprint-pla/branco.webp": "#D9DED9",
  "assets/fotos/masterprint-pla/cinza-metalico.webp": "#717471",
  "assets/fotos/masterprint-pla/cinza.webp": "#A1A3A2",
  "assets/fotos/masterprint-pla/cobre-esverdeado.webp": "#77735B",
  "assets/fotos/masterprint-pla/cobre.webp": "#5A3326",
  "assets/fotos/masterprint-pla/dourado.webp": "#89652D",
  "assets/fotos/masterprint-pla/dragon-fruit.webp": "#873869",
  "assets/fotos/masterprint-pla/fosco-cinza-fossil.webp": "#656A6E",
  "assets/fotos/masterprint-pla/fosco-roxo.webp": "#76616E",
  "assets/fotos/masterprint-pla/laranja.webp": "#EA6F37",
  "assets/fotos/masterprint-pla/peacock-blue.webp": "#466A73",
  "assets/fotos/masterprint-pla/prata-master.webp": "#ADB2B4",
  "assets/fotos/masterprint-pla/prata.webp": "#83898B",
  "assets/fotos/masterprint-pla/roxo-claro.webp": "#AFA1BA",
  "assets/fotos/masterprint-pla/silk-azul-azure.webp": "#557498",
  "assets/fotos/masterprint-pla/silk-cobre.webp": "#985C48",
  "assets/fotos/masterprint-pla/silk-fuchsia.webp": "#AD5571",
  "assets/fotos/masterprint-pla/silk-lavanda.webp": "#6E669F",
  "assets/fotos/masterprint-pla/silk-roxo.webp": "#7F4785",
  "assets/fotos/masterprint-pla/silk-vermelho-purpura.webp": "#D55489",
  "assets/fotos/masterprint-tpr/amarelo.webp": "#D3A84F",
  "assets/fotos/masterprint-tpr/azul.webp": "#3A4A6C",
  "assets/fotos/masterprint-tpr/branco.webp": "#D1D5D3",
  "assets/fotos/masterprint-tpr/preto.webp": "#1B202D",
  "assets/fotos/masterprint-tpr/verde.webp": "#2F5E54",
  "assets/fotos/masterprint-tpr/vermelho.webp": "#BD5051",
  "assets/fotos/masterprint-tpu/branco.webp": "#C3CACE",
  "assets/fotos/masterprint-tpu/cinza.webp": "#93999C",
  "assets/fotos/masterprint-tpu/preto.webp": "#1A1B23",
  "assets/fotos/multifila-pla/branco-real.webp": "#B6B8AF",
  "assets/fotos/multifila-pla/silk-azul-safira-real.webp": "#2B5994",
  "assets/fotos/multifila-pla/silk-cobre-real.webp": "#774531",
  "assets/fotos/multifila-pla/silk-ouro-envelhecido-real.webp": "#A07934",
  "assets/fotos/multifila-pla/silk-verde-real.webp": "#466C3E",
  "assets/fotos/multifila-pla/silk-vermelho-real.webp": "#9D3232",
  "assets/fotos/polyflow-pla/amarelo.webp": "#DBA634",
  "assets/fotos/polyflow-pla/azul-escuro.webp": "#29315B",
  "assets/fotos/polyflow-pla/azul-tiffany.webp": "#40BBAB",
  "assets/fotos/polyflow-pla/bege.webp": "#D0B995",
  "assets/fotos/polyflow-pla/branco-dental.webp": "#D3D6D2",
  "assets/fotos/polyflow-pla/cinza-claro.webp": "#AFAFA9",
  "assets/fotos/polyflow-pla/marrom-chocolate.webp": "#3F312A",
  "assets/fotos/polyflow-pla/preto.webp": "#1E1F1F",
  "assets/fotos/polyflow-pla/rosa-neon.webp": "#F13663",
  "assets/fotos/polyflow-pla/roxo.webp": "#4F3C66",
  "assets/fotos/polyflow-pla/verde-limao.webp": "#B0B567",
  "assets/fotos/polyflow-pla/verde-neon.webp": "#84E413",
  "assets/fotos/polyflow-pla/verde.webp": "#226540",
  "assets/fotos/polyflow-pla/vermelho.webp": "#A03139",
  "assets/fotos/rolo-etiqueta-termica/200-etiquetas-1.webp": "#DDDED9",
  "assets/fotos/rolo-etiqueta-termica/500-etiquetas-1.webp": "#D1D1D1",
};
function nomeIndicaCorSolida(cor) {
  const nome = normalizar(cor?.nome || "");

  if (!nome) {
    return false;
  }

  if (cor?.gradiente) {
    return false;
  }

  if ((cor?.efeito || "") === "glass") {
    return false;
  }

  return ![
    "dual", "duo", "tricolor", "rainbow", "macaron", "termo",
    "marmorizado", "marmore", "mármore", "glitter"
  ].some((trecho) => nome.includes(trecho)) && !/\S\/\S/.test(cor?.nome || "");
}

function carregarImagemCor(caminho) {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image();
    imagem.decoding = "async";
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () => rejeitar(new Error(`Falha ao carregar ${caminho}`));
    imagem.src = caminho;
  });
}

function rgbParaHsl(r, g, b) {
  const vermelho = r / 255;
  const verde = g / 255;
  const azul = b / 255;
  const maximo = Math.max(vermelho, verde, azul);
  const minimo = Math.min(vermelho, verde, azul);
  const luminosidade = (maximo + minimo) / 2;
  const diferenca = maximo - minimo;

  if (diferenca === 0) {
    return { h: 0, s: 0, l: luminosidade };
  }

  const saturacao = luminosidade > 0.5
    ? diferenca / (2 - maximo - minimo)
    : diferenca / (maximo + minimo);

  let matiz = 0;

  switch (maximo) {
    case vermelho:
      matiz = (verde - azul) / diferenca + (verde < azul ? 6 : 0);
      break;
    case verde:
      matiz = (azul - vermelho) / diferenca + 2;
      break;
    default:
      matiz = (vermelho - verde) / diferenca + 4;
      break;
  }

  return { h: matiz / 6, s: saturacao, l: luminosidade };
}

function analisarCorDaFoto(imagem, cor) {
  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d", { willReadFrequently: true });

  if (!contexto) {
    return null;
  }

  const largura = 90;
  const altura = 120;
  canvas.width = largura;
  canvas.height = altura;
  contexto.drawImage(imagem, 0, 0, largura, altura);

  const dados = contexto.getImageData(0, 0, largura, altura).data;
  const base = hexParaRgb(cor?.hex || "#cccccc");
  const baseHsl = rgbParaHsl(base.r, base.g, base.b);
  const usarFiltroSaturacao = baseHsl.s >= 0.18 && baseHsl.l > 0.16 && baseHsl.l < 0.85;
  const grupos = new Map();

  for (let y = 18; y < 102; y += 2) {
    for (let x = 22; x < 68; x += 2) {
      const indice = (y * largura + x) * 4;
      const r = dados[indice];
      const g = dados[indice + 1];
      const b = dados[indice + 2];
      const a = dados[indice + 3];

      if (a < 220) continue;

      const { s, l } = rgbParaHsl(r, g, b);

      if (l > 0.96 || l < 0.05) continue;
      if (usarFiltroSaturacao && s < 0.16) continue;
      if (l > 0.88 && s < 0.18) continue;

      const distanciaBase = Math.hypot(r - base.r, g - base.g, b - base.b);
      if (usarFiltroSaturacao && distanciaBase > 135) continue;

      const bucket = [r, g, b]
        .map((valor) => Math.min(255, Math.round(valor / 16) * 16))
        .join(",");

      const pesoCentro = 1 - Math.abs(x - largura / 2) / (largura / 2);
      const peso = (0.65 + pesoCentro * 0.7) * (1.2 - Math.min(distanciaBase, 180) / 240);
      const atual = grupos.get(bucket) || { peso: 0, r: 0, g: 0, b: 0 };
      atual.peso += peso;
      atual.r += r * peso;
      atual.g += g * peso;
      atual.b += b * peso;
      grupos.set(bucket, atual);
    }
  }

  const melhor = [...grupos.values()].sort((a, b) => b.peso - a.peso)[0];
  if (!melhor || melhor.peso <= 0) {
    return null;
  }

  const resultado = rgbParaHex({
    r: Math.round(melhor.r / melhor.peso),
    g: Math.round(melhor.g / melhor.peso),
    b: Math.round(melhor.b / melhor.peso)
  });

  const distanciaFinal = Math.hypot(
    hexParaRgb(resultado).r - base.r,
    hexParaRgb(resultado).g - base.g,
    hexParaRgb(resultado).b - base.b
  );

  if (distanciaFinal > 145) {
    return null;
  }

  return resultado;
}

async function obterCorSolidaDaFoto(produto, cor) {
  if (!nomeIndicaCorSolida(cor)) {
    return null;
  }

  const caminhos = obterFotosCor(produto, cor);
  const corMapeada = caminhos.find((caminho) => MAPA_COR_SOLIDA_DA_FOTO[caminho]);

  if (corMapeada) {
    return MAPA_COR_SOLIDA_DA_FOTO[corMapeada];
  }

  const chave = caminhos.join("|");

  if (!chave) {
    return null;
  }

  if (!cacheCorExtraidaDaFoto.has(chave)) {
    cacheCorExtraidaDaFoto.set(chave, (async () => {
      for (const caminho of caminhos) {
        try {
          const imagem = await carregarImagemCor(caminho);
          const corExtraida = analisarCorDaFoto(imagem, cor);
          if (corExtraida) {
            return corExtraida;
          }
        } catch (erro) {
          // tenta a próxima foto disponível
        }
      }

      return null;
    })());
  }

  return cacheCorExtraidaDaFoto.get(chave);
}

function aplicarCorSolidaDaFoto(produto, cor, aoAtualizar) {
  if (cor?._visualExtraidoFoto || !nomeIndicaCorSolida(cor)) {
    return;
  }

  obterCorSolidaDaFoto(produto, cor)
    .then((corExtraida) => {
      if (!corExtraida) return;
      cor._visualExtraidoFoto = corExtraida;
      if (typeof aoAtualizar === "function") {
        aoAtualizar(corExtraida);
      }
    })
    .catch(() => {});
}

function obterStatusEstoque(cor) {
  if (cor.disponivel === false || cor.statusEstoque === "sem_estoque") {
    return "sem_estoque";
  }

  if (cor.statusEstoque === "ultimas_unidades") {
    return "ultimas_unidades";
  }

  if (cor.statusEstoque === "em_estoque") {
    return "em_estoque";
  }

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

function corEstaDisponivel(cor) {
  return obterStatusEstoque(cor) !== "sem_estoque";
}

function obterTextoEstoque(cor) {
  return obterStatusEstoque(cor) === "ultimas_unidades"
    ? "Últimas unidades"
    : "Em estoque";
}

function obterRotuloVariacaoSingular(produto) {
  return produto.rotuloVariacaoSingular || "cor";
}

function obterRotuloVariacaoPlural(produto) {
  return produto.rotuloVariacaoPlural || "cores";
}

function obterTipoProduto(produto) {
  return produto.tipoProduto || "filamento";
}

function obterPrecoProdutoOuVariacao(produto, cor) {
  const precoCor = Number(cor && cor.preco);

  if (Number.isFinite(precoCor) && precoCor > 0) {
    return precoCor;
  }

  return Number(produto.preco) || 0;
}

function criarLinkWhatsApp(produto, cor) {
  const nomeProduto = obterNomeCompletoProduto(produto);
  const tipoProduto = obterTipoProduto(produto);
  const rotuloVariacao = obterRotuloVariacaoSingular(produto);

  const mensagem =
    `Olá! Tenho interesse no ${tipoProduto} ${nomeProduto}, ` +
    `na ${rotuloVariacao} ${cor.nome}. Gostaria de confirmar a disponibilidade e o valor.`;

  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

function obterLinkLoja(produto) {
  return produto.linkLoja || LINK_LOJA_PADRAO;
}
/* ============================================================
   LINKS DIRETOS PARA PRODUTOS E CORES
   Exemplo:
   ?produto=flashforge-pla&cor=vermelho-coral
   ============================================================ */

/*
  Cria o nome usado no link do produto.

  Exemplo:
  Flashforge PLA
  vira:
  flashforge-pla
*/
function obterSlugProduto(produto) {
  return slugificar(obterNomeCompletoProduto(produto));
}

/*
  Cria o nome usado no link da cor.

  Exemplo:
  Vermelho Coral
  vira:
  vermelho-coral
*/
function obterSlugCor(cor) {
  return slugificar(cor.nome);
}

/*
  Lê os parâmetros existentes no endereço do site.

  Exemplo:
  ?produto=flashforge-pla&cor=vermelho-coral
*/
function lerDestinoDoLink() {
  const parametros = new URLSearchParams(window.location.search);

  return {
    produto: parametros.get("produto") || "",
    cor: parametros.get("cor") || ""
  };
}
/*
  Cria automaticamente o link direto da cor selecionada.

  Funciona no Live Server, no GitHub Pages
  e também no futuro domínio próprio.
*/
function criarLinkDiretoCor(produto, cor) {
  const url = new URL(window.location.href);

  url.search = "";
  url.hash = "";

  url.searchParams.set(
    "produto",
    obterSlugProduto(produto)
  );

  url.searchParams.set(
    "cor",
    obterSlugCor(cor)
  );

  return url.toString();
}

/*
  Atualiza a barra de endereço quando o cliente troca de cor,
  sem recarregar a página.
*/
function atualizarEnderecoDaCor(produto, cor) {
  const link = criarLinkDiretoCor(produto, cor);

  window.history.replaceState(
    {},
    "",
    link
  );
}

async function compartilharCor(produto, cor, botao) {
  const nomeProduto = obterNomeCompletoProduto(produto);
  const link = criarLinkDiretoCor(produto, cor);

  const mensagem =
    `${nomeProduto} — ${cor.nome}\n\n` +
    `Veja a foto real desta cor no catálogo da 3ZK:\n` +
    link;

  const textoOriginal = botao.textContent;

  function mostrarConfirmacao(texto) {
    botao.textContent = texto;
    botao.classList.add("produto__acao--confirmado");

    window.setTimeout(() => {
      botao.textContent = textoOriginal;
      botao.classList.remove("produto__acao--confirmado");
    }, 2200);
  }

  if (
    navigator.share &&
    window.matchMedia("(pointer: coarse)").matches
  ) {
    try {
      await navigator.share({
        title: `${nomeProduto} — ${cor.nome}`,
        text: `Veja a foto real desta ${rotuloVariacao} no catálogo da 3ZK:`,
        url: link
      });

      mostrarConfirmacao("Compartilhado!");
      return;
    } catch (erro) {
      if (erro.name === "AbortError") {
        return;
      }
    }
  }

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(mensagem);
    } else {
      const campoTemporario =
        document.createElement("textarea");

      campoTemporario.value = mensagem;
      campoTemporario.setAttribute("readonly", "");
      campoTemporario.style.position = "fixed";
      campoTemporario.style.left = "-9999px";
      campoTemporario.style.opacity = "0";

      document.body.appendChild(campoTemporario);

      campoTemporario.focus();
      campoTemporario.select();

      const conseguiuCopiar =
        document.execCommand("copy");

      campoTemporario.remove();

      if (!conseguiuCopiar) {
        throw new Error("O navegador não permitiu copiar.");
      }
    }

    mostrarConfirmacao("Link copiado!");
  } catch (erro) {
    window.prompt(
      "Copie a mensagem abaixo:",
      mensagem
    );
  }
}

/* ============================================================
   CARRINHO 3ZK — MONTADOR DE PEDIDO
   O carrinho funciona inteiramente no navegador e envia o
   pedido pronto para confirmação no WhatsApp.
   ============================================================ */
const CHAVE_CARRINHO_3ZK = "3zk-carrinho-v1";
const CHAVE_DADOS_PEDIDO_3ZK = "3zk-dados-pedido-v1";
const CHAVE_CODIGO_PEDIDO_3ZK = "3zk-codigo-pedido-v1";
const LIMITE_QUANTIDADE_ITEM = 99;
const DESCONTO_PAGAMENTO_PERCENTUAL = 0.05;

const abrirCarrinhoEl = document.getElementById("abrir-carrinho");
const fecharCarrinhoEl = document.getElementById("fechar-carrinho");
const carrinhoPainelEl = document.getElementById("carrinho-painel");
const carrinhoOverlayEl = document.getElementById("carrinho-overlay");
const carrinhoListaEl = document.getElementById("carrinho-lista");
const carrinhoVazioEl = document.getElementById("carrinho-vazio");
const limparCarrinhoEl = document.getElementById("limpar-carrinho");
const continuarEscolhendoEl = document.getElementById("continuar-escolhendo");
const carrinhoContadorEl = document.getElementById("carrinho-contador");
const carrinhoResumoEl = document.getElementById("carrinho-resumo");
const carrinhoTotalItensEl = document.getElementById("carrinho-total-itens");
const carrinhoTotalValorEl = document.getElementById("carrinho-total-valor");
const carrinhoTotalTituloEl = document.querySelector(".carrinho-total strong");
const carrinhoVoltarEl = document.getElementById("carrinho-voltar");
const carrinhoAvancarEl = document.getElementById("carrinho-avancar");
const pedidoFormularioEl = document.getElementById("pedido-formulario");
const pedidoRevisaoEl = document.getElementById("pedido-revisao");
const pedidoObservacaoEl = document.getElementById("pedido-observacao");
const observacaoContadorEl = document.getElementById("observacao-contador");
const pedidoToastEl = document.getElementById("pedido-toast");
const pedidoToastTextoEl = document.getElementById("pedido-toast-texto");
const pedidoToastAbrirEl = document.getElementById("pedido-toast-abrir");
const pedidoBarraEl = document.getElementById("pedido-barra");
const pedidoBarraResumoEl = document.getElementById("pedido-barra-resumo");
const pedidoBarraAbrirEl = document.getElementById("pedido-barra-abrir");

function ajustarTextosFluxoPedido() {
  const introducao = document.querySelector(
    '.carrinho-tela[data-tela-etapa="1"] .carrinho-tela__topo p'
  );
  const vazioTexto = carrinhoVazioEl?.querySelector("span");

  if (introducao) {
    introducao.textContent =
      "Adicione as cores e quantidades que deseja. Preço e disponibilidade já aparecem no catálogo; no final enviamos esta lista pronta pelo WhatsApp.";
  }

  if (vazioTexto) {
    vazioTexto.textContent =
      'Escolha uma cor no catálogo e toque em “Adicionar ao pedido”. Você pode continuar adicionando produtos antes de enviar.';
  }
}

let carrinho = carregarCarrinhoSalvo();
let etapaCarrinho = 1;
let temporizadorToast = null;
let ultimoFocoAntesCarrinho = null;

function lerLocalStorage(chave, valorPadrao) {
  try {
    const salvo = window.localStorage.getItem(chave);
    return salvo ? JSON.parse(salvo) : valorPadrao;
  } catch (erro) {
    console.warn(`[3ZK] Não foi possível ler ${chave}.`, erro);
    return valorPadrao;
  }
}

function gravarLocalStorage(chave, valor) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch (erro) {
    console.warn(`[3ZK] Não foi possível salvar ${chave}.`, erro);
  }
}

function removerLocalStorage(chave) {
  try {
    window.localStorage.removeItem(chave);
  } catch (erro) {
    console.warn(`[3ZK] Não foi possível remover ${chave}.`, erro);
  }
}

function gerarCaracteresCodigoPedido(quantidade) {
  // Sem 0, O, 1, I e L para evitar confusão ao copiar.
  const alfabeto = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let resultado = "";

  if (window.crypto?.getRandomValues) {
    const numeros = new Uint32Array(quantidade);
    window.crypto.getRandomValues(numeros);

    numeros.forEach((numero) => {
      resultado += alfabeto[numero % alfabeto.length];
    });

    return resultado;
  }

  for (let indice = 0; indice < quantidade; indice += 1) {
    const posicao = Math.floor(Math.random() * alfabeto.length);
    resultado += alfabeto[posicao];
  }

  return resultado;
}

function gerarNovoCodigoPedido() {
  const caracteres = gerarCaracteresCodigoPedido(8);

  return `3ZK-${caracteres.slice(0, 4)}-${caracteres.slice(4)}`;
}

function obterCodigoPedido() {
  const codigoSalvo = lerLocalStorage(
    CHAVE_CODIGO_PEDIDO_3ZK,
    ""
  );

  if (
    typeof codigoSalvo === "string" &&
    /^3ZK-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/.test(
      codigoSalvo
    )
  ) {
    return codigoSalvo;
  }

  const novoCodigo = gerarNovoCodigoPedido();
  gravarLocalStorage(CHAVE_CODIGO_PEDIDO_3ZK, novoCodigo);

  return novoCodigo;
}

function sincronizarCodigoPedidoComCarrinho() {
  if (carrinho.length === 0) {
    removerLocalStorage(CHAVE_CODIGO_PEDIDO_3ZK);
    return;
  }

  obterCodigoPedido();
}

function carregarCarrinhoSalvo() {
  const salvo = lerLocalStorage(CHAVE_CARRINHO_3ZK, []);

  if (!Array.isArray(salvo)) {
    return [];
  }

  return salvo
    .filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.nomeProduto === "string" &&
        typeof item.corNome === "string"
    )
    .map((item) => ({
      ...item,
      preco: Number(item.preco) || 0,
      quantidade: Math.min(
        LIMITE_QUANTIDADE_ITEM,
        Math.max(1, Number(item.quantidade) || 1)
      )
    }));
}

function salvarCarrinho() {
  gravarLocalStorage(CHAVE_CARRINHO_3ZK, carrinho);
}

function escaparHTML(valor = "") {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function obterIdItemCarrinho(produto, cor) {
  return `${obterSlugProduto(produto)}::${obterSlugCor(cor)}`;
}

function obterQuantidadeTotalCarrinho() {
  return carrinho.reduce(
    (total, item) => total + item.quantidade,
    0
  );
}

function obterValorTotalCarrinho() {
  return carrinho.reduce(
    (total, item) => total + item.preco * item.quantidade,
    0
  );
}

function arredondarCentavos(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function formatarPrecoPedido(valor) {
  return arredondarCentavos(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function obterPagamentoComDesconto() {
  const pagamento = obterDadosFormulario().pagamento;

  if (pagamento === "pix") {
    return {
      aplica: true,
      nome: "Pix",
      nomeCurto: "Pix"
    };
  }

  if (pagamento === "dinheiro") {
    return {
      aplica: true,
      nome: "Dinheiro",
      nomeCurto: "dinheiro"
    };
  }

  return {
    aplica: false,
    nome: "",
    nomeCurto: ""
  };
}

function obterResumoFinanceiroPedido() {
  const subtotal = arredondarCentavos(obterValorTotalCarrinho());
  const pagamentoComDesconto = obterPagamentoComDesconto();
  const desconto = pagamentoComDesconto.aplica
    ? arredondarCentavos(
        subtotal * DESCONTO_PAGAMENTO_PERCENTUAL
      )
    : 0;
  const total = arredondarCentavos(subtotal - desconto);

  return {
    subtotal,
    desconto,
    total,
    aplicaDesconto: pagamentoComDesconto.aplica,
    formaDesconto: pagamentoComDesconto.nome,
    formaDescontoCurta: pagamentoComDesconto.nomeCurto
  };
}

function obterTextoQuantidade(quantidade) {
  return quantidade === 1 ? "1 item" : `${quantidade} itens`;
}

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

function mostrarToastPedido(item) {
  if (!pedidoToastEl) return;

  window.clearTimeout(temporizadorToast);

  const quantidadePedido = obterQuantidadeTotalCarrinho();
  const totalPedido = obterResumoFinanceiroPedido().total;

  pedidoToastTextoEl.textContent =
    `${item.corNome} · ${obterTextoQuantidade(quantidadePedido)} no pedido · ${formatarPrecoPedido(totalPedido)}`;

  pedidoToastEl.hidden = false;

  window.requestAnimationFrame(() => {
    pedidoToastEl.classList.add("pedido-toast--visivel");
  });

  temporizadorToast = window.setTimeout(() => {
    pedidoToastEl.classList.remove("pedido-toast--visivel");

    window.setTimeout(() => {
      if (!pedidoToastEl.classList.contains("pedido-toast--visivel")) {
        pedidoToastEl.hidden = true;
      }
    }, 240);
  }, 3200);
}

function ocultarToastPedido() {
  if (!pedidoToastEl) return;

  window.clearTimeout(temporizadorToast);
  pedidoToastEl.classList.remove("pedido-toast--visivel");
  pedidoToastEl.hidden = true;
}

function animarCarrinhoCabecalho() {
  if (!abrirCarrinhoEl) return;

  abrirCarrinhoEl.classList.remove("botao-carrinho--animado");
  void abrirCarrinhoEl.offsetWidth;
  abrirCarrinhoEl.classList.add("botao-carrinho--animado");

  window.setTimeout(() => {
    abrirCarrinhoEl.classList.remove("botao-carrinho--animado");
  }, 520);
}

function adicionarAoCarrinho(produto, cor, botao) {
  const id = obterIdItemCarrinho(produto, cor);
  const existente = carrinho.find((item) => item.id === id);

  if (existente) {
    existente.quantidade = Math.min(
      LIMITE_QUANTIDADE_ITEM,
      existente.quantidade + 1
    );

    existente.preco = obterPrecoProdutoOuVariacao(produto, cor) || existente.preco;
    existente.imagem = obterFotosCor(produto, cor)[0] || existente.imagem;
    existente.hex = obterHexBaseVisual(cor) || existente.hex;
    existente.visual = obterCorVisual(cor) || existente.visual;
  } else {
    carrinho.push(criarItemCarrinho(produto, cor));
  }

  salvarCarrinho();
  sincronizarCodigoPedidoComCarrinho();
  renderizarCarrinho();
  animarCarrinhoCabecalho();

  const itemAtual = carrinho.find((item) => item.id === id);
  mostrarToastPedido(itemAtual);

  if (botao) {
    const textoEl = botao.querySelector(".produto__adicionar-texto");
    const textoOriginal = "Adicionar ao pedido";

    botao.classList.add("produto__adicionar--confirmado");

    if (textoEl) {
      textoEl.textContent = "Adicionado";
    }

    window.setTimeout(() => {
      botao.classList.remove("produto__adicionar--confirmado");

      if (textoEl) {
        textoEl.textContent = textoOriginal;
      }

      sincronizarBotaoAdicionar(botao);
    }, 900);
  }
}

function alterarQuantidadeItem(id, diferenca) {
  const item = carrinho.find((produto) => produto.id === id);

  if (!item) return;

  const novaQuantidade = item.quantidade + diferenca;

  if (novaQuantidade <= 0) {
    carrinho = carrinho.filter((produto) => produto.id !== id);
  } else {
    item.quantidade = Math.min(
      LIMITE_QUANTIDADE_ITEM,
      novaQuantidade
    );
  }

  salvarCarrinho();
  sincronizarCodigoPedidoComCarrinho();
  renderizarCarrinho();
}

function removerItemCarrinho(id) {
  carrinho = carrinho.filter((item) => item.id !== id);
  salvarCarrinho();
  sincronizarCodigoPedidoComCarrinho();
  renderizarCarrinho();
}

function limparCarrinho() {
  if (carrinho.length === 0) return;

  const confirmou = window.confirm(
    "Remover todos os produtos do seu pedido?"
  );

  if (!confirmou) return;

  carrinho = [];
  salvarCarrinho();
  sincronizarCodigoPedidoComCarrinho();
  mostrarEtapaCarrinho(1);
  renderizarCarrinho();
}

function sincronizarBotaoAdicionar(botao) {
  if (!botao) return;

  const quantidadeEl = botao.querySelector(
    ".produto__adicionar-quantidade"
  );
  const textoEl = botao.querySelector(
    ".produto__adicionar-texto"
  );
  const quantidade = carrinho.find(
    (item) => item.id === botao.dataset.itemId
  )?.quantidade || 0;

  if (quantidadeEl) {
    quantidadeEl.textContent = String(quantidade);
    quantidadeEl.hidden = quantidade === 0;
  }

  if (textoEl && !botao.classList.contains("produto__adicionar--confirmado")) {
    textoEl.textContent = quantidade > 0
      ? "Adicionar mais"
      : "Adicionar ao pedido";
  }

  botao.classList.toggle(
    "produto__adicionar--no-carrinho",
    quantidade > 0
  );

  const nomeCor = botao.dataset.corNome || "selecionada";

  botao.setAttribute(
    "aria-label",
    quantidade > 0
      ? `${quantidade} no pedido. Adicionar mais uma unidade da cor ${nomeCor}.`
      : `Adicionar a cor ${nomeCor} ao pedido.`
  );
}

function sincronizarBotoesAdicionar() {
  document
    .querySelectorAll(".produto__adicionar")
    .forEach(sincronizarBotaoAdicionar);
}

function obterDadosFormulario() {
  if (!pedidoFormularioEl) {
    return {
      nome: "",
      telefone: "",
      entrega: "retirada",
      pagamento: "pix",
      observacao: ""
    };
  }

  const dados = new FormData(pedidoFormularioEl);

  return {
    nome: String(dados.get("nome") || "").trim(),
    telefone: String(dados.get("telefone") || "").trim(),
    entrega: String(dados.get("entrega") || "retirada"),
    pagamento: String(dados.get("pagamento") || "pix"),
    observacao: String(dados.get("observacao") || "").trim()
  };
}

function salvarDadosFormulario() {
  gravarLocalStorage(
    CHAVE_DADOS_PEDIDO_3ZK,
    obterDadosFormulario()
  );

  if (observacaoContadorEl && pedidoObservacaoEl) {
    observacaoContadorEl.textContent =
      String(pedidoObservacaoEl.value.length);
  }
}

function preencherDadosFormulario() {
  if (!pedidoFormularioEl) return;

  const dados = lerLocalStorage(CHAVE_DADOS_PEDIDO_3ZK, {});

  const nomeEl = pedidoFormularioEl.elements.namedItem("nome");
  const telefoneEl =
    pedidoFormularioEl.elements.namedItem("telefone");
  const observacaoEl =
    pedidoFormularioEl.elements.namedItem("observacao");

  if (nomeEl) nomeEl.value = dados.nome || "";
  if (telefoneEl) telefoneEl.value = dados.telefone || "";
  if (observacaoEl) observacaoEl.value = dados.observacao || "";

  const entrega = pedidoFormularioEl.querySelector(
    `input[name="entrega"][value="${CSS.escape(
      dados.entrega || "retirada"
    )}"]`
  );

  const pagamento = pedidoFormularioEl.querySelector(
    `input[name="pagamento"][value="${CSS.escape(
      dados.pagamento || "pix"
    )}"]`
  );

  if (entrega) entrega.checked = true;
  if (pagamento) pagamento.checked = true;

  salvarDadosFormulario();
}

function obterRotuloEntrega(valor) {
  return valor === "entrega"
    ? "Consultar entrega"
    : "Retirada";
}

function obterRotuloPagamento(valor) {
  const rotulos = {
    pix: "Pix — 5% de desconto",
    dinheiro: "Dinheiro — 5% de desconto",
    combinar: "Combinar no WhatsApp"
  };

  return rotulos[valor] || "Combinar no WhatsApp";
}

function prepararOpcoesComDesconto() {
  ["pix", "dinheiro"].forEach((valorPagamento) => {
    const input = pedidoFormularioEl?.querySelector(
      `input[name="pagamento"][value="${valorPagamento}"]`
    );
    const conteudo = input?.closest("label")?.querySelector(
      "span:last-child"
    );

    if (
      !conteudo ||
      conteudo.querySelector(".pedido-opcao__beneficio")
    ) {
      return;
    }

    const beneficio = document.createElement("small");
    beneficio.className = "pedido-opcao__beneficio";
    beneficio.textContent = "5% de desconto";
    conteudo.appendChild(beneficio);
  });
}

function renderizarRevisaoPedido() {
  if (!pedidoRevisaoEl) return;

  const dados = obterDadosFormulario();
  const financeiro = obterResumoFinanceiroPedido();

  const produtosHTML = carrinho.map((item) => `
    <div class="pedido-revisao__item">
      <span
        class="pedido-revisao__cor"
        style="--cor-revisao: ${escaparHTML(item.visual || item.hex)}"
      ></span>
      <span>
        <strong>${escaparHTML(item.nomeProduto)}</strong>
        <small>
          ${escaparHTML(item.corNome)} ·
          ${item.quantidade} × ${formatarPreco(item.preco)}
        </small>
      </span>
      <b>${formatarPreco(item.preco * item.quantidade)}</b>
    </div>
  `).join("");

  pedidoRevisaoEl.innerHTML = `
    <div class="pedido-revisao__bloco">
      <div class="pedido-revisao__titulo">
        <span>Produtos</span>
        <b>${obterTextoQuantidade(obterQuantidadeTotalCarrinho())}</b>
      </div>
      ${produtosHTML}
    </div>

    <div class="pedido-revisao__bloco pedido-revisao__dados">
      <div>
        <span>Cliente</span>
        <strong>${escaparHTML(dados.nome || "Não informado")}</strong>
      </div>
      ${dados.telefone ? `
        <div>
          <span>Telefone</span>
          <strong>${escaparHTML(dados.telefone)}</strong>
        </div>
      ` : ""}
      <div>
        <span>Entrega</span>
        <strong>${escaparHTML(obterRotuloEntrega(dados.entrega))}</strong>
      </div>
      <div>
        <span>Pagamento</span>
        <strong>${escaparHTML(obterRotuloPagamento(dados.pagamento))}</strong>
      </div>
      ${dados.observacao ? `
        <div class="pedido-revisao__observacao">
          <span>Observação</span>
          <strong>${escaparHTML(dados.observacao)}</strong>
        </div>
      ` : ""}
    </div>

    <div class="pedido-revisao__financeiro">
      <div class="pedido-revisao__linha-financeira">
        <span>Subtotal dos produtos</span>
        <b>${formatarPrecoPedido(financeiro.subtotal)}</b>
      </div>

      ${financeiro.aplicaDesconto ? `
        <div class="pedido-revisao__linha-financeira pedido-revisao__linha-financeira--desconto">
          <span>Desconto ${escaparHTML(financeiro.formaDesconto)} (5%)</span>
          <b>− ${formatarPrecoPedido(financeiro.desconto)}</b>
        </div>
      ` : ""}

      <div class="pedido-revisao__total">
        <span>${financeiro.aplicaDesconto
          ? `Total no ${escaparHTML(financeiro.formaDesconto)}`
          : "Total dos produtos"}</span>
        <strong>${formatarPrecoPedido(financeiro.total)}</strong>
      </div>
    </div>
  `;
}

function criarCodigoPedido() {
  return obterCodigoPedido();
}

function criarMensagemPedidoWhatsApp() {
  const dados = obterDadosFormulario();
  const financeiro = obterResumoFinanceiroPedido();
  const linhas = [
    "🛒 *NOVO PEDIDO — CATÁLOGO 3ZK*",
    `Código: ${criarCodigoPedido()}`,
    "",
    `👤 *Cliente:* ${dados.nome}`
  ];

  if (dados.telefone) {
    linhas.push(`📱 *Telefone:* ${dados.telefone}`);
  }

  linhas.push("", "📦 *PRODUTOS*");

  carrinho.forEach((item, indice) => {
    linhas.push(
      "",
      `*${indice + 1}. ${item.nomeProduto}*`,
      `Cor: ${item.corNome}`,
      `Quantidade: ${item.quantidade}`,
      `Valor unitário: ${formatarPreco(item.preco)}`,
      `Subtotal: ${formatarPreco(item.preco * item.quantidade)}`
    );
  });

  linhas.push(
    "",
    `💰 *Subtotal dos produtos:* ${formatarPrecoPedido(financeiro.subtotal)}`
  );

  if (financeiro.aplicaDesconto) {
    linhas.push(
      `🏷️ *Desconto ${financeiro.formaDesconto} (5%):* − ${formatarPrecoPedido(financeiro.desconto)}`,
      `✅ *Total no ${financeiro.formaDesconto}: ${formatarPrecoPedido(financeiro.total)}*`
    );
  } else {
    linhas.push(`✅ *Total: ${formatarPrecoPedido(financeiro.total)}*`);
  }

  linhas.push(
    "",
    `🚚 *Entrega:* ${obterRotuloEntrega(dados.entrega)}`,
    `💳 *Pagamento:* ${obterRotuloPagamento(dados.pagamento)}`
  );

  if (dados.observacao) {
    linhas.push("", "📝 *Observação:*", dados.observacao);
  }

  linhas.push(
    "",
    "Pedido sujeito à confirmação de estoque, entrega e valor final."
  );

  return linhas.join("\n");
}

function enviarPedidoWhatsApp() {
  if (carrinho.length === 0) {
    mostrarEtapaCarrinho(1);
    return;
  }

  if (!pedidoFormularioEl.reportValidity()) {
    mostrarEtapaCarrinho(2);
    return;
  }

  salvarDadosFormulario();

  const mensagem = criarMensagemPedidoWhatsApp();
  const endereco =
    `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
      mensagem
    )}`;

  window.open(endereco, "_blank", "noopener");
}

function atualizarIndicadoresEtapa() {
  document
    .querySelectorAll("[data-indicador-etapa]")
    .forEach((indicador) => {
      const numero = Number(indicador.dataset.indicadorEtapa);

      indicador.classList.toggle(
        "carrinho-etapa--ativa",
        numero === etapaCarrinho
      );

      indicador.classList.toggle(
        "carrinho-etapa--concluida",
        numero < etapaCarrinho
      );
    });

  document
    .querySelectorAll("[data-tela-etapa]")
    .forEach((tela) => {
      const ativa =
        Number(tela.dataset.telaEtapa) === etapaCarrinho;

      tela.hidden = !ativa;
      tela.classList.toggle("carrinho-tela--ativa", ativa);
    });

  carrinhoVoltarEl.hidden = etapaCarrinho === 1;

  if (etapaCarrinho === 1) {
    carrinhoAvancarEl.textContent = "Continuar para os dados";
    carrinhoAvancarEl.classList.remove(
      "carrinho-botao--whatsapp"
    );
  }

  if (etapaCarrinho === 2) {
    carrinhoAvancarEl.textContent = "Revisar pedido";
    carrinhoAvancarEl.classList.remove(
      "carrinho-botao--whatsapp"
    );
  }

  if (etapaCarrinho === 3) {
    carrinhoAvancarEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.06c-.24.68-1.4 1.31-1.93 1.35-.5.05-1.03.24-3.42-.71-2.9-1.16-4.76-4.14-4.9-4.33-.14-.19-1.16-1.55-1.16-2.96s.73-2.1 1-2.39c.24-.27.53-.34.71-.34.18 0 .36 0 .51.01.17.01.39-.06.6.46.24.58.8 2 .87 2.15.07.14.11.31.02.5-.09.19-.14.31-.27.47-.14.16-.29.36-.41.48-.14.14-.28.29-.12.57.16.29.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.45.12.61-.07.18-.19.72-.84.91-1.13.19-.29.38-.24.63-.14.26.09 1.66.78 1.94.93.28.14.47.21.53.33.07.12.07.71-.17 1.39z"/>
      </svg>
      Enviar pedido no WhatsApp
    `;
    carrinhoAvancarEl.classList.add(
      "carrinho-botao--whatsapp"
    );
    renderizarRevisaoPedido();
  }

  carrinhoAvancarEl.disabled = carrinho.length === 0;
}

function mostrarEtapaCarrinho(numero) {
  etapaCarrinho = Math.min(3, Math.max(1, numero));

  if (carrinho.length === 0) {
    etapaCarrinho = 1;
  }

  atualizarIndicadoresEtapa();

  const conteudo = carrinhoPainelEl.querySelector(
    ".carrinho-painel__conteudo"
  );

  if (conteudo) {
    conteudo.scrollTop = 0;
  }
}

function renderizarItensCarrinho() {
  if (!carrinhoListaEl) return;

  carrinhoListaEl.innerHTML = carrinho.map((item) => `
    <article class="carrinho-item" data-id="${escaparHTML(item.id)}">
      <div
        class="carrinho-item__visual"
        style="--cor-item: ${escaparHTML(item.visual || item.hex)}"
      >
        ${item.imagem ? `
          <img
            src="${escaparHTML(item.imagem)}"
            alt="${escaparHTML(
              `${item.nomeProduto} na cor ${item.corNome}`
            )}"
            loading="lazy"
          >
        ` : ""}
        <span class="carrinho-item__amostra" aria-hidden="true"></span>
      </div>

      <div class="carrinho-item__conteudo">
        <div class="carrinho-item__topo">
          <div>
            <strong>${escaparHTML(item.nomeProduto)}</strong>
            <span>${escaparHTML(item.corNome)}</span>
          </div>

          <button
            class="carrinho-item__remover"
            type="button"
            data-acao="remover"
            data-id="${escaparHTML(item.id)}"
            aria-label="Remover ${escaparHTML(item.corNome)} do pedido"
          >×</button>
        </div>

        <div class="carrinho-item__rodape">
          <div
            class="carrinho-quantidade"
            aria-label="Quantidade de ${escaparHTML(item.corNome)}"
          >
            <button
              type="button"
              data-acao="diminuir"
              data-id="${escaparHTML(item.id)}"
              aria-label="Diminuir quantidade"
            >−</button>
            <span>${item.quantidade}</span>
            <button
              type="button"
              data-acao="aumentar"
              data-id="${escaparHTML(item.id)}"
              aria-label="Aumentar quantidade"
              ${item.quantidade >= LIMITE_QUANTIDADE_ITEM ? "disabled" : ""}
            >+</button>
          </div>

          <div class="carrinho-item__preco">
            <small>${formatarPreco(item.preco)} cada</small>
            <strong>${formatarPreco(
              item.preco * item.quantidade
            )}</strong>
          </div>
        </div>
      </div>
    </article>
  `).join("");

  carrinhoListaEl
    .querySelectorAll(".carrinho-item__visual img")
    .forEach((imagem) => {
      imagem.addEventListener("load", () => {
        imagem.closest(".carrinho-item__visual")
          ?.classList.add("carrinho-item__visual--com-foto");
      });

      imagem.addEventListener("error", () => {
        imagem.remove();
      });
    });
}

function renderizarCarrinho() {
  const quantidade = obterQuantidadeTotalCarrinho();
  const financeiro = obterResumoFinanceiroPedido();
  const total = financeiro.total;
  const possuiItens = carrinho.length > 0;

  if (carrinhoContadorEl) {
    carrinhoContadorEl.textContent =
      quantidade > 99 ? "99+" : String(quantidade);

    carrinhoContadorEl.hidden = quantidade === 0;
  }

  if (carrinhoResumoEl) {
    carrinhoResumoEl.textContent = quantidade === 0
      ? "Escolha cores e monte sua lista"
      : `${obterTextoQuantidade(quantidade)} · ${formatarPrecoPedido(total)}${financeiro.aplicaDesconto ? ` no ${financeiro.formaDescontoCurta}` : ""}`;
  }

  if (abrirCarrinhoEl) {
    abrirCarrinhoEl.setAttribute(
      "aria-label",
      quantidade === 0
        ? "Abrir montador de pedido. Nenhum produto selecionado."
        : `Abrir montador de pedido. ${obterTextoQuantidade(
            quantidade
          )}, ${financeiro.aplicaDesconto ? `total com desconto no ${financeiro.formaDescontoCurta}` : "total"} ${formatarPrecoPedido(total)}.`
    );
  }

  if (pedidoBarraEl) {
    pedidoBarraEl.hidden = !possuiItens;
    pedidoBarraEl.classList.toggle("pedido-barra--visivel", possuiItens);
    document.body.classList.toggle("pedido-em-montagem", possuiItens);
  }

  if (pedidoBarraResumoEl) {
    pedidoBarraResumoEl.textContent = possuiItens
      ? `${obterTextoQuantidade(quantidade)} · ${formatarPrecoPedido(total)}${financeiro.aplicaDesconto ? ` no ${financeiro.formaDescontoCurta}` : ""}`
      : "0 itens";
  }

  if (carrinhoTotalItensEl) {
    carrinhoTotalItensEl.textContent = financeiro.aplicaDesconto && possuiItens
      ? `${obterTextoQuantidade(quantidade)} · economia de ${formatarPrecoPedido(financeiro.desconto)}`
      : obterTextoQuantidade(quantidade);
  }

  if (carrinhoTotalTituloEl) {
    carrinhoTotalTituloEl.textContent = financeiro.aplicaDesconto && possuiItens
      ? `Total no ${financeiro.formaDesconto}`
      : "Total dos produtos";
  }

  if (carrinhoTotalValorEl) {
    carrinhoTotalValorEl.textContent = formatarPrecoPedido(total);
  }

  if (carrinhoVazioEl) carrinhoVazioEl.hidden = possuiItens;
  if (carrinhoListaEl) carrinhoListaEl.hidden = !possuiItens;
  if (limparCarrinhoEl) limparCarrinhoEl.hidden = !possuiItens;

  renderizarItensCarrinho();
  sincronizarBotoesAdicionar();
  atualizarIndicadoresEtapa();
}

function abrirCarrinho(etapa = 1) {
  if (!carrinhoPainelEl || !carrinhoOverlayEl) return;

  ocultarToastPedido();
  ultimoFocoAntesCarrinho = document.activeElement;
  mostrarEtapaCarrinho(etapa);

  carrinhoOverlayEl.hidden = false;
  carrinhoPainelEl.classList.add("carrinho-painel--aberto");
  carrinhoOverlayEl.classList.add("carrinho-overlay--visivel");
  carrinhoPainelEl.setAttribute("aria-hidden", "false");
  abrirCarrinhoEl?.setAttribute("aria-expanded", "true");
  document.body.classList.add("carrinho-aberto");

  window.requestAnimationFrame(() => {
    fecharCarrinhoEl?.focus();
  });
}

function fecharCarrinho() {
  if (!carrinhoPainelEl || !carrinhoOverlayEl) return;

  carrinhoPainelEl.classList.remove("carrinho-painel--aberto");
  carrinhoOverlayEl.classList.remove("carrinho-overlay--visivel");
  carrinhoPainelEl.setAttribute("aria-hidden", "true");
  abrirCarrinhoEl?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("carrinho-aberto");

  window.setTimeout(() => {
    if (!carrinhoOverlayEl.classList.contains(
      "carrinho-overlay--visivel"
    )) {
      carrinhoOverlayEl.hidden = true;
    }
  }, 280);

  if (ultimoFocoAntesCarrinho instanceof HTMLElement) {
    ultimoFocoAntesCarrinho.focus();
  }
}

function manterFocoNoCarrinho(evento) {
  if (
    evento.key !== "Tab" ||
    !carrinhoPainelEl.classList.contains("carrinho-painel--aberto")
  ) {
    return;
  }

  const focaveis = [
    ...carrinhoPainelEl.querySelectorAll(
      'button:not([disabled]):not([hidden]), input:not([disabled]), textarea:not([disabled]), [href]'
    )
  ].filter((elemento) => elemento.offsetParent !== null);

  if (focaveis.length === 0) return;

  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];

  if (evento.shiftKey && document.activeElement === primeiro) {
    evento.preventDefault();
    ultimo.focus();
  } else if (
    !evento.shiftKey &&
    document.activeElement === ultimo
  ) {
    evento.preventDefault();
    primeiro.focus();
  }
}

abrirCarrinhoEl?.addEventListener("click", () => abrirCarrinho(1));
fecharCarrinhoEl?.addEventListener("click", fecharCarrinho);
carrinhoOverlayEl?.addEventListener("click", fecharCarrinho);
continuarEscolhendoEl?.addEventListener("click", fecharCarrinho);
limparCarrinhoEl?.addEventListener("click", limparCarrinho);
pedidoToastAbrirEl?.addEventListener("click", () => abrirCarrinho(1));
pedidoBarraAbrirEl?.addEventListener("click", () => abrirCarrinho(1));

carrinhoListaEl?.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");

  if (!botao) return;

  const id = botao.dataset.id;
  const acao = botao.dataset.acao;

  if (acao === "aumentar") alterarQuantidadeItem(id, 1);
  if (acao === "diminuir") alterarQuantidadeItem(id, -1);
  if (acao === "remover") removerItemCarrinho(id);
});

carrinhoVoltarEl?.addEventListener("click", () => {
  mostrarEtapaCarrinho(etapaCarrinho - 1);
});

carrinhoAvancarEl?.addEventListener("click", () => {
  if (etapaCarrinho === 1) {
    mostrarEtapaCarrinho(2);
    return;
  }

  if (etapaCarrinho === 2) {
    if (!pedidoFormularioEl.reportValidity()) {
      return;
    }

    salvarDadosFormulario();
    mostrarEtapaCarrinho(3);
    return;
  }

  enviarPedidoWhatsApp();
});

pedidoFormularioEl?.addEventListener("input", salvarDadosFormulario);
pedidoFormularioEl?.addEventListener("change", (evento) => {
  salvarDadosFormulario();

  if (evento.target?.name === "pagamento") {
    renderizarCarrinho();
  }
});

const telefonePedidoEl =
  pedidoFormularioEl?.elements.namedItem("telefone");

telefonePedidoEl?.addEventListener("input", () => {
  const numeros = telefonePedidoEl.value
    .replace(/\D/g, "")
    .slice(0, 11);

  if (numeros.length <= 2) {
    telefonePedidoEl.value = numeros;
  } else if (numeros.length <= 6) {
    telefonePedidoEl.value =
      `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  } else if (numeros.length <= 10) {
    telefonePedidoEl.value =
      `(${numeros.slice(0, 2)}) ` +
      `${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  } else {
    telefonePedidoEl.value =
      `(${numeros.slice(0, 2)}) ` +
      `${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }

  salvarDadosFormulario();
});

document.addEventListener("keydown", (evento) => {
  if (
    evento.key === "Escape" &&
    carrinhoPainelEl?.classList.contains("carrinho-painel--aberto")
  ) {
    fecharCarrinho();
  }

  manterFocoNoCarrinho(evento);
});

preencherDadosFormulario();
prepararOpcoesComDesconto();
ajustarTextosFluxoPedido();
renderizarCarrinho();


/* ============================================================
   LIGHTBOX DA FOTO
   ============================================================ */
const lightbox = document.createElement("div");
lightbox.className = "lightbox";
lightbox.setAttribute("aria-hidden", "true");

lightbox.innerHTML = `
  <div class="lightbox__conteudo" role="dialog" aria-modal="true" aria-label="Foto ampliada do filamento">
    <button class="lightbox__fechar" type="button" aria-label="Fechar foto">×</button>
    <img class="lightbox__imagem" alt="">
  </div>
`;

document.body.appendChild(lightbox);

const lightboxImagem = lightbox.querySelector(".lightbox__imagem");
const lightboxFechar = lightbox.querySelector(".lightbox__fechar");

function abrirLightbox(src, alt) {
  if (!src) return;

  lightboxImagem.src = src;
  lightboxImagem.alt = alt;
  lightbox.classList.add("lightbox--aberto");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  lightboxFechar.focus();
}

function fecharLightbox() {
  lightbox.classList.remove("lightbox--aberto");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

lightboxFechar.addEventListener("click", fecharLightbox);

lightbox.addEventListener("click", (evento) => {
  if (evento.target === lightbox) {
    fecharLightbox();
  }
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && lightbox.classList.contains("lightbox--aberto")) {
    fecharLightbox();
  }
});

/* ============================================================
   BOLINHAS DE COR
   ============================================================ */
function calcularLuminanciaHex(hex) {
  const { r, g, b } = hexParaRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function obterClassesVisuaisDot(cor) {
  const classes = [];
  const luminancia = calcularLuminanciaHex(obterHexBaseVisual(cor));

  if (luminancia >= 0.72) {
    classes.push("dot--claro");
  }

  return classes.join(" ");
}

function criarElementoDot(produto, cor, index, aoSelecionar, estaAtivo) {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = ["dot", obterClassesVisuaisDot(cor), estaAtivo ? "dot--ativo" : ""]
    .filter(Boolean)
    .join(" ");
  dot.style.setProperty("--cor-dot", obterCorVisual(cor));
  dot.setAttribute("role", "option");
  dot.setAttribute("aria-selected", estaAtivo ? "true" : "false");
  dot.setAttribute(
    "aria-label",
    `Selecionar a cor ${cor.nome}. ${obterTextoEstoque(cor)}`
  );

  const tooltip = document.createElement("span");
  tooltip.className = "dot__tooltip";
  tooltip.textContent = `${cor.nome} • ${obterTextoEstoque(cor)}`;

  dot.appendChild(tooltip);
  dot.addEventListener("click", () => aoSelecionar(index, dot));

  aplicarCorSolidaDaFoto(produto, cor, () => {
    dot.style.setProperty("--cor-dot", obterCorVisual(cor));
    dot.className = ["dot", obterClassesVisuaisDot(cor), dot.classList.contains("dot--ativo") ? "dot--ativo" : ""]
      .filter(Boolean)
      .join(" ");
  });

  return dot;
}

/* ============================================================
   FOTO REAL
   ============================================================ */
function criarAreaFoto() {
  const area = document.createElement("div");
  area.className = "produto__foto-area";

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "produto__foto-botao";
  botao.setAttribute("aria-label", "Ampliar foto real da cor");

  const imagem = document.createElement("img");
  imagem.className = "produto__foto";
  imagem.loading = "eager";
  imagem.decoding = "async";

  const placeholder = document.createElement("div");
  placeholder.className = "produto__foto-placeholder";
  placeholder.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3"></rect>
      <circle cx="9" cy="10" r="2"></circle>
      <path d="m5 17 4-4 3 3 2-2 5 5"></path>
    </svg>
    <strong>Foto real em breve</strong>
    <span>A amostra de cor continua disponível</span>
  `;

  const legenda = document.createElement("span");
  legenda.className = "produto__foto-legenda";
  legenda.textContent = "Clique para ampliar";

  const anterior = document.createElement("button");
  anterior.type = "button";
  anterior.className =
    "produto__foto-seta produto__foto-seta--anterior";
  anterior.setAttribute("aria-label", "Ver foto anterior");
  anterior.textContent = "‹";
  anterior.hidden = true;

  const proxima = document.createElement("button");
  proxima.type = "button";
  proxima.className =
    "produto__foto-seta produto__foto-seta--proxima";
  proxima.setAttribute("aria-label", "Ver próxima foto");
  proxima.textContent = "›";
  proxima.hidden = true;

  const contador = document.createElement("span");
  contador.className = "produto__foto-contador";
  contador.hidden = true;

  botao.appendChild(imagem);
  botao.appendChild(placeholder);
  botao.appendChild(legenda);

  area.appendChild(botao);
  area.appendChild(anterior);
  area.appendChild(proxima);
  area.appendChild(contador);

  return {
    area,
    botao,
    imagem,
    anterior,
    proxima,
    contador
  };
}

function testarImagem(caminho) {
  return new Promise((resolver) => {
    const teste = new Image();

    teste.onload = () => resolver(caminho);
    teste.onerror = () => resolver(null);
    teste.src = caminho;
  });
}

async function atualizarFoto({
  produto,
  cor,
  area,
  botaoImagem,
  imagem,
  botaoVerFoto,
  anterior,
  proxima,
  contador
}) {
  const caminhos = obterFotosCor(produto, cor);
  const tokenCarregamento = `${Date.now()}-${Math.random()}`;

  imagem.dataset.tokenCarregamento = tokenCarregamento;

  area.classList.remove("produto__foto-area--carregada");
  area.classList.remove("produto__foto-area--multipla");

  botaoImagem.disabled = true;
  botaoVerFoto.disabled = true;
  botaoVerFoto.textContent = "Carregando foto...";

  anterior.hidden = true;
  proxima.hidden = true;
  contador.hidden = true;

  anterior.onclick = null;
  proxima.onclick = null;

  const resultados = await Promise.all(
    caminhos.map((caminho) => testarImagem(caminho))
  );

  if (imagem.dataset.tokenCarregamento !== tokenCarregamento) {
    return;
  }

  const fotosValidas = resultados.filter(Boolean);

  if (fotosValidas.length === 0) {
    botaoVerFoto.textContent = "Foto em breve";

    console.warn(
      `[3ZK] Nenhuma foto encontrada para ` +
      `${obterNomeCompletoProduto(produto)} — ${cor.nome}.`,
      caminhos
    );

    return;
  }

  let indiceAtual = 0;
  let caminhoAtual = fotosValidas[0];

  function mostrarFoto(indice) {
    indiceAtual =
      (indice + fotosValidas.length) % fotosValidas.length;

    caminhoAtual = fotosValidas[indiceAtual];

    imagem.src = caminhoAtual;
    imagem.alt =
      `${obterNomeCompletoProduto(produto)} na ${obterRotuloVariacaoSingular(produto)} ${cor.nome}. ` +
      `Foto ${indiceAtual + 1} de ${fotosValidas.length}.`;

    imagem.dataset.caminho = caminhoAtual;

    area.classList.add("produto__foto-area--carregada");
    area.classList.toggle(
      "produto__foto-area--multipla",
      fotosValidas.length > 1
    );

    botaoImagem.disabled = false;
    botaoVerFoto.disabled = false;
    botaoVerFoto.textContent =
      fotosValidas.length > 1
        ? `Ver fotos (${fotosValidas.length})`
        : "Ver foto ampliada";

    const possuiVarias = fotosValidas.length > 1;

    anterior.hidden = !possuiVarias;
    proxima.hidden = !possuiVarias;
    contador.hidden = !possuiVarias;

    if (possuiVarias) {
      contador.textContent =
        `${indiceAtual + 1} / ${fotosValidas.length}`;
    }
  }

  anterior.onclick = (evento) => {
    evento.stopPropagation();
    mostrarFoto(indiceAtual - 1);
  };

  proxima.onclick = (evento) => {
    evento.stopPropagation();
    mostrarFoto(indiceAtual + 1);
  };

  function abrirFotoAtual() {
    abrirLightbox(
      caminhoAtual,
      `${obterNomeCompletoProduto(produto)} na ${obterRotuloVariacaoSingular(produto)} ${cor.nome}`
    );
  }

  botaoImagem.onclick = abrirFotoAtual;
  botaoVerFoto.onclick = abrirFotoAtual;

  mostrarFoto(0);
}

/* ============================================================
   DESTAQUES DOS PRODUTOS
   ============================================================ */
function obterDestaqueProduto(produto) {
  const marca = String(produto?.marca || "")
    .trim()
    .toLowerCase();
  const material = String(produto?.material || "")
    .trim()
    .toUpperCase();

  const eProdutoNovo =
    marca === "polyflow" && material === "PLA";

  if (eProdutoNovo) {
    return {
      titulo: "Produto novo"
    };
  }

  const possuiNovasCores =
    (marca === "masterprint" && material === "PETG") ||
    (marca === "closin" && material === "PLA") ||
    (marca === "multifila" && material === "PLA");

  if (!possuiNovasCores) {
    return null;
  }

  return {
    titulo: "Novas cores"
  };
}

function criarSeloDestaqueProduto(destaque) {
  const selo = document.createElement("span");
  selo.className = "produto__novidade";
  selo.setAttribute("aria-label", destaque.titulo);

  selo.innerHTML = `
    <svg
      class="produto__novidade-icone"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2.75 13.8 8.2 19.25 10 13.8 11.8 12 17.25 10.2 11.8 4.75 10 10.2 8.2 12 2.75Z"
        fill="currentColor"
      ></path>
      <path
        d="m18.3 15.2.9 2.6 2.55.9-2.55.85-.9 2.7-.85-2.7-2.7-.85 2.7-.9.85-2.6Z"
        fill="currentColor"
        opacity=".72"
      ></path>
    </svg>
    <span>${destaque.titulo}</span>
  `;

  return selo;
}

/* ============================================================
   LINHA DE PRODUTO
   ============================================================ */
function criarLinhaProduto(produto, indiceCorInicial = 0) {
  const artigo = document.createElement("article");
  artigo.className = "produto";

  const slugProduto = obterSlugProduto(produto);

  artigo.id = `produto-${slugProduto}`;
  artigo.dataset.produto = slugProduto;

  const destaque = obterDestaqueProduto(produto);
  if (destaque) {
    artigo.classList.add("produto--destaque");
    artigo.appendChild(criarSeloDestaqueProduto(destaque));
  }

  const corInicial = produto.cores[indiceCorInicial] || produto.cores[0];
  let corSelecionadaAtual = corInicial;

  const info = document.createElement("div");
  info.className = "produto__info";

  const marca = document.createElement("span");
  marca.className = "produto__marca";
  marca.textContent = produto.linha
    ? `${produto.marca} — ${produto.linha}`
    : produto.marca;

  const tag = document.createElement("span");
  tag.className = "produto__material-tag";
  tag.textContent = produto.material;

  info.appendChild(marca);
  info.appendChild(tag);

  if (produto.obs) {
    const observacao = document.createElement("span");
    observacao.className = "produto__obs";
    observacao.textContent = produto.obs;
    info.appendChild(observacao);
  }

  const amostraWrap = document.createElement("div");
  amostraWrap.className = "produto__amostra";

  const spool = document.createElement("div");
  spool.className = "spool";
  spool.style.setProperty("--cor-atual", obterCorVisual(corInicial));
  aplicarCorSolidaDaFoto(produto, corInicial, () => {
    if (corSelecionadaAtual === corInicial) {
      spool.style.setProperty("--cor-atual", obterCorVisual(corInicial));
    }
  });

  if (corInicial.efeito) {
    spool.classList.add(`spool--efeito-${corInicial.efeito}`);
  }

  amostraWrap.appendChild(spool);

  const detalhe = document.createElement("div");
  detalhe.className = "produto__detalhe";

  const cabecalhoCor = document.createElement("div");
  cabecalhoCor.className = "produto__cor-cabecalho";

  const nomeCor = document.createElement("span");
  nomeCor.className = "produto__cor-nome";
  nomeCor.setAttribute("aria-live", "polite");
  nomeCor.textContent = corInicial.nome;

  const contagem = document.createElement("span");
  contagem.className = "produto__cor-contagem";
  contagem.textContent = produto.cores.length === 1
    ? `1 ${obterRotuloVariacaoSingular(produto)} disponível`
    : `${produto.cores.length} ${obterRotuloVariacaoPlural(produto)} disponíveis`;

  cabecalhoCor.appendChild(nomeCor);
  cabecalhoCor.appendChild(contagem);

  const compraRapida = document.createElement("div");
  compraRapida.className = "produto__compra-rapida";

  const estoqueInfo = document.createElement("span");
  estoqueInfo.className = "produto__estoque";
  estoqueInfo.setAttribute("aria-live", "polite");

  const botaoAdicionar = document.createElement("button");
  botaoAdicionar.type = "button";
  botaoAdicionar.className = "produto__adicionar";
  botaoAdicionar.title = "Adicionar ao pedido";
  botaoAdicionar.innerHTML = `
    <span class="produto__adicionar-icone" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4.5" y="4" width="12" height="16" rx="2"></rect>
        <path d="M8 4.5h5"></path>
        <path d="M8 9h4"></path>
        <path d="M8 13h3"></path>
        <path d="M18.5 11v6"></path>
        <path d="M15.5 14h6"></path>
      </svg>
    </span>
    <span class="produto__adicionar-texto">Adicionar ao pedido</span>
    <span class="produto__adicionar-quantidade" hidden>0</span>
  `;

  compraRapida.appendChild(estoqueInfo);

  botaoAdicionar.addEventListener("click", () => {
    adicionarAoCarrinho(
      produto,
      corSelecionadaAtual,
      botaoAdicionar
    );
  });

  const dotsWrap = document.createElement("div");
  dotsWrap.className = "dots";
  dotsWrap.setAttribute("role", "listbox");
  dotsWrap.setAttribute("aria-label", `${obterRotuloVariacaoPlural(produto)} de ${produto.marca}`);

  const foto = criarAreaFoto();

  const lado = document.createElement("div");
  lado.className = "produto__lado";

  const precoWrap = document.createElement("div");
  precoWrap.className = "produto__preco";

  const precoValor = document.createElement("span");
  precoValor.className = "produto__preco-valor";
  precoValor.textContent = formatarPreco(obterPrecoProdutoOuVariacao(produto, corInicial));

  precoWrap.appendChild(precoValor);

  const acoes = document.createElement("div");
  acoes.className = "produto__acoes";

  const botaoLoja = document.createElement("a");
  botaoLoja.className = "produto__acao produto__acao--loja";
  botaoLoja.target = "_blank";
  botaoLoja.rel = "noopener";

  const botaoVerFoto = document.createElement("button");
  botaoVerFoto.type = "button";
  botaoVerFoto.className = "produto__acao produto__acao--foto";
  botaoVerFoto.textContent = "Foto em breve";
  botaoVerFoto.disabled = true;

  acoes.appendChild(botaoLoja);
  acoes.appendChild(botaoAdicionar);
  acoes.appendChild(botaoVerFoto);

  lado.appendChild(precoWrap);
  lado.appendChild(acoes);

  function atualizarEstadoEstoque(cor) {
    const status = obterStatusEstoque(cor);

    estoqueInfo.classList.remove(
      "produto__estoque--disponivel",
      "produto__estoque--baixo",
      "produto__estoque--esgotado"
    );

    estoqueInfo.classList.add(
      status === "ultimas_unidades"
        ? "produto__estoque--baixo"
        : "produto__estoque--disponivel"
    );

    estoqueInfo.textContent = obterTextoEstoque(cor);
    precoValor.textContent = formatarPreco(obterPrecoProdutoOuVariacao(produto, cor));

    botaoLoja.href = obterLinkLoja(produto);
    botaoLoja.removeAttribute("aria-disabled");
    botaoLoja.tabIndex = 0;
    botaoLoja.textContent = "Comprar no site";
    botaoLoja.classList.remove("produto__acao--desativada");

    botaoAdicionar.dataset.itemId =
      obterIdItemCarrinho(produto, cor);
    botaoAdicionar.dataset.corNome = cor.nome;
    botaoAdicionar.disabled = !corEstaDisponivel(cor);
    sincronizarBotaoAdicionar(botaoAdicionar);
  }

  function selecionarCor(index, dotEl) {
    const cor = produto.cores[index];
    corSelecionadaAtual = cor;
    atualizarEnderecoDaCor(produto, cor);

    dotsWrap.querySelectorAll(".dot").forEach((dot) => {
      dot.classList.remove("dot--ativo");
      dot.setAttribute("aria-selected", "false");
    });

    dotEl.classList.add("dot--ativo");
    dotEl.setAttribute("aria-selected", "true");

    spool.style.setProperty("--cor-atual", obterCorVisual(cor));
    spool.classList.remove(
      "spool--efeito-silk",
      "spool--efeito-glass",
      "spool--efeito-fosco",
      "spool--efeito-glow"
    );

    if (cor.efeito) {
      spool.classList.add(`spool--efeito-${cor.efeito}`);
    }

    nomeCor.textContent = cor.nome;
    atualizarEstadoEstoque(cor);

    aplicarCorSolidaDaFoto(produto, cor, () => {
      if (corSelecionadaAtual === cor) {
        spool.style.setProperty("--cor-atual", obterCorVisual(cor));
      }
    });

    atualizarFoto({
      produto,
      cor,
      area: foto.area,
      botaoImagem: foto.botao,
      imagem: foto.imagem,
      botaoVerFoto,
      anterior: foto.anterior,
      proxima: foto.proxima,
      contador: foto.contador
    });
  }

  produto.cores.forEach((cor, index) => {
    const estaAtivo = index === indiceCorInicial;

    dotsWrap.appendChild(
      criarElementoDot(produto, cor, index, selecionarCor, estaAtivo)
    );
  });

  detalhe.appendChild(cabecalhoCor);
  detalhe.appendChild(compraRapida);
  detalhe.appendChild(dotsWrap);

  artigo.appendChild(info);
  artigo.appendChild(amostraWrap);
  artigo.appendChild(detalhe);
  artigo.appendChild(foto.area);
  artigo.appendChild(lado);

  atualizarEstadoEstoque(corInicial);

  atualizarFoto({
    produto,
    cor: corInicial,
    area: foto.area,
    botaoImagem: foto.botao,
    imagem: foto.imagem,
    botaoVerFoto,
    anterior: foto.anterior,
    proxima: foto.proxima,
    contador: foto.contador
  });

  return artigo;
}


/* ============================================================
   PESQUISA E FILTROS
   ============================================================ */
function produtoCorresponde(produto, termo, materialSelecionado) {
  if (
    normalizar(materialSelecionado) !== "todos" &&
    normalizar(produto.material) !== normalizar(materialSelecionado)
  ) {
    return false;
  }

  if (!termo) {
    return true;
  }

  const termoNormalizado = normalizar(termo);
  const campos = [
    produto.marca,
    produto.material,
    produto.linha || "",
    produto.obs || "",
    ...produto.cores.map((cor) => cor.nome)
  ];

  return campos.some((campo) =>
    normalizar(campo).includes(termoNormalizado)
  );
}

function encontrarCorInicial(produto, termo) {
  if (!termo) return 0;

  const termoNormalizado = normalizar(termo);

  const indice = produto.cores.findIndex((cor) =>
    normalizar(cor.nome).includes(termoNormalizado)
  );

  return indice >= 0 ? indice : 0;
}

function encontrarIndiceCorPorSlug(produto, slugCor) {
  if (!slugCor) {
    return -1;
  }

  return produto.cores.findIndex(
    (cor) => obterSlugCor(cor) === slugCor
  );
}

let materialAtivo = "todos";
let destinoDoLinkJaAplicado = false;

function renderizar() {
  const termo = campoBuscaEl.value.trim();
  const destino = lerDestinoDoLink();

  const filtrados = produtos
    .filter((produto) =>
      produtoCorresponde(produto, termo, materialAtivo)
    )
    .map((produto, indiceOriginal) => ({
      produto,
      indiceOriginal,
      prioridade: obterDestaqueProduto(produto) ? 0 : 1
    }))
    .sort((a, b) =>
      a.prioridade - b.prioridade ||
      a.indiceOriginal - b.indiceOriginal
    )
    .map((item) => item.produto);

  listaProdutosEl.innerHTML = "";

  filtrados.forEach((produto) => {
    let indiceCorInicial = encontrarCorInicial(produto, termo);

    const produtoCorrespondeAoLink =
      destino.produto &&
      obterSlugProduto(produto) === destino.produto;

    if (produtoCorrespondeAoLink && destino.cor) {
      const indiceCorDoLink = encontrarIndiceCorPorSlug(
        produto,
        destino.cor
      );

      if (indiceCorDoLink >= 0) {
        indiceCorInicial = indiceCorDoLink;
      }
    }

    listaProdutosEl.appendChild(
      criarLinhaProduto(produto, indiceCorInicial)
    );
  });

  estadoVazioEl.hidden = filtrados.length !== 0;

  if (
    destino.produto &&
    !destinoDoLinkJaAplicado
  ) {
    const produtoDoLink = document.getElementById(
      `produto-${destino.produto}`
    );

    if (produtoDoLink) {
      destinoDoLinkJaAplicado = true;

      window.requestAnimationFrame(() => {
        produtoDoLink.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      });
    }
  }
}

function reconciliarCarrinhoComCatalogo() {
  const itensPermitidos = new Set(
    produtos.flatMap((produto) =>
      produto.cores.map((cor) =>
        obterIdItemCarrinho(produto, cor)
      )
    )
  );

  const quantidadeAnterior = carrinho.length;

  carrinho = carrinho.filter((item) =>
    itensPermitidos.has(item.id)
  );

  if (carrinho.length !== quantidadeAnterior) {
    salvarCarrinho();
    sincronizarCodigoPedidoComCarrinho();
  }
}

async function carregarProdutos() {
  listaProdutosEl.innerHTML = `
    <div class="catalogo__mensagem">
      Carregando produtos e estoque...
    </div>
  `;

  try {
    const ambienteLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
    const caminhoPrincipal = ambienteLocal
      ? "dados/produtos-preview.json"
      : "dados/produtos.json";

    let resposta = await fetch(caminhoPrincipal, { cache: "no-store" });

    // O preview é criado pelo Painel 3ZK e fica fora do Git. Enquanto ele
    // ainda não existir, o Live Server usa normalmente o último estoque salvo.
    if (ambienteLocal && !resposta.ok) {
      resposta = await fetch("dados/produtos.json", { cache: "no-store" });
    }

    const controleRecebido = await carregarControleCatalogo();

    if (!resposta.ok) {
      throw new Error(
        `Não foi possível carregar o catálogo público (${resposta.status}).`
      );
    }

    const dados = await resposta.json();

    if (!Array.isArray(dados)) {
      throw new Error("O arquivo produtos.json não contém uma lista válida.");
    }

    controleCatalogo = controleRecebido;

    const produtosValidos = dados.filter(
      (produto) =>
        produto &&
        Array.isArray(produto.cores)
    );

    produtos = aplicarControleCatalogo(produtosValidos);
    reconciliarCarrinhoComCatalogo();

    renderizar();
    renderizarCarrinho();
  } catch (erro) {
    console.error("[3ZK] Erro ao carregar o catálogo:", erro);

    listaProdutosEl.innerHTML = `
      <div class="catalogo__mensagem catalogo__mensagem--erro">
        <strong>Não foi possível carregar os produtos.</strong>
        <span>
          Abra o projeto pelo Live Server e execute VALIDAR-CATALOGO.cmd.
        </span>
      </div>
    `;

    estadoVazioEl.hidden = true;
  }
}

campoBuscaEl.addEventListener("input", renderizar);

filtrosEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".filtro");

  if (!botao) return;

  filtrosEl.querySelectorAll(".filtro").forEach((item) => {
    item.classList.remove("filtro--ativo");
  });

  botao.classList.add("filtro--ativo");
  materialAtivo = botao.dataset.material;
  renderizar();
});

sincronizarCodigoPedidoComCarrinho();
carregarProdutos();
