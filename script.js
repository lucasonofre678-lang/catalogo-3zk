/* ============================================================
   DADOS DOS PRODUTOS
   Para adicionar um novo produto, copie um bloco { ... } inteiro
   e edite marca, material, preco e a lista de cores.
   Para adicionar uma nova cor, copie uma linha { nome, hex }
   dentro do array "cores" do produto desejado.
   Campo opcional "efeito" pode ser: "silk", "glass", "fosco" ou "glow".
   ============================================================ */
const produtos = [
  {
    marca: "Flashforge",
    material: "PLA",
    preco: 90,
    linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-flashforge-pla/",  
    cores: [
      { nome: "Vermelho Coral", hex: "#FF6B5B" },
      { nome: "Laranja Escuro", hex: "#C75B12" },
      { nome: "Azul Esverdeado", hex: "#2E8B8B" },
      { nome: "Cool Gray / Cinza Azulado", hex: "#8C97A8" },
      { nome: "Cream Yellow / Amarelo Suave", hex: "#F5E1A4" },
      { nome: "Honeydew / Verde Melão", hex: "#C9E4B5" },
      { nome: "Lavender / Roxo Claro", hex: "#C7B8E8" },
      { nome: "Light Coral / Rosa-Alaranjado Claro", hex: "#F0958A" },
      { nome: "Mint Green / Verde Menta Claro", hex: "#A8E0C8" },
      { nome: "Sea Green / Verde Mar Azulado", hex: "#4F9E8C" }
    ]
  },
  {
    marca: "Closin",
    material: "PETG",
    preco: 70,
    obs: "Rolo de 1kg",
    cores: [
      { nome: "Rosa", hex: "#E8749A" }
    ]
  },
  {
    marca: "Masterprint",
    material: "PETG",
    preco: 63,
    linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-petg-masterprint/",
    cores: [
      { nome: "Roxo", hex: "#6A4C9C" },
      { nome: "Branco", hex: "#F2F2F0" }
    ]
  },
  {
    marca: "FusionX",
    material: "PETG",
    preco: 70,
     linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-petg-fusion-x-1kg-alta-performance/",
    cores: [
      { nome: "Laranja", hex: "#F07C2E" },
      { nome: "Tangerina", hex: "#F5941F" },
      { nome: "Verde Escuro", hex: "#1F5B3A" },
      { nome: "Verde Água", hex: "#4FBFAE" },
      { nome: "Pink Purple Violeta", hex: "#A24C9C" },
      { nome: "Amarelo Canário", hex: "#F5D520" }
    ]
  },
  {
    marca: "Fusion High Speed",
    material: "PETG",
    preco: 81,
    obs: "Rolo com 1,2kg — 200g a mais que o rolo padrão",
    cores: [
      { nome: "Branco", hex: "#F2F2F0" }
    ]
  },
  {
    marca: "Masterprint",
    material: "PLA",
    preco: 84,
     linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-petg-fusion-x-1kg-alta-performance/",
    cores: [
      { nome: "Branco", hex: "#F2F2F0" },
      { nome: "Laranja", hex: "#F0842E" },
      { nome: "Cinza", hex: "#9C9FA3" },
      { nome: "Transparente", hex: "#EDEFEE", efeito: "glass" },
      { nome: "Prata", hex: "#C7CBCF" },
      { nome: "Roxo Claro", hex: "#B79FD9" },
      { nome: "Prata Master", hex: "#B0B6BC" },
      { nome: "Silk Roxo", hex: "#7A4FAE", efeito: "silk" },
      { nome: "Silk Fuchsia", hex: "#D6368F", efeito: "silk" },
      { nome: "Peacock Blue", hex: "#0F7EA6", efeito: "silk" },
      { nome: "Silk Vermelho Púrpura", hex: "#9C2C4C", efeito: "silk" },
      { nome: "Fosco Roxo", hex: "#5B3F7A", efeito: "fosco" },
      { nome: "Fosco Cinza Fóssil", hex: "#6E6E64", efeito: "fosco" },
      { nome: "Cobre Esverdeado", hex: "#7A8F6E" }
    ]
  },
  {
    marca: "Masterprint",
    material: "PLA",
    preco: 90,
    linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-pla-masterprint-premium/",
    linha: "Silk Especial",
    cores: [
      { nome: "Silk Roxo com Glitter", hex: "#7A4FAE", efeito: "silk" }
    ]
  },
  {
    marca: "Masterprint",
    material: "PLA",
    preco: 94,
    linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-pla-masterprint-premium/",
    linha: "Especial",
    cores: [
      { nome: "Transparente Preto/Azul com Glitter", hex: "#171B22", efeito: "glass" },
      { nome: "Dreamy Crystal Preto/Vermelho", hex: "#1C1418", efeito: "glass" }
    ]
  },
  {
    marca: "Masterprint",
    material: "PLA",
    preco: 94,
    linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-pla-masterprint-premium/",
    linha: "Fosforescente",
    cores: [
      { nome: "Fosforescente Natural/Azul", hex: "#CDEFFA", efeito: "glow" }
    ]
  },
  {
    marca: "Masterprint",
    material: "ABS",
    preco: 70,
    linkLoja: "https://3zkfilamentos.com.br/produtos/mp-filamento-3d-abs/",
    cores: [
      { nome: "Rosa", hex: "#E86FA0" },
      { nome: "Laranja", hex: "#F0822E" },
      { nome: "Amarelo", hex: "#F5D01F" },
      { nome: "Roxo", hex: "#6E4C9C" },
      { nome: "Prata", hex: "#C7CBCF" },
      { nome: "Marrom", hex: "#6B4A34" },
      { nome: "Natural", hex: "#E9E4D8" },
      { nome: "Azul", hex: "#2E63C7" },
      { nome: "Branco", hex: "#F2F2F0" },
      { nome: "Verde", hex: "#2E9E5B" }
    ]
  },
  {
    marca: "Masterprint",
    material: "TPU",
    preco: 110,
    linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-tpu-masterprint/",
    obs: "Rolo de 1kg",
    cores: [
      { nome: "Branco", hex: "#F2F2F0" },
      { nome: "Cinza", hex: "#9C9FA3" },
      { nome: "Preto", hex: "#1B1B1B" },
      { nome: "Natural Transparente", hex: "#EEF0EF", efeito: "glass" }
    ]
  },
  {
    marca: "Creality Soleyin Ultra",
    material: "PLA",
    preco: 90,
      linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-creality-soleyin-ultra-pla-1-75mm/",
    cores: [
      { nome: "Cinza", hex: "#9C9FA3" },
      { nome: "Rosehip", hex: "#B23A4A" }
    ]
  },
  {
    marca: "Elegoo",
    material: "PLA",
    preco: 95,
      linkLoja: "https://3zkfilamentos.com.br/produtos/filamento-elegoo-pla-1-75mm-1kg/",
    cores: [
      { nome: "Orange", hex: "#F0822E" }
    ]
  },
  {
    marca: "Multifila",
    material: "PLA",
    preco: 105,
    cores: [
      { nome: "Branco", hex: "#F2F2F0" }
    ]
  }
];

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

