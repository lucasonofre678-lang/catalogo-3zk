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
        text: "Veja a foto real desta cor no catálogo da 3ZK:",
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
    preco: Number(produto.preco) || 0,
    hex: cor.hex || "#D9DFE8",
    efeito: cor.efeito || "",
    imagem: fotos[0] || "",
    quantidade: 1
  };
}

function mostrarToastPedido(item) {
  if (!pedidoToastEl) return;

  window.clearTimeout(temporizadorToast);

  pedidoToastTextoEl.textContent =
    `${item.nomeProduto} · ${item.corNome}`;

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

    existente.preco = Number(produto.preco) || existente.preco;
    existente.imagem = obterFotosCor(produto, cor)[0] || existente.imagem;
    existente.hex = cor.hex || existente.hex;
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
    const textoOriginal = "Adicionar ao carrinho";

    botao.classList.add("produto__adicionar--confirmado");

    if (textoEl) {
      textoEl.textContent = "Adicionado!";
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
  const quantidade = carrinho.find(
    (item) => item.id === botao.dataset.itemId
  )?.quantidade || 0;

  if (quantidadeEl) {
    quantidadeEl.textContent = String(quantidade);
    quantidadeEl.hidden = quantidade === 0;
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
        style="--cor-revisao: ${escaparHTML(item.hex)}"
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
        style="--cor-item: ${escaparHTML(item.hex)}"
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
      ? "Carrinho vazio"
      : `${obterTextoQuantidade(quantidade)} · ${formatarPrecoPedido(total)}${financeiro.aplicaDesconto ? ` no ${financeiro.formaDescontoCurta}` : ""}`;
  }

  if (abrirCarrinhoEl) {
    abrirCarrinhoEl.setAttribute(
      "aria-label",
      quantidade === 0
        ? "Abrir meu pedido. Carrinho vazio."
        : `Abrir meu pedido. ${obterTextoQuantidade(
            quantidade
          )}, ${financeiro.aplicaDesconto ? `total com desconto no ${financeiro.formaDescontoCurta}` : "total"} ${formatarPrecoPedido(total)}.`
    );
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
function criarElementoDot(cor, index, aoSelecionar, estaAtivo) {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "dot" + (estaAtivo ? " dot--ativo" : "");
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
      `${obterNomeCompletoProduto(produto)} na cor ${cor.nome}. ` +
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
      `${obterNomeCompletoProduto(produto)} na cor ${cor.nome}`
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

  if (marca === "masterprint" && material === "PETG") {
    return {
      variante: "azul",
      titulo: "DESTAQUE",
      subtitulo: "Novo no catálogo"
    };
  }

  if (marca === "closin" && material === "PLA") {
    return {
      variante: "dourado",
      titulo: "DESTAQUE",
      subtitulo: "Novas cores"
    };
  }

  return null;
}

function criarSeloDestaqueProduto(destaque) {
  const selo = document.createElement("div");
  selo.className =
    `produto__destaque produto__destaque--${destaque.variante}`;
  selo.setAttribute(
    "aria-label",
    `${destaque.titulo}: ${destaque.subtitulo}`
  );

  selo.innerHTML = `
    <span class="produto__destaque-selo">
      <svg
        class="produto__destaque-icone"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m12 3 2.36 4.78 5.27.77-3.82 3.72.9 5.25L12 15.03 7.29 17.5l.9-5.24-3.82-3.72 5.27-.77L12 3Z"
          fill="currentColor"
        ></path>
      </svg>
      <span>${destaque.titulo}</span>
    </span>
    <span class="produto__destaque-subtitulo">
      ${destaque.subtitulo}
    </span>
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
    artigo.classList.add(
      "produto--destaque",
      `produto--destaque-${destaque.variante}`
    );
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

  const compraRapida = document.createElement("div");
  compraRapida.className = "produto__compra-rapida";

  const estoqueInfo = document.createElement("span");
  estoqueInfo.className = "produto__estoque";
  estoqueInfo.setAttribute("aria-live", "polite");

  const botaoAdicionar = document.createElement("button");
  botaoAdicionar.type = "button";
  botaoAdicionar.className = "produto__adicionar";
  botaoAdicionar.title = "Adicionar ao carrinho";
  botaoAdicionar.innerHTML = `
    <span class="produto__adicionar-icone" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
        <path d="M3.5 4.5h2.1l1.7 9.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4l1.3-5.2H7"></path>
        <circle cx="10" cy="19" r="1.2"></circle>
        <circle cx="17.5" cy="19" r="1.2"></circle>
        <path d="M15.5 4v4"></path>
        <path d="M13.5 6h4"></path>
      </svg>
    </span>
    <span class="produto__adicionar-texto">Adicionar ao carrinho</span>
    <span class="produto__adicionar-quantidade" hidden>0</span>
  `;

  compraRapida.appendChild(estoqueInfo);
  compraRapida.appendChild(botaoAdicionar);

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

  const botaoCompartilhar = document.createElement("button");
  botaoCompartilhar.type = "button";
  botaoCompartilhar.className =
    "produto__acao produto__acao--compartilhar";
  botaoCompartilhar.textContent = "Compartilhar cor";

  botaoCompartilhar.addEventListener("click", () => {
    compartilharCor(
      produto,
      corSelecionadaAtual,
      botaoCompartilhar
    );
  });

  const botaoVerFoto = document.createElement("button");
  botaoVerFoto.type = "button";
  botaoVerFoto.className = "produto__acao produto__acao--foto";
  botaoVerFoto.textContent = "Foto em breve";
  botaoVerFoto.disabled = true;

  acoes.appendChild(botaoLoja);
  acoes.appendChild(botaoWhatsApp);
  acoes.appendChild(botaoCompartilhar);
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

    botaoLoja.href = obterLinkLoja(produto);
    botaoLoja.removeAttribute("aria-disabled");
    botaoLoja.tabIndex = 0;
    botaoLoja.textContent = "Comprar no site";
    botaoLoja.classList.remove("produto__acao--desativada");

    botaoWhatsApp.textContent = "Pedir no WhatsApp";
    botaoWhatsApp.href = criarLinkWhatsApp(produto, cor);

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
      botaoVerFoto,
      anterior: foto.anterior,
      proxima: foto.proxima,
      contador: foto.contador
    });
  }

  produto.cores.forEach((cor, index) => {
    const estaAtivo = index === indiceCorInicial;

    dotsWrap.appendChild(
      criarElementoDot(cor, index, selecionarCor, estaAtivo)
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
const MATERIAIS_PRINCIPAIS = new Set([
  "PLA",
  "PETG",
  "ABS",
  "ASA",
  "TPU",
  "TPR"
]);

function produtoCorresponde(produto, termo, materialSelecionado) {
  const materialProduto = String(produto.material || "").trim().toUpperCase();

  if (materialSelecionado === "outras") {
    if (MATERIAIS_PRINCIPAIS.has(materialProduto)) {
      return false;
    }
  } else if (
    materialSelecionado !== "todos" &&
    materialProduto !== String(materialSelecionado).trim().toUpperCase()
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
    const [resposta, controleRecebido] = await Promise.all([
      fetch("dados/produtos.json", {
        cache: "no-store"
      }),
      carregarControleCatalogo()
    ]);

    if (!resposta.ok) {
      throw new Error(
        `Não foi possível carregar dados/produtos.json (${resposta.status}).`
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

sincronizarCodigoPedidoComCarrinho();
carregarProdutos();
