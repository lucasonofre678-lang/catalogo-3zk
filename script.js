/* ============================================================
   DADOS DOS PRODUTOS
   Agora os produtos são carregados de dados/produtos.json.
   ============================================================ */
let produtos = [];

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


function obterQuantidadeEstoque(cor) {
  const estoque = Number(cor.estoque);
  return Number.isFinite(estoque) ? Math.max(0, estoque) : 0;
}

function obterTextoEstoque(cor) {
  const estoque = obterQuantidadeEstoque(cor);

  if (estoque <= 0) {
    return "Sem estoque";
  }

  if (estoque === 1) {
    return "Última unidade";
  }

  if (estoque <= 3) {
    return `Últimas ${estoque} unidades`;
  }

  return `Em estoque: ${estoque} unidades`;
}

function criarLinkWhatsApp(produto, cor) {
  const nomeProduto = obterNomeCompletoProduto(produto);
  const estoque = obterQuantidadeEstoque(cor);

  const mensagem = estoque <= 0
    ? `Olá! Tenho interesse no filamento ${nomeProduto}, na cor ${cor.nome}, ` +
      `que está sem estoque. Existe previsão de reposição?`
    : `Olá! Tenho interesse no filamento ${nomeProduto}, na cor ${cor.nome}. ` +
      `Gostaria de confirmar a disponibilidade e o valor.`;

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
  const estoque = obterQuantidadeEstoque(cor);
  const semEstoque = estoque <= 0;

  const dot = document.createElement("button");
  dot.type = "button";
  dot.className =
    "dot" +
    (estaAtivo ? " dot--ativo" : "") +
    (semEstoque ? " dot--sem-estoque" : "");

  dot.style.setProperty("--cor-dot", cor.hex);
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
    ? "1 cor cadastrada"
    : `${produto.cores.length} cores cadastradas`;

  cabecalhoCor.appendChild(nomeCor);
  cabecalhoCor.appendChild(contagem);

  const estoqueInfo = document.createElement("span");
  estoqueInfo.className = "produto__estoque";
  estoqueInfo.setAttribute("aria-live", "polite");

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
  botaoLoja.target = "_blank";
  botaoLoja.rel = "noopener";

  const botaoWhatsApp = document.createElement("a");
  botaoWhatsApp.className = "produto__acao produto__acao--whatsapp";
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

  function atualizarEstadoEstoque(cor) {
    const estoque = obterQuantidadeEstoque(cor);

    estoqueInfo.classList.remove(
      "produto__estoque--disponivel",
      "produto__estoque--baixo",
      "produto__estoque--esgotado"
    );

    artigo.classList.toggle("produto--cor-sem-estoque", estoque <= 0);

    if (estoque <= 0) {
      estoqueInfo.classList.add("produto__estoque--esgotado");
      estoqueInfo.textContent = "Sem estoque";

      botaoLoja.removeAttribute("href");
      botaoLoja.setAttribute("aria-disabled", "true");
      botaoLoja.tabIndex = -1;
      botaoLoja.textContent = "Sem estoque no site";
      botaoLoja.classList.add("produto__acao--desativada");

      botaoWhatsApp.textContent = "Consultar reposição";
    } else {
      estoqueInfo.classList.add(
        estoque <= 3
          ? "produto__estoque--baixo"
          : "produto__estoque--disponivel"
      );
      estoqueInfo.textContent = obterTextoEstoque(cor);

      botaoLoja.href = obterLinkLoja(produto);
      botaoLoja.removeAttribute("aria-disabled");
      botaoLoja.tabIndex = 0;
      botaoLoja.textContent = "Comprar no site";
      botaoLoja.classList.remove("produto__acao--desativada");

      botaoWhatsApp.textContent = "Pedir no WhatsApp";
    }

    botaoWhatsApp.href = criarLinkWhatsApp(produto, cor);
  }

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
    atualizarEstadoEstoque(cor);

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
  detalhe.appendChild(estoqueInfo);
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

async function carregarProdutos() {
  listaProdutosEl.innerHTML = `
    <div class="catalogo__mensagem">
      Carregando produtos e estoque...
    </div>
  `;

  try {
    const resposta = await fetch("dados/produtos.json", {
      cache: "no-store"
    });

    if (!resposta.ok) {
      throw new Error(
        `Não foi possível carregar dados/produtos.json (${resposta.status}).`
      );
    }

    const dados = await resposta.json();

    if (!Array.isArray(dados)) {
      throw new Error("O arquivo produtos.json não contém uma lista válida.");
    }

    produtos = dados.filter(
      (produto) =>
        produto &&
        Array.isArray(produto.cores) &&
        produto.cores.length > 0
    );

    renderizar();
  } catch (erro) {
    console.error("[3ZK] Erro ao carregar o catálogo:", erro);

    listaProdutosEl.innerHTML = `
      <div class="catalogo__mensagem catalogo__mensagem--erro">
        <strong>Não foi possível carregar os produtos.</strong>
        <span>
          Abra o projeto pelo Live Server e confirme se existe
          dados/produtos.json.
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

carregarProdutos();