const formatarPreco = (valor) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0
  });

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
  Algumas fotos possuem um nome diferente do nome exibido no catálogo.
  Aqui fazemos a ligação entre os dois nomes.
*/
const ALIASES_FOTOS = {
  "flashforge-pla|honeydew-verde-melao": "honey-mel"
};

/*
  Locais em que o sistema procurará as imagens.

  O caminho "fotos-3zk-prontas-para-o-site/assets/fotos" foi incluído
  porque o Windows pode criar uma pasta adicional ao extrair o ZIP.
*/
const BASES_POSSIVEIS_FOTOS = [
  "assets/fotos",
  "./assets/fotos",

  "fotos-3zk-prontas-para-o-site/assets/fotos",
  "./fotos-3zk-prontas-para-o-site/assets/fotos",

  "assets/assets/fotos",
  "./assets/assets/fotos",

  "assets/fotos/assets/fotos",
  "./assets/fotos/assets/fotos"
];

function obterCaminhosFoto(produto, cor) {
  /*
    Quando você cadastrar o caminho manualmente dentro da cor:

    imagem: "assets/fotos/produto/foto.webp"

    esse endereço terá prioridade.
  */
  if (cor.imagem) {
    return [cor.imagem];
  }

  const pasta = obterPastaProduto(produto);
  const nomeOriginal = slugificar(cor.nome);
  const chaveAlias = `${pasta}|${nomeOriginal}`;

  const nomesPossiveis = [nomeOriginal];

  if (ALIASES_FOTOS[chaveAlias]) {
    nomesPossiveis.push(ALIASES_FOTOS[chaveAlias]);
  }

  const extensoesPossiveis = [
    "webp",
    "png",
    "jpg",
    "jpeg"
  ];

  const caminhos = [];

  BASES_POSSIVEIS_FOTOS.forEach((base) => {
    nomesPossiveis.forEach((nome) => {
      extensoesPossiveis.forEach((extensao) => {
        caminhos.push(
          `${base}/${pasta}/${nome}.${extensao}`
        );
      });
    });
  });

  /*
    Remove caminhos repetidos.
  */
  return [...new Set(caminhos)];
}

function obterCaminhoFoto(produto, cor) {
  return obterCaminhosFoto(produto, cor)[0];
}


function criarLinkWhatsApp(produto, cor) {
  const nomeProduto = obterNomeCompletoProduto(produto);
  const mensagem =
    `Olá! Tenho interesse no filamento ${nomeProduto}, ` +
    `na cor ${cor.nome}. Gostaria de confirmar a disponibilidade e o valor.`;

  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

function obterLinkLoja(produto) {
  return produto.linkLoja || LINK_LOJA_PADRAO;
}

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
function criarElementoDot(cor, index, aoSelecionar, estaAtivo) {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "dot" + (estaAtivo ? " dot--ativo" : "");
  dot.style.setProperty("--cor-dot", cor.hex);
  dot.setAttribute("role", "option");
  dot.setAttribute("aria-selected", estaAtivo ? "true" : "false");
  dot.setAttribute("aria-label", `Selecionar a cor ${cor.nome}`);

  const tooltip = document.createElement("span");
  tooltip.className = "dot__tooltip";
  tooltip.textContent = cor.nome;

  dot.appendChild(tooltip);
  dot.addEventListener("click", () => aoSelecionar(index, dot));

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

  botao.appendChild(imagem);
  botao.appendChild(placeholder);
  botao.appendChild(legenda);
  area.appendChild(botao);

  return { area, botao, imagem };
}

function atualizarFoto({
  produto,
  cor,
  area,
  botaoImagem,
  imagem,
  botaoVerFoto
}) {
  const caminhos = obterCaminhosFoto(produto, cor);

  const alt =
    `${obterNomeCompletoProduto(produto)} na cor ${cor.nome}`;

  /*
    Este token impede que uma foto antiga apareça quando
    o cliente troca rapidamente entre as cores.
  */
  const tokenCarregamento =
    `${Date.now()}-${Math.random()}`;

  imagem.dataset.tokenCarregamento = tokenCarregamento;
  imagem.alt = alt;

  area.classList.remove(
    "produto__foto-area--carregada"
  );

  area.title =
    `Primeiro caminho procurado: ${caminhos[0]}`;

  botaoImagem.disabled = true;
  botaoVerFoto.disabled = true;
  botaoVerFoto.textContent = "Carregando foto...";

  let indiceCaminho = 0;
  let caminhoCarregado = "";

  function marcarComoAusente() {
    if (
      imagem.dataset.tokenCarregamento !==
      tokenCarregamento
    ) {
      return;
    }

    area.classList.remove(
      "produto__foto-area--carregada"
    );

    botaoImagem.disabled = true;
    botaoVerFoto.disabled = true;
    botaoVerFoto.textContent = "Foto em breve";

    /*
      Isso mostra no console todos os caminhos testados.
      Abra o console apertando F12 para consultar.
    */
    console.warn(
      `[3ZK] Foto não encontrada para ` +
      `${obterNomeCompletoProduto(produto)} — ${cor.nome}`,
      caminhos
    );
  }

  function tentarProximoCaminho() {
    if (
      imagem.dataset.tokenCarregamento !==
      tokenCarregamento
    ) {
      return;
    }

    /*
      Todos os caminhos foram testados.
    */
    if (indiceCaminho >= caminhos.length) {
      marcarComoAusente();
      return;
    }

    const caminhoAtual = caminhos[indiceCaminho];

    indiceCaminho += 1;

    imagem.onload = () => {
      if (
        imagem.dataset.tokenCarregamento !==
        tokenCarregamento
      ) {
        return;
      }

      caminhoCarregado = caminhoAtual;
      imagem.dataset.caminho = caminhoAtual;

      area.classList.add(
        "produto__foto-area--carregada"
      );

      area.title =
        `Imagem carregada de: ${caminhoAtual}`;

      botaoImagem.disabled = false;
      botaoVerFoto.disabled = false;
      botaoVerFoto.textContent =
        "Ver foto ampliada";
    };

    imagem.onerror = () => {
      if (
        imagem.dataset.tokenCarregamento !==
        tokenCarregamento
      ) {
        return;
      }

      /*
        Quando um caminho dá erro, testa automaticamente
        o próximo caminho da lista.
      */
      tentarProximoCaminho();
    };

    imagem.src = caminhoAtual;
  }

  function abrirFotoAtual() {
    if (
      caminhoCarregado &&
      area.classList.contains(
        "produto__foto-area--carregada"
      )
    ) {
      abrirLightbox(caminhoCarregado, alt);
    }
  }

  botaoImagem.onclick = abrirFotoAtual;
  botaoVerFoto.onclick = abrirFotoAtual;

  tentarProximoCaminho();
}

/* ============================================================
   LINHA DE PRODUTO
   ============================================================ */
function criarLinhaProduto(produto, indiceCorInicial = 0) {
  const artigo = document.createElement("article");
  artigo.className = "produto";

  const corInicial = produto.cores[indiceCorInicial] || produto.cores[0];

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
  spool.style.setProperty("--cor-atual", corInicial.hex);

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
    ? "1 cor disponível"
    : `${produto.cores.length} cores disponíveis`;

  cabecalhoCor.appendChild(nomeCor);
  cabecalhoCor.appendChild(contagem);

  const dotsWrap = document.createElement("div");
  dotsWrap.className = "dots";
  dotsWrap.setAttribute("role", "listbox");
  dotsWrap.setAttribute("aria-label", `Cores de ${produto.marca}`);

  const foto = criarAreaFoto();

  const lado = document.createElement("div");
  lado.className = "produto__lado";

  const precoWrap = document.createElement("div");
  precoWrap.className = "produto__preco";

  const precoValor = document.createElement("span");
  precoValor.className = "produto__preco-valor";
  precoValor.textContent = formatarPreco(produto.preco);

  precoWrap.appendChild(precoValor);

  const acoes = document.createElement("div");
  acoes.className = "produto__acoes";

  const botaoLoja = document.createElement("a");
  botaoLoja.className = "produto__acao produto__acao--loja";
  botaoLoja.textContent = "Comprar no site";
  botaoLoja.href = obterLinkLoja(produto);
  botaoLoja.target = "_blank";
  botaoLoja.rel = "noopener";

  const botaoWhatsApp = document.createElement("a");
  botaoWhatsApp.className = "produto__acao produto__acao--whatsapp";
  botaoWhatsApp.textContent = "Pedir no WhatsApp";
  botaoWhatsApp.target = "_blank";
  botaoWhatsApp.rel = "noopener";

  const botaoVerFoto = document.createElement("button");
  botaoVerFoto.type = "button";
  botaoVerFoto.className = "produto__acao produto__acao--foto";
  botaoVerFoto.textContent = "Foto em breve";
  botaoVerFoto.disabled = true;

  acoes.appendChild(botaoLoja);
  acoes.appendChild(botaoWhatsApp);
  acoes.appendChild(botaoVerFoto);

  lado.appendChild(precoWrap);
  lado.appendChild(acoes);

  function selecionarCor(index, dotEl) {
    const cor = produto.cores[index];

    dotsWrap.querySelectorAll(".dot").forEach((dot) => {
      dot.classList.remove("dot--ativo");
      dot.setAttribute("aria-selected", "false");
    });

    dotEl.classList.add("dot--ativo");
    dotEl.setAttribute("aria-selected", "true");

    spool.style.setProperty("--cor-atual", cor.hex);
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
    botaoWhatsApp.href = criarLinkWhatsApp(produto, cor);

    atualizarFoto({
      produto,
      cor,
      area: foto.area,
      botaoImagem: foto.botao,
      imagem: foto.imagem,
      botaoVerFoto
    });
  }

  produto.cores.forEach((cor, index) => {
    const estaAtivo = index === indiceCorInicial;

    dotsWrap.appendChild(
      criarElementoDot(cor, index, selecionarCor, estaAtivo)
    );
  });

  detalhe.appendChild(cabecalhoCor);
  detalhe.appendChild(dotsWrap);

  artigo.appendChild(info);
  artigo.appendChild(amostraWrap);
  artigo.appendChild(detalhe);
  artigo.appendChild(foto.area);
  artigo.appendChild(lado);

  botaoWhatsApp.href = criarLinkWhatsApp(produto, corInicial);

  atualizarFoto({
    produto,
    cor: corInicial,
    area: foto.area,
    botaoImagem: foto.botao,
    imagem: foto.imagem,
    botaoVerFoto
  });

  return artigo;
}

/* ============================================================
   PESQUISA E FILTROS
   ============================================================ */
function produtoCorresponde(produto, termo, materialSelecionado) {
  if (
    materialSelecionado !== "todos" &&
    produto.material !== materialSelecionado
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

let materialAtivo = "todos";

function renderizar() {
  const termo = campoBuscaEl.value.trim();

  const filtrados = produtos.filter((produto) =>
    produtoCorresponde(produto, termo, materialAtivo)
  );

  listaProdutosEl.innerHTML = "";

  filtrados.forEach((produto) => {
    const indiceCorInicial = encontrarCorInicial(produto, termo);
    listaProdutosEl.appendChild(
      criarLinhaProduto(produto, indiceCorInicial)
    );
  });

  estadoVazioEl.hidden = filtrados.length !== 0;
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

renderizar();
