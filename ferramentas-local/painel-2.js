/* ============================================================
   PAINEL LOCAL 2.0 — CENTRAL DE MANUTENÇÃO DO CATÁLOGO 3ZK
   Camada de tarefas sobre o painel existente (painel-catalogo-3zk.html).
   Não cria base própria: lê e altera somente os arquivos oficiais já
   usados pelo painel (dados/produtos-base.json, dados/controle-catalogo.json,
   automacao/mapeamento-olist.json e assets/fotos). Tudo fica pendente até
   "Salvar alterações", que continua sendo o salvamento validado do painel.
   ============================================================ */
(() => {
  "use strict";

  const P = window.painel3ZK;
  if (!P) { console.error("[Painel 2.0] painel3ZK não foi carregado."); return; }

  /* ---------------- CONSTANTES ---------------- */
  const REPO = CONFIG.repo;
  const SITE = CONFIG.site;
  const URL_ACTIONS = `https://github.com/${REPO}/actions`;
  const URL_WORKFLOW_PUBLICAR = `${URL_ACTIONS}/workflows/publicar-site.yml`;
  const URL_WORKFLOW_ESTOQUE = `${URL_ACTIONS}/workflows/atualizar-estoque.yml`;
  // Horários (UTC) dos agendamentos em .github/workflows — manter em sincronia.
  const CRON_PUBLICACAO_UTC = [0, 12, 17];
  const CRON_ESTOQUE_UTC = [11, 18, 21];
  const PARCELAS = 3;

  // Famílias administrativas (campo "familiaCor" da variação). Mesmas chaves de FAMILIA_COR_MANUAL no script.js.
  const FAMILIAS = [
    ["preto", "Preto", "#1B1D22"], ["branco", "Branco", "#F1F1EC"], ["cinza", "Cinza", "#8B9096"], ["prata", "Prata", "#B8BEC5"],
    ["azul", "Azul", "#3F78D1"], ["ciano", "Ciano", "#1CA7D8"], ["verde", "Verde", "#4F9D63"], ["amarelo", "Amarelo", "#E2C23E"],
    ["laranja", "Laranja", "#E07A34"], ["vermelho", "Vermelho", "#C94843"], ["rosa", "Rosa", "#DE6F9E"], ["roxo", "Roxo", "#7F58B8"],
    ["marrom", "Marrom", "#7A5537"], ["dourado", "Dourado", "#C99A3E"], ["natural", "Natural", "#E6DFCF"], ["translucido", "Translúcido", "#DDE5EA"],
    ["multicolor", "Multicolor", "#D98A92"], ["outros", "Outros", "#CBD2DC"]
  ].map(([id, nome, hex]) => ({ id, nome, hex }));
  const FAMILIA_POR_ID = new Map(FAMILIAS.map((f) => [f.id, f]));
  const RANK_FAMILIA = { branco: 1, natural: 1, amarelo: 2, dourado: 2, laranja: 3, vermelho: 4, rosa: 5, roxo: 6, azul: 7, ciano: 7, verde: 8, marrom: 9, cinza: 10, prata: 10, preto: 11, translucido: 12, multicolor: 13, outros: 14 };
  const ID_POR_RANK = { 1: "branco", 2: "amarelo", 3: "laranja", 4: "vermelho", 5: "rosa", 6: "roxo", 7: "azul", 8: "verde", 9: "marrom", 10: "cinza", 11: "preto", 12: "translucido", 13: "multicolor", 14: "outros" };
  const ACABAMENTOS = [["", "Comum"], ["silk", "Silk"], ["fosco", "Fosco / Matte"], ["glass", "Translúcido / Glass"], ["neon", "Fluorescente / Neon"], ["glow", "Fosforescente"], ["marmorizado", "Marmorizado"]];
  const ROTULO_ACABAMENTO = new Map(ACABAMENTOS);

  // Detecção automática pelo nome — espelha getColorFamily do script.js (site) para mostrar a mesma ordem.
  const PALAVRAS_FAMILIA = [
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
  ].map(([rank, fortes, fracas]) => ({ rank, fortes: new Set(fortes), fracas: new Set(fracas) }));

  const buscaNorm = (texto = "") => normalizar(texto).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

  function rankPorPalavras(palavras) {
    for (const tipo of ["fortes", "fracas"]) {
      for (const palavra of palavras) {
        const achou = PALAVRAS_FAMILIA.find((f) => f[tipo].has(palavra));
        if (achou) return achou.rank;
      }
    }
    return 0;
  }

  function rankAutomatico(nome, efeito = "") {
    const bruto = String(nome || "");
    const texto = buscaNorm(bruto);
    if (normalizar(efeito) === "glass" || /\b(translucido|transparente|translucent|crystal|cristal|glass)\b/.test(texto)) return 12;
    if (/\b(rainbow|arco iris|macaron|colors|candy|lollipop|ice cream|dual|duo|tricolor|termo)\b/.test(texto)) return 13;
    const partes = bruto.replace(/\s+\/\s+/g, " ").split("/");
    if (partes.length > 1 && new Set(partes.map((parte) => rankPorPalavras(buscaNorm(parte).split(" ")))).size > 1) return 13;
    return rankPorPalavras(texto.split(" ")) || 14;
  }

  const familiaAutomatica = (cor) => ID_POR_RANK[rankAutomatico(cor?.nome, cor?.efeito)];
  const familiaEfetiva = (cor) => (FAMILIA_POR_ID.has(cor?.familiaCor) ? cor.familiaCor : familiaAutomatica(cor));
  const rankCor = (cor) => RANK_FAMILIA[FAMILIA_POR_ID.has(cor?.familiaCor) ? cor.familiaCor : ""] || rankAutomatico(cor?.nome, cor?.efeito);

  /* ---------------- ESTADO DO PAINEL 2.0 ---------------- */
  const p2 = {
    aba: "visao",
    rascunhos: new Set(), rascunhosOriginal: new Set(),
    controleVisto: null, baseVista: null,
    meta: null, git: null, github: null, consultandoGithub: false, acompanhamento: null,
    arquivosFotos: null, fotosInexistentes: new Set(), fotosVarridas: false, varrendoFotos: false,
    filtroTexto: "", filtroStatus: "todos", filtroMaterial: "todos", filtroIds: null, filtroRotulo: "",
    abertos: new Set(), selecao: new Set(),
    editor: null, buscaModo: "", buscaAtivo: 0,
    imagensFiltro: "problemas", olistFiltro: "problemas", seoFiltro: "problemas",
    modalPreco: null, modalVariacao: null, modalOlist: null, modalLote: null,
    urlsArquivos: new WeakMap()
  };

  /* ---------------- UTILITÁRIOS ---------------- */
  const centavos = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
  function resumoPreco(valor) {
    const normal = centavos(valor);
    return { normal, pix: centavos(normal - centavos(normal * 0.05)), parcela: centavos(normal / PARCELAS) };
  }
  const moeda = (valor) => formatarPreco(valor);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const iguais = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const truncar = (texto, max = 60) => { const t = String(texto ?? ""); return t.length > max ? `${t.slice(0, max - 1)}…` : t; };
  const confirmar = (texto) => window.confirm(texto);

  function urlArquivo(arquivo) {
    if (!p2.urlsArquivos.has(arquivo)) p2.urlsArquivos.set(arquivo, URL.createObjectURL(arquivo));
    return p2.urlsArquivos.get(arquivo);
  }

  function nomeInterface(raw) {
    const acessorio = secaoRaw(raw) === "acessorios";
    if (!acessorio) return P.nomeProduto(raw);
    const partes = [raw.marca];
    const material = normalizar(raw.material || "");
    const redundante = material === "outras" || material === normalizar(raw.categoria || "") || partes.some((parte) => normalizar(parte || "").includes(material));
    if (raw.material && !redundante) partes.push(raw.material);
    if (raw.linha) partes.push(raw.linha);
    return partes.filter(Boolean).join(" ");
  }

  function secaoRaw(raw) {
    if (normalizar(raw?.secao || "") === "acessorios") return "acessorios";
    const tipo = normalizar(raw?.tipoProduto || "filamento");
    return tipo && tipo !== "filamento" ? "acessorios" : "filamentos";
  }

  function linkCatalogo(raw, cor) {
    const url = new URL(SITE);
    url.searchParams.set("produto", slugificar(P.nomeProduto(raw)));
    if (cor) url.searchParams.set("cor", slugificar(cor.nome));
    return url.toString();
  }

  function proximoHorario(horasUtc) {
    const agora = new Date();
    for (let dia = 0; dia < 2; dia += 1) {
      for (const hora of [...horasUtc].sort((a, b) => a - b)) {
        const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + dia, hora, 0, 0));
        if (d > agora) return d;
      }
    }
    return null;
  }

  function dataCurta(valor) {
    if (!valor) return "—";
    const d = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
  }

  function tempoRelativo(valor) {
    if (!valor) return "";
    const d = new Date(valor);
    const minutos = Math.round((Date.now() - d.getTime()) / 60000);
    if (!Number.isFinite(minutos)) return "";
    if (minutos < 1) return "agora";
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 48) return `há ${horas} h`;
    return `há ${Math.round(horas / 24)} dias`;
  }

  /* ---------------- MODELO (visão sobre os arquivos oficiais) ---------------- */
  function mapaOlist() {
    const mapa = new Map();
    (estado.mapeamentoAtualRaw?.itens || []).forEach((item) => mapa.set(String(item.chave || ""), item));
    return mapa;
  }

  function rascunhosEfetivos() {
    return new Set([...p2.rascunhos].filter((id) => estado.produtosPausados.has(id)));
  }

  function modelo() {
    const preparados = new Map(estado.produtos.map((produto) => [produto.id, produto]));
    const olist = mapaOlist();
    const rascunhos = rascunhosEfetivos();
    return estado.baseAtualRaw.map((raw, indice) => {
      const id = obterIdProduto(raw);
      const preparado = preparados.get(id);
      const precoBase = Number(raw.preco) || 0;
      const produtoPausadoAgora = estado.produtosPausados.has(id);
      const cores = (raw.cores || []).map((cor, posicao) => {
        const corId = obterIdCor(id, cor);
        const publica = preparado?.cores.find((item) => item.id === corId);
        const temPreco = cor.preco !== undefined && cor.preco !== null && cor.preco !== "";
        const preco = temPreco ? Number(cor.preco) : precoBase;
        const imagens = P.imagensRaw(cor);
        // Referências cujo arquivo não existe não contam como foto (o site mostra a amostra de cor).
        const fotosReais = imagens.filter((caminho) => !p2.fotosInexistentes.has(caminho));
        const faltandoConfirmada = cor.fotoStatus !== "ausente" && imagens.some((caminho) => p2.fotosInexistentes.has(caminho));
        const mapa = olist.get(String(cor.chaveEstoque || corId));
        const estoque = publica?.statusEstoque || "sem_estoque";
        let status = "ativa";
        if (rascunhos.has(id)) status = "rascunho";
        else if (produtoPausadoAgora) status = "pausado";
        else if (estado.coresPausadas.has(corId)) status = "pausada";
        else if (!publica?.disponivelPublico) status = "sem_estoque";
        else if (estoque === "ultimas_unidades") status = "ultimas";
        return {
          raw: cor, id: corId, posicao, nome: cor.nome || "Sem nome", preco, temPreco,
          precoProprio: temPreco && Math.abs(Number(cor.preco) - precoBase) > 0.001,
          precoValido: !temPreco || Number(cor.preco) > 0,
          imagens, fotosReais, semFoto: !fotosReais.length, faltandoConfirmada, familia: familiaEfetiva(cor), familiaManual: FAMILIA_POR_ID.has(cor.familiaCor), efeito: cor.efeito || "",
          olist: mapa || null, estoque, status, pausada: estado.coresPausadas.has(corId),
          visivel: status === "ativa" || status === "ultimas"
        };
      });
      let status = "ativo";
      if (rascunhos.has(id)) status = "rascunho";
      else if (produtoPausadoAgora) status = "pausado";
      else if (!cores.some((cor) => cor.visivel)) status = "sem_estoque";
      return {
        raw, id, indice, nome: P.nomeProduto(raw), nomeInterface: nomeInterface(raw), preco: precoBase, status, cores,
        acessorio: secaoRaw(raw) === "acessorios", material: raw.material || "", categoria: raw.categoria || "",
        capa: cores.flatMap((cor) => cor.fotosReais)[0] || "", novo: !P.produtoRawPorId(estado.baseOriginalRaw, id)
      };
    });
  }

  /* ---------------- EDIÇÃO SEGURA (base + preview espelhado) ---------------- */
  function paraCadaRaw(produtoId, fn) {
    [estado.baseAtualRaw, estado.publicoAtualRaw].forEach((lista, i) => {
      const produto = P.produtoRawPorId(lista, produtoId);
      if (produto) fn(produto, i === 0);
    });
  }

  const vazio = (valor) => valor === undefined || valor === null || valor === "";

  function definirCampoProduto(produtoId, campo, valor) {
    paraCadaRaw(produtoId, (produto) => { if (vazio(valor)) delete produto[campo]; else produto[campo] = valor; });
  }

  function definirCampoCor(produtoId, corId, campo, valor) {
    paraCadaRaw(produtoId, (produto) => {
      const cor = P.corRawPorId(produto, corId);
      if (!cor) return;
      if (vazio(valor)) delete cor[campo]; else cor[campo] = valor;
    });
  }

  // modo: "manual" grava ordemCores=manual; "familia" remove (o site ordena por família); undefined mantém.
  function reordenarCores(produtoId, ids, modo) {
    paraCadaRaw(produtoId, (produto) => {
      const pid = obterIdProduto(produto);
      const porId = new Map(produto.cores.map((cor) => [obterIdCor(pid, cor), cor]));
      const novas = ids.map((id) => porId.get(id)).filter(Boolean);
      produto.cores.forEach((cor) => { if (!novas.includes(cor)) novas.push(cor); });
      produto.cores = novas;
      if (modo === "manual") produto.ordemCores = "manual";
      if (modo === "familia") delete produto.ordemCores;
    });
  }

  function ordenarPorFamilia(produtoId) {
    const produto = P.produtoRawPorId(estado.baseAtualRaw, produtoId);
    if (!produto) return;
    const pid = obterIdProduto(produto);
    const ordem = produto.cores
      .map((cor, indice) => ({ id: obterIdCor(pid, cor), rank: rankCor(cor), nome: String(cor.nome || ""), indice }))
      .sort((a, b) => a.rank - b.rank || a.nome.localeCompare(b.nome, "pt-BR") || a.indice - b.indice)
      .map((item) => item.id);
    reordenarCores(produtoId, ordem, "familia");
    P.reconstruir();
    mostrarToast("Cores organizadas por família", "A ordem automática também é a usada no site.");
  }

  function marcarRascunho(produtoId, ligado) {
    if (ligado) p2.rascunhos.add(produtoId); else p2.rascunhos.delete(produtoId);
  }

  /* ---------------- DIFERENÇAS EXTRAS (entram no "Salvar alterações") ---------------- */
  const CAMPOS_PRODUTO = { categoria: "Categoria", obs: "Observação", linkLoja: "Link da loja", seoTitulo: "Título SEO", seoDescricao: "Description SEO", ordemCores: "Ordem manual das cores", tipoProduto: "Tipo do produto" };
  const CAMPOS_COR = { preco: "Preço da variação", familiaCor: "Família de cor", efeito: "Acabamento", hex: "Cor visual" };
  const CAMPOS_OLIST = ["olistId", "sku", "gtin", "descricaoOlist"];

  function valorLegivel(campo, valor, contexto = {}) {
    if (campo === "preco") return vazio(valor) ? `herda ${moeda(contexto.precoBase || 0)}` : moeda(valor);
    if (campo === "familiaCor") return vazio(valor) ? "automática" : (FAMILIA_POR_ID.get(valor)?.nome || valor);
    if (campo === "efeito") return ROTULO_ACABAMENTO.get(valor || "") || valor;
    if (campo === "ordemCores") return valor === "manual" ? "manual" : "por família";
    if (campo === "rascunho") return valor ? "rascunho" : "fora do rascunho";
    if (campo === "olist") return valor ? `ID ${valor.olistId || "—"}${valor.sku ? ` · SKU ${valor.sku}` : ""}` : "sem vínculo";
    if (vazio(valor)) return "vazio";
    return `“${truncar(valor, 50)}”`;
  }

  function criarExtra(dados) {
    const chave = [dados.tipo, dados.produtoId || "", dados.corId || dados.chaveOlist || "", dados.campo || ""].join("¦");
    const rotulo = dados.rotulo;
    const antes = valorLegivel(dados.campoLegivel || dados.campo, dados.antes, dados);
    const depois = valorLegivel(dados.campoLegivel || dados.campo, dados.depois, dados);
    const texto = dados.campo === "ordem" ? "ordem das cores alterada" : `${antes} → ${depois}`;
    return {
      ...dados, chave, id: chave, acao: "alterar",
      descricao: `${rotulo.toLowerCase()} de ${dados.nome}: ${texto}`,
      resumoHistorico: `${rotulo}: ${dados.nome} (${texto})`,
      resumoCommit: `Atualiza ${rotulo.toLowerCase()} de ${truncar(dados.nome, 48)}`,
      renderizar: () => `<div class="alteracao alteracao--preco"><div class="alteracao__icone">${dados.icone || "✎"}</div><div class="alteracao__texto"><strong>${escapar(rotulo)}: ${escapar(dados.nome)}</strong><span>${escapar(texto)}</span></div><button class="botao botao--cinza botao--pequeno" data-desfazer-extra="${escapar(chave)}" type="button">Desfazer</button></div>`
    };
  }

  function diferencasExtras() {
    if (!Array.isArray(estado.baseOriginalRaw) || !Array.isArray(estado.baseAtualRaw)) return [];
    const resultado = [];
    const originais = new Map(estado.baseOriginalRaw.map((produto) => [obterIdProduto(produto), produto]));
    estado.baseAtualRaw.forEach((atual) => {
      const produtoId = obterIdProduto(atual);
      const original = originais.get(produtoId);
      if (!original) return; // produto novo: coberto pelo cadastro
      const nome = P.nomeProduto(atual);
      Object.entries(CAMPOS_PRODUTO).forEach(([campo, rotulo]) => {
        if (!iguais(original[campo], atual[campo])) resultado.push(criarExtra({ tipo: "extra-produto", arquivo: "base", produtoId, campo, antes: original[campo] ?? null, depois: atual[campo] ?? null, nome, rotulo, icone: campo.startsWith("seo") ? "SEO" : "✎" }));
      });
      const idsOriginais = (original.cores || []).map((cor) => obterIdCor(produtoId, cor));
      const idsAtuais = (atual.cores || []).map((cor) => obterIdCor(produtoId, cor)).filter((id) => idsOriginais.includes(id));
      const ordemOriginal = idsOriginais.filter((id) => idsAtuais.includes(id));
      if (ordemOriginal.join("\n") !== idsAtuais.join("\n")) resultado.push(criarExtra({ tipo: "extra-ordem", arquivo: "base", produtoId, campo: "ordem", antes: ordemOriginal, depois: idsAtuais, nome, rotulo: "Ordem das cores", icone: "⇅" }));
      const precoBaseOriginal = Number(original.preco) || 0;
      const passamAHerdar = [];
      (atual.cores || []).forEach((cor) => {
        const corId = obterIdCor(produtoId, cor);
        const corOriginal = (original.cores || []).find((item) => obterIdCor(produtoId, item) === corId);
        if (!corOriginal) return;
        Object.entries(CAMPOS_COR).forEach(([campo, rotulo]) => {
          if (iguais(corOriginal[campo], cor[campo])) return;
          // Cor que tinha o preço base antigo gravado e agora herda o novo: agrupada num item só.
          if (campo === "preco" && vazio(cor.preco) && Math.abs(Number(corOriginal.preco) - precoBaseOriginal) < 0.001) { passamAHerdar.push({ corId, preco: corOriginal.preco }); return; }
          resultado.push(criarExtra({ tipo: "extra-cor", arquivo: "base", produtoId, corId, campo, antes: corOriginal[campo] ?? null, depois: cor[campo] ?? null, nome: `${nome} — ${cor.nome}`, rotulo, precoBase: Number(atual.preco) || 0, icone: campo === "preco" ? "R$" : "✎" }));
        });
      });
      if (passamAHerdar.length) {
        const chave = `extra-herdar¦${produtoId}`;
        const texto = `${plural(passamAHerdar.length, "variação deixa", "variações deixam")} de fixar ${moeda(precoBaseOriginal)} e ${passamAHerdar.length === 1 ? "herda" : "herdam"} ${moeda(atual.preco)}`;
        resultado.push({
          tipo: "extra-herdar", arquivo: "base", produtoId, campo: "preco-herdado", chave, id: chave, acao: "alterar", nome, antes: passamAHerdar, depois: null,
          descricao: `variações de ${nome} passam a herdar o preço base (${passamAHerdar.length})`,
          resumoHistorico: `Preço das variações: ${nome} (${texto})`,
          resumoCommit: `Atualiza preços de ${truncar(nome, 48)}`,
          renderizar: () => `<div class="alteracao alteracao--preco"><div class="alteracao__icone">R$</div><div class="alteracao__texto"><strong>Preço das variações: ${escapar(nome)}</strong><span>${escapar(texto)}</span></div><button class="botao botao--cinza botao--pequeno" data-desfazer-extra="${escapar(chave)}" type="button">Desfazer</button></div>`
        });
      }
    });

    const mapaOriginal = new Map((estado.mapeamentoOriginalRaw?.itens || []).map((item) => [String(item.chave || ""), item]));
    const chavesBaseOriginal = new Set(estado.baseOriginalRaw.flatMap((produto) => (produto.cores || []).map((cor) => String(cor.chaveEstoque || ""))));
    const escolher = (item) => (item ? Object.fromEntries(CAMPOS_OLIST.map((campo) => [campo, item[campo] ?? null])) : null);
    const chavesMapaAtual = new Set();
    (estado.mapeamentoAtualRaw?.itens || []).forEach((item) => {
      const chave = String(item.chave || "");
      chavesMapaAtual.add(chave);
      if (!chavesBaseOriginal.has(chave)) return; // vínculo de cor nova: coberto pelo cadastro
      const antes = escolher(mapaOriginal.get(chave));
      const depois = escolher(item);
      if (!iguais(antes, depois)) resultado.push(criarExtra({ tipo: "extra-olist", arquivo: "mapa", chaveOlist: chave, campo: "olist", antes, depois, nome: nomePorId("cor", chave), rotulo: "Vínculo Olist", icone: "ID" }));
    });
    mapaOriginal.forEach((item, chave) => {
      if (chavesBaseOriginal.has(chave) && !chavesMapaAtual.has(chave)) resultado.push(criarExtra({ tipo: "extra-olist", arquivo: "mapa", chaveOlist: chave, campo: "olist", antes: escolher(item), depois: null, nome: nomePorId("cor", chave), rotulo: "Vínculo Olist", icone: "ID" }));
    });

    const efetivos = rascunhosEfetivos();
    const pausadosOriginais = new Set(estado.controleOriginal?.produtosPausados || []);
    new Set([...efetivos, ...p2.rascunhosOriginal]).forEach((produtoId) => {
      if (efetivos.has(produtoId) === p2.rascunhosOriginal.has(produtoId)) return;
      if (pausadosOriginais.has(produtoId) !== estado.produtosPausados.has(produtoId)) return; // já aparece como pausa/reativação
      resultado.push(criarExtra({ tipo: "extra-rascunho", arquivo: "controle", produtoId, campo: "rascunho", antes: p2.rascunhosOriginal.has(produtoId), depois: efetivos.has(produtoId), nome: nomePorId("produto", produtoId), rotulo: "Situação de rascunho", icone: "✎" }));
    });
    return resultado;
  }

  function desfazerExtra(chave) {
    const item = diferencasExtras().find((extra) => extra.chave === chave);
    if (!item) return;
    if (item.tipo === "extra-produto") definirCampoProduto(item.produtoId, item.campo, item.antes);
    else if (item.tipo === "extra-cor") definirCampoCor(item.produtoId, item.corId, item.campo, item.antes);
    else if (item.tipo === "extra-ordem") reordenarCores(item.produtoId, item.antes);
    else if (item.tipo === "extra-herdar") item.antes.forEach(({ corId, preco }) => definirCampoCor(item.produtoId, corId, "preco", preco));
    else if (item.tipo === "extra-rascunho") marcarRascunho(item.produtoId, item.antes);
    else if (item.tipo === "extra-olist") {
      const itens = estado.mapeamentoAtualRaw.itens;
      const original = (estado.mapeamentoOriginalRaw?.itens || []).find((x) => x.chave === item.chaveOlist);
      const indice = itens.findIndex((x) => x.chave === item.chaveOlist);
      if (original && indice >= 0) itens[indice] = structuredClone(original);
      else if (original) itens.push(structuredClone(original));
      else if (indice >= 0) itens.splice(indice, 1);
      estado.mapeamentoAtualRaw.total = itens.length;
    }
    P.reconstruir();
  }

  function validarAntesDeSalvar() {
    const erros = [];
    estado.baseAtualRaw.forEach((produto) => {
      (produto.cores || []).forEach((cor) => {
        if (!vazio(cor.preco) && !(Number(cor.preco) > 0)) erros.push(`${P.nomeProduto(produto)} — ${cor.nome}: preço da variação inválido.`);
        if (!vazio(cor.familiaCor) && !FAMILIA_POR_ID.has(cor.familiaCor)) erros.push(`${P.nomeProduto(produto)} — ${cor.nome}: família de cor desconhecida.`);
      });
      if (!vazio(produto.ordemCores) && produto.ordemCores !== "manual") erros.push(`${P.nomeProduto(produto)}: valor de ordemCores inválido.`);
    });
    const skus = (estado.mapeamentoAtualRaw?.itens || []).map((item) => String(item.sku || "").trim()).filter(Boolean);
    const skuDuplicado = skus.find((sku, i) => skus.indexOf(sku) !== i);
    if (skuDuplicado && !(estado.mapeamentoOriginalRaw?.itens || []).some((item, i, lista) => item.sku === skuDuplicado && lista.findIndex((x) => x.sku === skuDuplicado) !== i)) {
      erros.push(`O SKU ${skuDuplicado} ficaria repetido em duas variações.`);
    }
    if (erros.length) throw new Error(erros.slice(0, 3).join(" "));
  }

  /* ---------------- CONTROLE: rascunhos e motivos no arquivo interno ---------------- */
  const controleAtualBase = controleAtual;
  controleAtual = function() {
    const controle = controleAtualBase();
    controle.rascunhos = [...rascunhosEfetivos()].sort();
    const motivos = {};
    [...controle.produtosPausados, ...controle.coresPausadas].forEach((id) => {
      const detalhe = estado.detalhesProdutos[id] || estado.detalhesCores[id];
      if (!detalhe?.motivo) return;
      motivos[id] = { motivo: detalhe.motivo };
      if (detalhe.observacao) motivos[id].observacao = detalhe.observacao;
      if (detalhe.pausadoEm) motivos[id].em = detalhe.pausadoEm;
      if (detalhe.pausadoPor) motivos[id].por = detalhe.pausadoPor;
    });
    controle.motivos = motivos;
    return controle;
  };

  function aplicarControleExtra(bruto) {
    const lista = Array.isArray(bruto?.rascunhos) ? bruto.rascunhos.map(String) : [];
    p2.rascunhos = new Set(lista);
    p2.rascunhosOriginal = new Set(lista.filter((id) => (estado.controleOriginal?.produtosPausados || []).includes(id)));
    const motivos = bruto?.motivos && typeof bruto.motivos === "object" ? bruto.motivos : {};
    Object.entries(motivos).forEach(([id, info]) => {
      if (!info?.motivo) return;
      const detalhes = estado.produtosPausados.has(id) ? estado.detalhesProdutos : estado.coresPausadas.has(id) ? estado.detalhesCores : null;
      if (detalhes) detalhes[id] = { motivo: info.motivo, observacao: info.observacao || "", pausadoEm: info.em || null, pausadoPor: info.por || "" };
    });
  }

  /* ---------------- CARREGAMENTO ---------------- */
  async function lerTextoPasta(pasta, partes) {
    let dir = pasta;
    for (let i = 0; i < partes.length - 1; i += 1) dir = await dir.getDirectoryHandle(partes[i]);
    return (await (await dir.getFileHandle(partes.at(-1))).getFile()).text();
  }

  async function aposCarregar(pasta) {
    try { aplicarControleExtra(await lerJsonHandle(estado.controleHandle, {})); } catch { /* controle sem extras */ }
    try { p2.meta = JSON.parse(await lerTextoPasta(pasta, ["dados", "ultima-atualizacao.json"])); } catch { p2.meta = null; }
    p2.fotosVarridas = false;
    p2.controleVisto = estado.controleOriginal;
    p2.baseVista = estado.baseOriginalRaw;
    P.reconstruir();
    varrerFotos();
    lerGit(pasta);
    consultarGitHub();
  }

  const carregarDaPastaBase = carregarDaPasta;
  carregarDaPasta = async function(pasta) {
    await carregarDaPastaBase(pasta);
    await aposCarregar(pasta);
  };

  const carregarPreviewBase = carregarPreview;
  carregarPreview = async function() {
    await carregarPreviewBase();
    try { const resposta = await fetch("../dados/controle-catalogo.json", { cache: "no-store" }); if (resposta.ok) aplicarControleExtra(await resposta.json()); } catch { /* opcional */ }
    try { const resposta = await fetch("../dados/ultima-atualizacao.json", { cache: "no-store" }); if (resposta.ok) p2.meta = await resposta.json(); } catch { /* opcional */ }
    p2.controleVisto = estado.controleOriginal;
    P.reconstruir();
  };

  async function listarArquivos(dir, prefixo, saida) {
    for await (const [nome, handle] of dir.entries()) {
      if (handle.kind === "directory") await listarArquivos(handle, `${prefixo}/${nome}`, saida);
      else saida.add(`${prefixo}/${nome}`);
    }
  }

  async function varrerFotos() {
    if (!estado.pastaHandle || p2.varrendoFotos) return;
    p2.varrendoFotos = true;
    try {
      const arquivos = new Set();
      try {
        const fotos = await (await estado.pastaHandle.getDirectoryHandle("assets")).getDirectoryHandle("fotos");
        await listarArquivos(fotos, "assets/fotos", arquivos);
      } catch { /* sem pasta de fotos */ }
      const referencias = new Set(estado.baseAtualRaw.flatMap((produto) => (produto.cores || []).flatMap((cor) => P.imagensRaw(cor))));
      const inexistentes = new Set();
      for (const caminho of referencias) {
        if (arquivos.has(caminho) || estado.arquivosFotosPendentes.has(caminho)) continue;
        if (!caminho.startsWith("assets/fotos/")) { try { await obterArquivoPorCaminho(caminho); continue; } catch { /* inexistente */ } }
        inexistentes.add(caminho);
      }
      p2.arquivosFotos = arquivos;
      p2.fotosInexistentes = inexistentes;
      p2.fotosVarridas = true;
    } finally {
      p2.varrendoFotos = false;
    }
    renderTudo();
  }

  async function lerGit(pasta) {
    try {
      const head = (await lerTextoPasta(pasta, [".git", "HEAD"])).trim();
      const packed = await lerTextoPasta(pasta, [".git", "packed-refs"]).catch(() => "");
      const resolver = async (ref) => {
        try { return (await lerTextoPasta(pasta, [".git", ...ref.split("/")])).trim(); }
        catch { return packed.split(/\r?\n/).find((linha) => linha.endsWith(` ${ref}`))?.split(" ")[0] || ""; }
      };
      const ref = head.startsWith("ref:") ? head.slice(4).trim() : "";
      const sha = ref ? await resolver(ref) : head;
      const origem = await resolver("refs/remotes/origin/main");
      const log = await lerTextoPasta(pasta, [".git", "logs", "HEAD"]).catch(() => "");
      const linhas = log.trim().split(/\r?\n/).filter(Boolean);
      const ultima = linhas.at(-1) || "";
      const commitLinha = [...linhas].reverse().find((linha) => /\tcommit/.test(linha)) || "";
      const tempo = (linha) => { const m = linha.match(/> (\d+) [+-]\d{4}\t/); return m ? new Date(Number(m[1]) * 1000) : null; };
      p2.git = { ramo: ref.replace("refs/heads/", ""), sha, origem, movimento: tempo(ultima), ultimoCommit: tempo(commitLinha), mensagem: (commitLinha.split("\t")[1] || "").replace(/^commit[^:]*:\s*/, "") };
    } catch {
      p2.git = { erro: "Pasta .git não encontrada ou sem permissão de leitura." };
    }
    renderTudo();
  }

  async function apiGitHub(caminho) {
    const resposta = await fetch(`https://api.github.com/repos/${REPO}/${caminho}`, { headers: { Accept: "application/vnd.github+json" } });
    if (!resposta.ok) throw new Error(resposta.status === 403 ? "limite de consultas do GitHub atingido; tente em alguns minutos" : `GitHub respondeu ${resposta.status}`);
    return resposta.json();
  }

  async function consultarGitHub(silencioso = true) {
    if (p2.consultandoGithub) return;
    p2.consultandoGithub = true;
    try {
      const [main, publicar, agendado, estoque] = await Promise.all([
        apiGitHub("commits/main"),
        apiGitHub("actions/workflows/publicar-site.yml/runs?per_page=6"),
        apiGitHub("actions/workflows/publicar-catalogo-agendado.yml/runs?per_page=3").catch(() => ({ workflow_runs: [] })),
        apiGitHub("actions/workflows/atualizar-estoque.yml/runs?per_page=1").catch(() => ({ workflow_runs: [] }))
      ]);
      const execucoes = [...(publicar.workflow_runs || []), ...(agendado.workflow_runs || [])].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      const sucesso = execucoes.find((run) => run.conclusion === "success");
      p2.github = {
        mainSha: main.sha, mainData: main.commit?.committer?.date, mainMensagem: (main.commit?.message || "").split("\n")[0],
        publicado: sucesso ? { sha: sucesso.head_sha, data: sucesso.updated_at, titulo: sucesso.display_title, url: sucesso.html_url } : null,
        andamento: execucoes.find((run) => run.status !== "completed") || null,
        ultima: execucoes[0] || null,
        estoque: estoque.workflow_runs?.[0] || null,
        consultadoEm: new Date()
      };
    } catch (erro) {
      p2.github = { ...(p2.github || {}), erro: erro.message, consultadoEm: new Date() };
      if (!silencioso) mostrarToast("GitHub indisponível", erro.message);
    } finally {
      p2.consultandoGithub = false;
    }
    renderTudo();
  }

  function acompanharPublicacao() {
    clearInterval(p2.acompanhamento?.timer);
    let tentativas = 0;
    p2.acompanhamento = { inicio: new Date(), timer: setInterval(async () => {
      tentativas += 1;
      if (estado.pastaHandle) await lerGit(estado.pastaHandle);
      await consultarGitHub();
      const publicadoAgora = p2.github?.publicado && p2.git?.sha && p2.github.publicado.sha === p2.git.sha;
      if (publicadoAgora || tentativas >= 12) {
        clearInterval(p2.acompanhamento.timer);
        p2.acompanhamento = null;
        if (publicadoAgora) mostrarToast("Site atualizado", "A versão local já está publicada.");
        renderTudo();
      }
    }, 45000) };
    consultarGitHub(false);
    fecharModal("modal-salvo");
    abrirAba("publicacao");
    mostrarToast("Acompanhando a publicação", "O painel consulta o GitHub a cada 45 segundos. Faça o Push no GitHub Desktop.");
  }

  /* ---------------- PROBLEMAS DO CATÁLOGO ---------------- */
  function problemas(m = modelo()) {
    const lista = [];
    const add = (nivel, id, titulo, texto, acao) => lista.push({ nivel, id, titulo, texto, acao });
    const todasCores = m.flatMap((produto) => produto.cores.map((cor) => ({ produto, cor })));
    const idsProdutos = (itens) => [...new Set(itens.map((item) => item.produto?.id || item.id))];

    const chaves = estado.baseAtualRaw.flatMap((produto) => (produto.cores || []).map((cor) => String(cor.chaveEstoque || "")));
    const chavesDup = [...new Set(chaves.filter((chave, i) => chave && chaves.indexOf(chave) !== i))];
    if (chavesDup.length) add("erro", "chave-dup", `${plural(chavesDup.length, "chaveEstoque duplicada", "chavesEstoque duplicadas")}`, chavesDup.slice(0, 3).join(" • "), { tipo: "olist", filtro: "problemas" });

    const itensMapa = estado.mapeamentoAtualRaw?.itens || [];
    const ids = itensMapa.map((item) => Number(item.olistId));
    const idsDup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (idsDup.length) add("erro", "olist-dup", `${plural(idsDup.length, "ID Olist duplicado", "IDs Olist duplicados")}`, idsDup.slice(0, 4).join(" • "), { tipo: "olist", filtro: "problemas" });

    const chavesBase = new Set(chaves);
    const orfaos = itensMapa.filter((item) => !chavesBase.has(String(item.chave || "")));
    if (orfaos.length) add("erro", "mapa-orfao", `${plural(orfaos.length, "vínculo Olist aponta", "vínculos Olist apontam")} para variação inexistente`, orfaos.slice(0, 3).map((item) => item.chave).join(" • "), { tipo: "olist", filtro: "problemas" });

    const semVinculoAtivas = todasCores.filter(({ cor }) => !cor.olist && ["ativa", "ultimas", "sem_estoque"].includes(cor.status));
    if (semVinculoAtivas.length) add("erro", "sem-vinculo", `${plural(semVinculoAtivas.length, "variação ativa sem", "variações ativas sem")} vínculo Olist`, "Bloqueia o salvamento. Vincule o ID ou pause a variação.", { tipo: "olist", filtro: "sem-vinculo" });

    const precoInvalido = todasCores.filter(({ produto, cor }) => !(produto.preco > 0) || !cor.precoValido);
    if (precoInvalido.length) add("erro", "preco", `${plural(idsProdutos(precoInvalido).length, "produto com preço inválido", "produtos com preço inválido")}`, "Preço zero, vazio ou negativo.", { tipo: "produtos", ids: idsProdutos(precoInvalido), rotulo: "Preço inválido" });

    if (p2.fotosVarridas) {
      const confirmadas = todasCores.filter(({ cor }) => cor.faltandoConfirmada);
      if (confirmadas.length) add("erro", "foto-inexistente", `${plural(confirmadas.length, "foto confirmada não existe", "fotos confirmadas não existem")} no disco`, "Marcadas como confirmadas, mas o arquivo sumiu. O salvamento e a publicação acusam erro.", { tipo: "imagens", filtro: "inexistentes" });
    }

    const slugs = m.map((produto) => slugificar(produto.nomeInterface));
    const slugDup = [...new Set(slugs.filter((slug, i) => slugs.indexOf(slug) !== i))];
    if (slugDup.length) add("erro", "slug", `${plural(slugDup.length, "slug de página duplicado", "slugs de página duplicados")}`, slugDup.join(" • "), { tipo: "seo", filtro: "problemas" });

    const semFoto = todasCores.filter(({ cor }) => cor.semFoto);
    const aguardandoArquivo = semFoto.filter(({ cor }) => cor.imagens.length).length;
    if (semFoto.length) add("aviso", "sem-foto", `${plural(semFoto.length, "variação sem foto", "variações sem foto")}`, `Aparecem com a amostra de cor.${aguardandoArquivo ? ` ${aguardandoArquivo} já têm o nome do arquivo reservado, mas a foto ainda não foi enviada.` : ""}`, { tipo: "imagens", filtro: "sem-foto" });

    const semCapa = m.filter((produto) => !produto.capa);
    if (semCapa.length) add("aviso", "sem-capa", `${plural(semCapa.length, "produto sem capa", "produtos sem capa")}`, semCapa.slice(0, 3).map((p) => p.nome).join(" • "), { tipo: "produtos", ids: semCapa.map((p) => p.id), rotulo: "Sem capa" });

    const skus = itensMapa.map((item) => String(item.sku || "").trim()).filter(Boolean);
    const skuDup = [...new Set(skus.filter((sku, i) => skus.indexOf(sku) !== i))];
    if (skuDup.length) add("aviso", "sku-dup", `${plural(skuDup.length, "SKU repetido", "SKUs repetidos")} no mapeamento`, skuDup.slice(0, 4).join(" • "), { tipo: "olist", filtro: "problemas" });

    const usoFoto = new Map();
    todasCores.forEach(({ cor }) => cor.imagens.forEach((caminho) => usoFoto.set(caminho, (usoFoto.get(caminho) || 0) + 1)));
    const fotosRepetidas = [...usoFoto].filter(([, n]) => n > 1);
    if (fotosRepetidas.length) add("aviso", "foto-dup", `${plural(fotosRepetidas.length, "foto usada", "fotos usadas")} em mais de uma variação`, "Pode ser proposital, mas costuma indicar cadastro copiado.", { tipo: "imagens", filtro: "duplicadas" });

    const seoRuins = m.filter((produto) => statusSeo(produto, m).avisos.length);
    if (seoRuins.length) add("aviso", "seo", `${plural(seoRuins.length, "página SEO incompleta", "páginas SEO incompletas")}`, "Título ou description fora do tamanho recomendado.", { tipo: "seo", filtro: "problemas" });

    const idsProdutosBase = new Set(m.map((produto) => produto.id));
    const idsCoresBase = new Set(todasCores.map(({ cor }) => cor.id));
    const pausasOrfas = [...estado.produtosPausados].filter((id) => !idsProdutosBase.has(id)).length + [...estado.coresPausadas].filter((id) => !idsCoresBase.has(id)).length;
    if (pausasOrfas) add("aviso", "pausa-orfa", `${plural(pausasOrfas, "pausa aponta", "pausas apontam")} para item removido`, "Sem efeito no site; pode ser limpo no controle.", null);

    const rascunhos = m.filter((produto) => produto.status === "rascunho");
    if (rascunhos.length) add("info", "rascunhos", `${plural(rascunhos.length, "produto em rascunho", "produtos em rascunho")}`, rascunhos.slice(0, 3).map((p) => p.nome).join(" • "), { tipo: "produtos", status: "rascunho" });
    const pausados = m.filter((produto) => produto.status === "pausado");
    if (pausados.length) add("info", "pausados", `${plural(pausados.length, "produto pausado", "produtos pausados")}`, "Ocultos manualmente, mesmo com estoque.", { tipo: "produtos", status: "pausado" });
    const semEstoque = m.filter((produto) => produto.status === "sem_estoque");
    if (semEstoque.length) add("info", "sem-estoque", `${plural(semEstoque.length, "produto sem estoque", "produtos sem estoque")}`, "Determinado pela Olist; voltam sozinhos quando houver saldo.", { tipo: "produtos", status: "sem_estoque" });
    const aguardandoVinculo = todasCores.filter(({ cor }) => !cor.olist && !["ativa", "ultimas", "sem_estoque"].includes(cor.status));
    if (aguardandoVinculo.length) add("info", "aguardando-vinculo", `${plural(aguardandoVinculo.length, "variação pausada aguarda", "variações pausadas aguardam")} vínculo Olist`, "Permitido enquanto estiverem pausadas ou em rascunho.", { tipo: "olist", filtro: "sem-vinculo" });
    if (p2.arquivosFotos) {
      const referenciadas = new Set(todasCores.flatMap(({ cor }) => cor.imagens));
      const orfas = [...p2.arquivosFotos].filter((caminho) => !referenciadas.has(caminho) && /\.(webp|jpe?g|png|avif)$/i.test(caminho));
      if (orfas.length) add("info", "orfas", `${plural(orfas.length, "arquivo de foto sem uso", "arquivos de foto sem uso")}`, "Existem em assets/fotos mas nenhuma variação aponta para eles.", { tipo: "imagens", filtro: "orfas" });
    }
    const ordem = { erro: 0, aviso: 1, info: 2 };
    return lista.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
  }

  function executarAcaoProblema(acao) {
    if (!acao) return;
    if (acao.tipo === "produtos") {
      p2.filtroIds = acao.ids ? new Set(acao.ids) : null;
      p2.filtroRotulo = acao.rotulo || "";
      p2.filtroStatus = acao.status || "todos";
      p2.filtroTexto = "";
      abrirAba("produtos");
    } else if (acao.tipo === "imagens") { p2.imagensFiltro = acao.filtro; abrirAba("imagens"); }
    else if (acao.tipo === "olist") { p2.olistFiltro = acao.filtro; abrirAba("olist"); }
    else if (acao.tipo === "seo") { p2.seoFiltro = acao.filtro; abrirAba("seo"); }
  }

  /* ---------------- SEO ---------------- */
  function seoAutomatico(produto) {
    const n = produto.cores.filter((cor) => cor.visivel).length || produto.cores.length;
    // Mesmos rótulos de rotulo_variacao() em automacao/gerar_paginas_seo.py.
    const plural2 = n > 1 ? (produto.raw.rotuloVariacaoPlural || (produto.acessorio ? "opções" : "cores")) : (produto.raw.rotuloVariacaoSingular || (produto.acessorio ? "opção" : "cor"));
    const nome = produto.nomeInterface;
    if (produto.acessorio) {
      return { titulo: `${nome} | Acessórios para impressão 3D | 3ZK`, descricao: `${nome} no catálogo 3ZK: ${n} ${plural2} com foto, preço e disponibilidade. Monte seu pedido e envie pelo WhatsApp.` };
    }
    return { titulo: `Filamento ${nome} | ${n} ${plural2} | 3ZK`, descricao: `Filamento ${nome} para impressão 3D com ${n} ${plural2} no catálogo 3ZK. Confira fotos, preço e disponibilidade de cada cor.` };
  }

  function seoSugestao(produto) {
    const raw = produto.raw;
    const peso = (String(raw.obs || "").match(/(\d+(?:[.,]\d+)?\s?(?:kg|g))\b/i) || [])[1] || "";
    if (produto.acessorio) {
      return { titulo: truncar(`${produto.nomeInterface} para impressão 3D | 3ZK`, 65), descricao: truncar(`${produto.nomeInterface} para impressão 3D na 3ZK. Confira opções, fotos e disponibilidade. 5% no Pix, 3x sem juros e retirada em Curitiba.`, 160) };
    }
    const titulo = [`Filamento ${raw.material}`, raw.marca, raw.linha, peso.replace(/\s/g, "")].filter(Boolean).join(" ");
    const n = produto.cores.length;
    return {
      titulo: truncar(`${titulo} | 3ZK`, 65),
      descricao: truncar(`Filamento ${raw.material} ${raw.marca}${raw.linha ? ` ${raw.linha}` : ""} para impressão 3D: ${n} ${n === 1 ? "cor" : "cores"} com foto e estoque atualizado. 5% no Pix, 3x sem juros e retirada em Curitiba.`, 160)
    };
  }

  function statusSeo(produto, m = null) {
    const auto = seoAutomatico(produto);
    const titulo = String(produto.raw.seoTitulo || "").trim() || auto.titulo;
    const descricao = String(produto.raw.seoDescricao || "").trim() || auto.descricao;
    const slug = slugificar(produto.nomeInterface);
    const avisos = [];
    const infos = [];
    if (titulo.length > 65) avisos.push(`Título longo (${titulo.length})`);
    if (titulo.length < 25) avisos.push("Título curto");
    if (descricao.length > 160) avisos.push(`Description longa (${descricao.length})`);
    if (descricao.length < 70) avisos.push("Description curta");
    if (!slug) avisos.push("Slug inválido");
    if (m && m.filter((outro) => slugificar(outro.nomeInterface) === slug).length > 1) avisos.push("Slug duplicado");
    if (!produto.capa) avisos.push("Falta foto/ALT principal");
    if (!produto.cores.some((cor) => cor.visivel)) infos.push("Página não gerada (produto fora do site)");
    const corPadrao = produto.cores.find((cor) => cor.visivel) || produto.cores[0];
    return { titulo, descricao, slug, alt: `${produto.nomeInterface} — ${corPadrao?.nome || ""}`, avisos, infos, personalizado: Boolean(produto.raw.seoTitulo || produto.raw.seoDescricao) };
  }

  /* ---------------- HTML COMPARTILHADO ---------------- */
  const ROTULO_STATUS = {
    ativo: ["Ativo", "●", "verde"], ativa: ["Ativa", "●", "verde"], sem_estoque: ["Sem estoque", "○", "cinza"],
    pausado: ["Pausado", "Ⅱ", "vermelha"], pausada: ["Pausada", "Ⅱ", "vermelha"], rascunho: ["Rascunho", "✎", "roxa"], ultimas: ["Últimas un.", "◆", "amarela"]
  };
  function pill(status) {
    const [texto, icone, cor] = ROTULO_STATUS[status] || [status, "•", "cinza"];
    return `<span class="p2-pill p2-pill--${cor}"><b aria-hidden="true">${icone}</b>${texto}</span>`;
  }

  function thumb(caminho, hex = "#d9dfe8", classe = "p2-thumb") {
    const src = caminho ? P.urlFoto(caminho) : "";
    return `<span class="${classe}" data-bg="${escapar(hex)}">${src ? `<img src="${escapar(src)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>`;
  }

  function aplicarFundos(raiz) {
    $$("[data-bg]", raiz).forEach((el) => { el.style.background = el.dataset.bg; });
  }

  function opcoesFamilia(valor = "", nome = "", efeito = "") {
    const auto = FAMILIA_POR_ID.get(familiaAutomatica({ nome, efeito }))?.nome || "Outros";
    return `<option value="">Automática (${escapar(auto)})</option>` + FAMILIAS.map((f) => `<option value="${f.id}" ${f.id === valor ? "selected" : ""}>${escapar(f.nome)}</option>`).join("");
  }

  function opcoesAcabamento(valor = "") {
    return ACABAMENTOS.map(([id, nome]) => `<option value="${id}" ${id === (valor || "") ? "selected" : ""}>${escapar(nome)}</option>`).join("");
  }

  function precoBotao(valor, acao, extra = "", sub = "") {
    const r = resumoPreco(valor);
    return `<button class="p2-preco" type="button" data-p2-acao="${acao}" ${extra} title="Editar preço"><strong>${moeda(r.normal)}</strong><small>${sub || `Pix ${moeda(r.pix)} · ${PARCELAS}x ${moeda(r.parcela)}`}</small></button>`;
  }

  function linhaVariacao(produto, cor, opcoes = {}) {
    const sel = p2.selecao.has(`c:${produto.id}::${cor.id}`);
    const pausar = cor.pausada ? `<button class="botao botao--verde botao--pequeno" type="button" data-p2-acao="reativar-cor">Reativar</button>` : `<button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="pausar-cor" ${["pausado", "rascunho"].includes(cor.status) ? "disabled title=\"O produto inteiro está fora do site\"" : ""}>Pausar</button>`;
    const olist = cor.olist ? `<code title="SKU ${escapar(cor.olist.sku || "—")}">${escapar(cor.olist.olistId)}</code>` : `<button class="p2-link p2-link--alerta" type="button" data-p2-acao="olist">Vincular</button>`;
    const motivo = cor.pausada ? estado.detalhesCores[cor.id]?.motivo : "";
    return `<tr data-p2-cor="${escapar(cor.id)}" data-p2-produto-da-cor="${escapar(produto.id)}" draggable="${opcoes.arrastar === false ? "false" : "true"}" class="${sel ? "is-sel" : ""}">
      <td><input type="checkbox" data-p2-sel="c:${escapar(produto.id)}::${escapar(cor.id)}" ${sel ? "checked" : ""} aria-label="Selecionar ${escapar(cor.nome)}"></td>
      <td class="p2-arrastar" title="Arraste para reordenar" aria-hidden="true">⋮⋮</td>
      <td><div class="p2-cor-nome">${thumb(cor.imagens[0], cor.raw.hex)}<div><strong>${escapar(cor.nome)}</strong><span>${!cor.semFoto ? plural(cor.fotosReais.length, "foto", "fotos") : '<em class="p2-alerta">sem foto</em>'}${motivo ? ` · ${escapar(motivo)}` : ""}</span></div></div></td>
      <td><select class="campo p2-campo-mini" data-p2-campo-cor="familiaCor" aria-label="Família de cor">${opcoesFamilia(cor.raw.familiaCor, cor.nome, cor.efeito)}</select></td>
      <td><select class="campo p2-campo-mini" data-p2-campo-cor="efeito" aria-label="Acabamento">${opcoesAcabamento(cor.efeito)}</select></td>
      <td>${precoBotao(cor.preco, "preco-cor", "", cor.temPreco ? (cor.precoProprio ? "preço próprio" : "igual à base (fixo)") : "herdado")}</td>
      <td>${olist}</td>
      <td>${pill(cor.status)}</td>
      <td class="p2-acoes-linha"><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="foto-cor">Foto</button>${pausar}<button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="duplicar-cor" title="Duplicar variação">Duplicar</button><a class="botao botao--cinza botao--pequeno" href="${escapar(linkCatalogo(produto.raw, cor.raw))}" target="_blank" rel="noopener" title="Abrir no catálogo">↗</a></td>
    </tr>`;
  }

  function tabelaVariacoes(produto) {
    const manual = produto.raw.ordemCores === "manual";
    return `<div class="p2-variacoes__topo"><span>${manual ? "Ordem <strong>manual</strong> (arrastada) — o site respeita esta ordem." : "Ordem <strong>automática por família</strong> no site. Arraste para definir uma ordem manual."}</span><div><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="nova-cor">+ Nova variação</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="ordenar-familia">Ordenar por família</button></div></div>
      <div class="p2-tabela-wrap"><table class="p2-tabela"><thead><tr><th></th><th></th><th>Variação</th><th>Família</th><th>Acabamento</th><th>Preço</th><th>Olist</th><th>Status</th><th></th></tr></thead><tbody data-p2-ordenavel="${escapar(produto.id)}">${produto.cores.map((cor) => linhaVariacao(produto, cor)).join("")}</tbody></table></div>`;
  }

  function botoesStatusProduto(produto) {
    if (produto.status === "rascunho") return `<button class="botao botao--verde botao--pequeno" type="button" data-p2-acao="publicar-rascunho">Publicar</button>`;
    if (produto.status === "pausado") return `<button class="botao botao--verde botao--pequeno" type="button" data-p2-acao="reativar">Reativar</button>`;
    return `<button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="pausar">Pausar</button>`;
  }

  /* ---------------- PAINÉIS ---------------- */
  const ABAS = [
    ["visao", "Visão geral", '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>'],
    ["produtos", "Produtos", '<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="m3 13 9 5 9-5"/>'],
    ["cadastro", "Adicionar produto", '<path d="M12 5v14M5 12h14"/>'],
    ["olist", "Estoque / Olist", '<path d="M4 7h16M4 12h16M4 17h10"/>'],
    ["imagens", "Imagens", '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>'],
    ["seo", "SEO", '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'],
    ["publicacao", "Publicação", '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 21h14"/>'],
    ["ajuda", "Ajuda e backups", '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.1 2.3c-1 .6-1.6 1.1-1.6 2.2"/><path d="M12 17h.01"/>']
  ];

  function montarLayout() {
    document.body.classList.add("p2");
    const acoes = $(".topo__acoes");
    const botaoBusca = document.createElement("button");
    botaoBusca.type = "button";
    botaoBusca.className = "topo__botao p2-botao-busca";
    botaoBusca.id = "p2-abrir-busca";
    botaoBusca.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>Buscar<kbd>Ctrl K</kbd>';
    acoes.prepend(botaoBusca);
    const recarregar = $("#acao-atualizar");
    recarregar.className = "topo__botao";
    acoes.insertBefore(recarregar, $("#status-conexao"));
    const operador = $("#botao-operador");
    operador.classList.add("p2-operador");
    acoes.insertBefore(operador, $("#status-conexao"));

    const nav = $(".navegacao");
    const contadores = { cadastro: $("#contador-cadastro") };
    $$(".aba", nav).forEach((aba) => { aba.hidden = true; });
    ABAS.forEach(([id, nome, icone]) => {
      const antigo = $(`.aba[data-aba='${id}']`, nav);
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "aba p2-aba";
      botao.dataset.aba = id;
      botao.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icone}</svg>${nome}<span class="aba__contador" id="p2-contador-${id}" hidden>0</span>`;
      if (antigo && contadores[id]) contadores[id].hidden = true;
      nav.appendChild(botao);
    });
    nav.addEventListener("click", (evento) => {
      const botao = evento.target.closest(".p2-aba");
      if (botao) abrirAba(botao.dataset.aba);
    });

    const secoes = ["visao", "produtos", "olist", "imagens", "seo", "publicacao"].map((id) => {
      const secao = document.createElement("section");
      secao.className = "painel p2-painel";
      secao.dataset.painel = id;
      secao.id = `p2-${id}`;
      return secao;
    });
    nav.after(...secoes);

    document.body.insertAdjacentHTML("beforeend", MODAIS_HTML);
  }

  const abrirAbaBase = abrirAba;
  const REDIRECIONAR = { catalogo: "produtos", comercial: "produtos", alteracoes: "publicacao", diagnostico: "visao" };
  abrirAba = function(nome) {
    const destino = REDIRECIONAR[nome] || nome;
    p2.aba = destino;
    abrirAbaBase(destino);
    $$(".p2-aba").forEach((aba) => aba.classList.toggle("aba--ativa", aba.dataset.aba === destino));
    renderTudo();
  };

  function renderTudo() {
    if (!document.body.classList.contains("p2")) return;
    const m = modelo();
    const lista = problemas(m);
    const graves = lista.filter((item) => item.nivel !== "info").length;
    const pendentes = diferencas().length;
    const contador = (id, n, alerta) => { const el = $(`#p2-contador-${id}`); if (!el) return; el.textContent = n; el.hidden = !n; el.classList.toggle("p2-contador--alerta", Boolean(alerta)); };
    contador("visao", graves, lista.some((item) => item.nivel === "erro"));
    contador("publicacao", pendentes);
    contador("cadastro", P.diferencasCadastro().length);
    contador("olist", lista.filter((item) => ["sem-vinculo", "olist-dup", "mapa-orfao", "chave-dup"].includes(item.id)).length, true);
    if (p2.aba === "visao") renderVisao(m, lista);
    if (p2.aba === "produtos") renderProdutos(m);
    if (p2.aba === "olist") renderOlist(m);
    if (p2.aba === "imagens") renderImagens(m);
    if (p2.aba === "seo") renderSeo(m);
    if (p2.aba === "publicacao") renderPublicacao(m);
    if (p2.editor) renderEditor(m);
  }

  /* ---------- VISÃO GERAL ---------- */
  function renderVisao(m, lista) {
    const cores = m.flatMap((produto) => produto.cores);
    const contar = (status) => m.filter((produto) => produto.status === status).length;
    const semFoto = cores.filter((cor) => cor.semFoto).length;
    const semVinculo = cores.filter((cor) => !cor.olist).length;
    const pendentes = diferencas().length;
    const graves = lista.filter((item) => item.nivel !== "info");
    const metrica = (rotulo, valor, detalhe, cor, acao) => `<button class="p2-metrica p2-metrica--${cor}" type="button" ${acao ? `data-p2-metrica='${escapar(JSON.stringify(acao))}'` : "disabled"}><small>${rotulo}</small><strong>${valor}</strong><span>${detalhe}</span></button>`;
    const conectado = Boolean(estado.carregado);
    const meta = p2.meta;
    const publicado = p2.github?.publicado;
    $("#p2-visao").innerHTML = `
      <div class="p2-cabecalho"><div><h2>Visão geral</h2><p>${conectado ? `${plural(m.length, "produto", "produtos")} e ${plural(cores.length, "variação", "variações")} lidos dos arquivos oficiais.` : "Conecte a pasta do catálogo para começar."}</p></div>
        <div class="p2-acoes-rapidas">
          <button class="botao botao--primario" type="button" data-p2-rapida="produto">+ Adicionar produto</button>
          <button class="botao botao--claro" type="button" data-p2-rapida="variacao">+ Adicionar variação</button>
          <button class="botao botao--claro" type="button" data-p2-rapida="preco">Alterar preço</button>
          <button class="botao botao--claro" type="button" data-p2-rapida="foto">Trocar foto</button>
          <button class="botao botao--claro" type="button" data-p2-rapida="pausa">Pausar / reativar</button>
          <button class="botao botao--claro" type="button" data-p2-rapida="problemas">Ver problemas</button>
          <button class="botao botao--verde" type="button" data-p2-rapida="publicar">Publicar agora</button>
        </div></div>
      <div class="p2-metricas">
        ${metrica("Produtos ativos", contar("ativo"), "aparecem no site", "verde", { tipo: "produtos", status: "ativo" })}
        ${metrica("Pausados", contar("pausado"), "ocultos manualmente", "vermelha", { tipo: "produtos", status: "pausado" })}
        ${metrica("Rascunhos", contar("rascunho"), "ainda não publicados", "roxa", { tipo: "produtos", status: "rascunho" })}
        ${metrica("Sem estoque", contar("sem_estoque"), "pela Olist", "cinza", { tipo: "produtos", status: "sem_estoque" })}
        ${metrica("Variações", cores.length, `${cores.filter((cor) => cor.visivel).length} visíveis`, "azul", { tipo: "produtos", status: "todos" })}
        ${metrica("Sem foto", semFoto, "variações", semFoto ? "amarela" : "verde", { tipo: "imagens", filtro: "sem-foto" })}
        ${metrica("Sem vínculo Olist", semVinculo, "variações", semVinculo ? "amarela" : "verde", { tipo: "olist", filtro: "sem-vinculo" })}
        ${metrica("Problemas", graves.length, graves.some((item) => item.nivel === "erro") ? "com erro" : "avisos", graves.length ? "vermelha" : "verde", null)}
        ${metrica("Alterações pendentes", pendentes, pendentes ? "não salvas" : "tudo salvo", pendentes ? "amarela" : "verde", pendentes ? { tipo: "publicacao" } : null)}
      </div>
      <div class="p2-grade">
        <article class="p2-cartao" id="p2-problemas"><div class="p2-cartao__topo"><div><strong>Problemas do catálogo</strong><span>Clique para ir direto ao problema</span></div><button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="varrer-fotos">${p2.varrendoFotos ? "Verificando fotos..." : "Verificar fotos de novo"}</button></div>
          <div class="p2-problemas">${lista.length ? lista.map((item, i) => `<button class="p2-problema p2-problema--${item.nivel}" type="button" data-p2-problema="${i}" ${item.acao ? "" : "disabled"}><b>${item.nivel === "erro" ? "!" : item.nivel === "aviso" ? "△" : "i"}</b><span><strong>${escapar(item.titulo)}</strong><small>${escapar(item.texto || "")}</small></span><em>${item.nivel === "erro" ? "ERRO" : item.nivel === "aviso" ? "ATENÇÃO" : "INFO"}</em></button>`).join("") : '<div class="vazio"><strong>Nenhum problema encontrado</strong><span>Tudo consistente nos arquivos do catálogo.</span></div>'}${p2.fotosVarridas || !conectado ? "" : '<p class="p2-nota">Verificando se os arquivos de foto existem...</p>'}</div>
        </article>
        <article class="p2-cartao"><div class="p2-cartao__topo"><div><strong>Situação</strong><span>Estoque, publicação e versão</span></div></div>
          <dl class="p2-situacao">
            <div><dt>Última atualização de estoque</dt><dd>${meta?.ultimaVerificacao ? `${dataCurta(meta.ultimaVerificacao)} <small>${tempoRelativo(meta.ultimaVerificacao)}</small>` : "Sem registro local"}</dd></div>
            <div><dt>Última publicação do site</dt><dd>${publicado ? `${dataCurta(publicado.data)} <small>${tempoRelativo(publicado.data)}</small>` : p2.github?.erro ? `<small>${escapar(p2.github.erro)}</small>` : "Consultando GitHub..."}</dd></div>
            <div><dt>Próxima publicação automática</dt><dd>${dataCurta(proximoHorario(CRON_PUBLICACAO_UTC))}</dd></div>
            <div><dt>Próxima sincronização de estoque</dt><dd>${dataCurta(proximoHorario(CRON_ESTOQUE_UTC))}</dd></div>
            <div><dt>Alterações pendentes</dt><dd>${pendentes ? `<span class="p2-pill p2-pill--amarela"><b>!</b>${plural(pendentes, "não salva", "não salvas")}</span>` : '<span class="p2-pill p2-pill--verde"><b>✓</b>tudo salvo</span>'}</dd></div>
            <div><dt>Versão</dt><dd>${htmlVersaoCurta()}</dd></div>
          </dl>
        </article>
      </div>`;
    p2.ultimosProblemas = lista;
  }

  function htmlVersaoCurta() {
    const local = p2.git?.sha ? p2.git.sha.slice(0, 7) : "—";
    const site = p2.github?.publicado?.sha ? p2.github.publicado.sha.slice(0, 7) : "—";
    if (!p2.git?.sha || !p2.github?.publicado) return `local ${local} · site ${site}`;
    const igual = p2.git.sha === p2.github.publicado.sha;
    return `local <code>${local}</code> · site <code>${site}</code> ${igual ? '<span class="p2-pill p2-pill--verde"><b>✓</b>publicado</span>' : '<span class="p2-pill p2-pill--amarela"><b>!</b>publicação pendente</span>'}`;
  }

  /* ---------- PRODUTOS ---------- */
  function produtoPassa(produto) {
    if (p2.filtroIds && !p2.filtroIds.has(produto.id)) return false;
    if (p2.filtroStatus !== "todos" && produto.status !== p2.filtroStatus) return false;
    if (p2.filtroMaterial !== "todos" && normalizar(produto.material) !== p2.filtroMaterial) return false;
    const termo = buscaNorm(p2.filtroTexto);
    if (!termo) return true;
    const texto = buscaNorm([produto.nome, produto.categoria, ...produto.cores.map((cor) => cor.nome)].join(" "));
    return termo.split(" ").every((token) => texto.includes(token));
  }

  function renderProdutos(m) {
    const alvo = $("#p2-produtos");
    const visiveis = m.filter(produtoPassa).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const materiais = [...new Set(m.map((produto) => produto.material).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const selecionados = p2.selecao.size;
    const focoId = document.activeElement?.id;
    alvo.innerHTML = `
      <div class="p2-cabecalho"><div><h2>Produtos</h2><p>Edite preço, fotos, cores e status sem abrir arquivos. Nada vai ao site antes de <strong>Salvar</strong> e publicar.</p></div>
        <div class="p2-acoes-rapidas"><button class="botao botao--primario" type="button" data-p2-rapida="produto">+ Adicionar produto</button><button class="botao botao--claro" type="button" data-p2-rapida="variacao">+ Adicionar variação</button></div></div>
      <div class="p2-ferramentas">
        <input class="campo" id="p2-filtro-texto" type="search" placeholder="Filtrar por nome, material ou cor..." value="${escapar(p2.filtroTexto)}">
        <select class="campo" id="p2-filtro-status"><option value="todos">Todos os status</option>${["ativo", "sem_estoque", "pausado", "rascunho"].map((s) => `<option value="${s}" ${p2.filtroStatus === s ? "selected" : ""}>${ROTULO_STATUS[s][0]}</option>`).join("")}</select>
        <select class="campo" id="p2-filtro-material"><option value="todos">Todos os materiais</option>${materiais.map((item) => `<option value="${escapar(normalizar(item))}" ${p2.filtroMaterial === normalizar(item) ? "selected" : ""}>${escapar(item)}</option>`).join("")}</select>
        ${p2.filtroIds ? `<button class="p2-chip" type="button" data-p2-acao="limpar-filtro-ids">${escapar(p2.filtroRotulo || "Filtro")} · ${p2.filtroIds.size} ✕</button>` : ""}
        <span class="p2-contagem">${plural(visiveis.length, "produto", "produtos")}</span>
      </div>
      <div class="p2-lote" ${selecionados ? "" : "hidden"}><strong>${plural(selecionados, "item selecionado", "itens selecionados")}</strong>
        <div><button class="botao botao--cinza botao--pequeno" type="button" data-p2-lote="pausar">Pausar</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-lote="reativar">Reativar</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-lote="familia">Família de cor</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-lote="acabamento">Acabamento</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-lote="categoria">Categoria</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-lote="preco">Preço</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="limpar-selecao">Limpar seleção</button></div></div>
      <div class="p2-lista">${visiveis.map((produto) => cartaoProduto(produto)).join("") || '<div class="vazio"><strong>Nenhum produto encontrado</strong><span>Ajuste a busca ou os filtros.</span></div>'}</div>`;
    aplicarFundos(alvo);
    if (focoId === "p2-filtro-texto") { const campo = $("#p2-filtro-texto"); campo.focus(); campo.setSelectionRange(campo.value.length, campo.value.length); }
  }

  function cartaoProduto(produto) {
    const aberto = p2.abertos.has(produto.id);
    const sel = p2.selecao.has(`p:${produto.id}`);
    const semFoto = produto.cores.filter((cor) => cor.semFoto).length;
    const visiveis = produto.cores.filter((cor) => cor.visivel).length;
    const motivo = ["pausado", "rascunho"].includes(produto.status) ? estado.detalhesProdutos[produto.id]?.motivo : "";
    return `<article class="p2-produto ${aberto ? "is-aberto" : ""} ${sel ? "is-sel" : ""}" data-p2-produto="${escapar(produto.id)}">
      <div class="p2-produto__linha">
        <input type="checkbox" data-p2-sel="p:${escapar(produto.id)}" ${sel ? "checked" : ""} aria-label="Selecionar ${escapar(produto.nome)}">
        <button class="p2-expandir" type="button" data-p2-acao="expandir" aria-expanded="${aberto}" aria-label="Mostrar variações">${aberto ? "▾" : "▸"}</button>
        ${thumb(produto.capa, produto.cores[0]?.raw.hex, "p2-thumb p2-thumb--grande")}
        <div class="p2-produto__nome"><strong>${escapar(produto.nome)}${produto.novo ? ' <span class="p2-pill p2-pill--azul">novo</span>' : ""}</strong><span>${escapar(produto.acessorio ? produto.categoria || "Acessório" : produto.material)} · ${visiveis}/${plural(produto.cores.length, "variação visível", "variações visíveis")}${semFoto ? ` · <em class="p2-alerta">${semFoto} sem foto</em>` : ""}${motivo ? ` · ${escapar(motivo)}` : ""}</span></div>
        ${pill(produto.status)}
        ${precoBotao(produto.preco, "preco")}
        <div class="p2-acoes-linha"><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="foto">Foto</button><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="nova-cor">+ Cor</button>${botoesStatusProduto(produto)}<button class="botao botao--primario botao--pequeno" type="button" data-p2-acao="editar">Editar</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="duplicar">Duplicar</button><a class="botao botao--cinza botao--pequeno" href="${escapar(linkCatalogo(produto.raw))}" target="_blank" rel="noopener" title="Abrir no catálogo">↗</a></div>
      </div>
      ${aberto ? `<div class="p2-variacoes">${tabelaVariacoes(produto)}</div>` : ""}
    </article>`;
  }

  /* ---------- EDITOR DE PRODUTO (drawer) ---------- */
  const ABAS_EDITOR = [["geral", "Informações gerais"], ["variacoes", "Variações"], ["preco", "Preço"], ["fotos", "Fotos"], ["olist", "Estoque/Olist"], ["seo", "SEO"], ["avancado", "Avançado"]];

  function abrirEditor(produtoId, aba = "geral") {
    p2.editor = { produtoId, aba };
    $("#p2-editor").hidden = false;
    document.body.classList.add("p2-travado");
    renderEditor(modelo());
  }

  function fecharEditor() {
    p2.editor = null;
    $("#p2-editor").hidden = true;
    document.body.classList.remove("p2-travado");
  }

  function renderEditor(m) {
    const produto = m.find((item) => item.id === p2.editor?.produtoId);
    if (!produto) { fecharEditor(); return; }
    const aba = p2.editor.aba;
    const raw = produto.raw;
    const corpo = {
      geral: () => `
        <div class="p2-form-grade">
          <label class="p2-campo"><span>Marca</span><input class="campo" value="${escapar(raw.marca)}" disabled></label>
          <label class="p2-campo"><span>Material</span><input class="campo" value="${escapar(raw.material)}" disabled></label>
          <label class="p2-campo"><span>Linha</span><input class="campo" value="${escapar(raw.linha || "")}" disabled></label>
          <p class="p2-nota p2-largo">Marca, material e linha formam o identificador (<code>${escapar(produto.id)}</code>) usado pelo estoque e pela Olist; por segurança não são editados aqui. Para uma linha nova, use <strong>Duplicar produto</strong>.</p>
          <label class="p2-campo p2-largo"><span>Observação (peso, diâmetro, detalhes)</span><input class="campo" data-p2-edit="obs" maxlength="140" value="${escapar(raw.obs || "")}" placeholder="Ex.: Rolo de 1kg • 1,75 mm"></label>
          <label class="p2-campo p2-largo"><span>Link da loja online</span><input class="campo" data-p2-edit="linkLoja" type="url" value="${escapar(raw.linkLoja || "")}"></label>
          ${produto.acessorio ? `<label class="p2-campo"><span>Categoria</span><input class="campo" data-p2-edit="categoria" maxlength="60" value="${escapar(raw.categoria || "")}"></label>` : ""}
        </div>
        <div class="p2-form-acoes"><button class="botao botao--primario" type="button" data-p2-acao="aplicar-geral">Aplicar alterações</button></div>
        <h4 class="p2-subtitulo">Status no site</h4>
        <div class="p2-status-escolha">${pill(produto.status)} ${botoesStatusProduto(produto)} ${produto.status !== "rascunho" ? '<button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="mover-rascunho">Mover para rascunho</button>' : ""}</div>
        <h4 class="p2-subtitulo">Prévia</h4>${previaProduto(produto)}`,
      variacoes: () => tabelaVariacoes(produto),
      preco: () => `<div class="p2-preco-destaque">${precoBotao(produto.preco, "preco")}<p>Preço base herdado pelas variações. ${produto.cores.filter((cor) => cor.precoProprio).length ? `${plural(produto.cores.filter((cor) => cor.precoProprio).length, "variação tem", "variações têm")} preço próprio.` : ""}</p></div>
        <div class="p2-tabela-wrap"><table class="p2-tabela"><thead><tr><th>Variação</th><th>Preço</th><th>Pix 5%</th><th>${PARCELAS}x sem juros</th></tr></thead><tbody>${produto.cores.map((cor) => { const r = resumoPreco(cor.preco); return `<tr data-p2-cor="${escapar(cor.id)}" data-p2-produto-da-cor="${escapar(produto.id)}"><td>${escapar(cor.nome)}</td><td>${precoBotao(cor.preco, "preco-cor", "", cor.temPreco ? (cor.precoProprio ? "preço próprio" : "igual à base (fixo)") : "herdado")}</td><td>${moeda(r.pix)}</td><td>${moeda(r.parcela)}</td></tr>`; }).join("")}</tbody></table></div>`,
      fotos: () => `<div class="p2-fotos-grade">${produto.cores.map((cor) => `<div class="p2-foto-cartao" data-p2-cor="${escapar(cor.id)}" data-p2-produto-da-cor="${escapar(produto.id)}">${thumb(cor.imagens[0], cor.raw.hex, "p2-thumb p2-thumb--foto")}<strong>${escapar(cor.nome)}</strong><span>${!cor.semFoto ? plural(cor.fotosReais.length, "foto", "fotos") : '<em class="p2-alerta">sem foto</em>'}${cor.faltandoConfirmada ? ' · <em class="p2-erro">arquivo inexistente</em>' : ""}</span><div><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="foto-cor">Gerenciar</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="substituir-foto">Substituir</button></div></div>`).join("")}</div>`,
      olist: () => tabelaOlistProduto(produto),
      seo: () => formularioSeo(produto, m),
      avancado: () => `<dl class="p2-situacao"><div><dt>Identificador do produto</dt><dd><code>${escapar(produto.id)}</code></dd></div><div><dt>Pasta de fotos</dt><dd><code>assets/fotos/${escapar(slugificar(produto.nome))}/</code></dd></div><div><dt>Chaves de estoque</dt><dd>${produto.cores.map((cor) => `<code>${escapar(cor.id)}</code>`).join(" ")}</dd></div></dl>
        <div class="p2-form-acoes"><button class="botao botao--claro" type="button" data-p2-acao="duplicar">Duplicar produto</button><button class="botao botao--cinza" type="button" data-p2-acao="ordenar-familia">Ordenar cores por família</button></div>
        <p class="p2-nota">Exclusão definitiva não é feita pelo painel: use <strong>Pausar</strong> (reversível). Se um produto precisar sair da base, peça a alteração no repositório para revisar estoque, Olist e fotos juntos.</p>`
    };
    $("#p2-editor-conteudo").innerHTML = `
      <div class="p2-editor__topo"><div>${thumb(produto.capa, produto.cores[0]?.raw.hex, "p2-thumb p2-thumb--grande")}<div><small>${escapar(produto.acessorio ? produto.categoria || "Acessório" : produto.material)}</small><h3>${escapar(produto.nome)}</h3>${pill(produto.status)}</div></div><button class="modal__fechar" type="button" data-p2-fechar="editor" aria-label="Fechar">×</button></div>
      <nav class="p2-editor__abas">${ABAS_EDITOR.map(([id, nome]) => `<button type="button" data-p2-editor-aba="${id}" class="${id === aba ? "ativo" : ""}">${nome}</button>`).join("")}</nav>
      <div class="p2-editor__corpo" data-p2-produto="${escapar(produto.id)}">${corpo[aba]()}</div>`;
    aplicarFundos($("#p2-editor-conteudo"));
  }

  function tabelaOlistProduto(produto) {
    return `<p class="p2-nota">Estoque é somente leitura: a fonte oficial é a Olist (sincronização automática). Vínculos só mudam com confirmação.</p><div class="p2-tabela-wrap"><table class="p2-tabela"><thead><tr><th>Variação</th><th>chaveEstoque</th><th>ID Olist</th><th>SKU</th><th>Estoque</th><th></th></tr></thead><tbody>${produto.cores.map((cor) => `<tr data-p2-cor="${escapar(cor.id)}" data-p2-produto-da-cor="${escapar(produto.id)}"><td>${escapar(cor.nome)}</td><td><code>${escapar(cor.id)}</code></td><td>${cor.olist ? `<code>${escapar(cor.olist.olistId)}</code>` : '<em class="p2-alerta">sem vínculo</em>'}</td><td>${escapar(cor.olist?.sku || "—")}</td><td>${rotuloEstoque(cor.estoque)}</td><td><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="olist">${cor.olist ? "Editar vínculo" : "Vincular"}</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function rotuloEstoque(estoque) {
    if (estoque === "em_estoque") return '<span class="p2-pill p2-pill--verde"><b>●</b>Em estoque</span>';
    if (estoque === "ultimas_unidades") return '<span class="p2-pill p2-pill--amarela"><b>◆</b>Últimas</span>';
    return '<span class="p2-pill p2-pill--cinza"><b>○</b>Sem estoque</span>';
  }

  function formularioSeo(produto, m) {
    const seo = statusSeo(produto, m);
    const auto = seoAutomatico(produto);
    const sugestao = seoSugestao(produto);
    return `<div class="p2-seo-status">${seo.avisos.length ? seo.avisos.map((aviso) => `<span class="p2-pill p2-pill--amarela"><b>!</b>${escapar(aviso)}</span>`).join("") : '<span class="p2-pill p2-pill--verde"><b>✓</b>SEO completo</span>'}${seo.infos.map((info) => `<span class="p2-pill p2-pill--cinza"><b>i</b>${escapar(info)}</span>`).join("")}</div>
      <label class="p2-campo p2-largo"><span>Título SEO <small data-p2-contador="seoTitulo">${seo.titulo.length}/65</small></span><input class="campo" data-p2-seo="seoTitulo" maxlength="120" value="${escapar(produto.raw.seoTitulo || "")}" placeholder="${escapar(auto.titulo)}"></label>
      <div class="p2-sugestao"><span>Sugestão: <strong>${escapar(sugestao.titulo)}</strong></span><button class="p2-link" type="button" data-p2-usar-sugestao="seoTitulo" data-valor="${escapar(sugestao.titulo)}">Usar</button></div>
      <label class="p2-campo p2-largo"><span>Description <small data-p2-contador="seoDescricao">${seo.descricao.length}/160</small></span><textarea class="campo" data-p2-seo="seoDescricao" maxlength="300" placeholder="${escapar(auto.descricao)}">${escapar(produto.raw.seoDescricao || "")}</textarea></label>
      <div class="p2-sugestao"><span>Sugestão: <strong>${escapar(sugestao.descricao)}</strong></span><button class="p2-link" type="button" data-p2-usar-sugestao="seoDescricao" data-valor="${escapar(sugestao.descricao)}">Usar</button></div>
      <dl class="p2-situacao"><div><dt>Endereço</dt><dd><code>${escapar(SITE)}/produto/${escapar(seo.slug)}/</code></dd></div><div><dt>ALT da foto principal</dt><dd>${escapar(seo.alt)} <small>(automático)</small></dd></div></dl>
      <p class="p2-nota">Campos vazios usam o texto automático (mostrado em cinza), gerado com os dados reais na publicação.</p>
      <div class="p2-form-acoes"><button class="botao botao--cinza" type="button" data-p2-acao="seo-automatico">Voltar ao automático</button><button class="botao botao--primario" type="button" data-p2-acao="aplicar-seo">Aplicar SEO</button></div>`;
  }

  /* ---------- PRÉVIA (card + drawer com o CSS real do site) ---------- */
  function coresOrdenadasSite(cores, manual) {
    if (manual) return cores;
    return cores.map((cor, indice) => ({ cor, indice, rank: rankCor(cor.raw || cor) }))
      .sort((a, b) => a.rank - b.rank || String(a.cor.nome).localeCompare(String(b.cor.nome), "pt-BR") || a.indice - b.indice)
      .map((item) => item.cor);
  }

  function documentoPrevia({ titulo, kicker, badge, cores, indice = 0, obs = "", manual = false }) {
    const lista = coresOrdenadasSite(cores, manual);
    const ativa = cores[indice] || cores[0];
    if (!ativa) return "";
    const r = resumoPreco(ativa.preco);
    const img = (src) => (src ? `<img src="${escapar(src)}" alt="">` : "");
    const minis = lista.slice(0, 4).map((cor) => `<button type="button" class="variant-mini ${cor === ativa ? "is-active" : ""}">${img(cor.src)}</button>`).join("") + (lista.length > 4 ? `<a class="more-variants">+${lista.length - 4}</a>` : "");
    const card = `<article class="product-card"><div class="card-media"><span class="product-badge">${escapar(badge)}</span>${img(ativa.src)}<span class="card-open-plus"><svg viewBox="0 0 24 24" fill="none"><path d="M12 6v12M6 12h12"></path></svg></span></div><div class="card-body"><p class="product-kicker">${escapar(kicker)}</p><h3 class="product-title"><a>${escapar(titulo)}</a></h3><p class="variant-summary"><span>${escapar(ativa.nome)}</span>${cores.length > 1 ? `<small>${cores.length} cores</small>` : ""}</p><div class="card-variants">${cores.length > 1 ? minis : ""}</div><div class="card-price-row"><span class="price">${moeda(r.normal)}</span><span class="card-pix"><span>${moeda(r.pix)} no Pix</span><em>5% OFF</em></span><span class="card-installments">ou ${PARCELAS}x de ${moeda(r.parcela)} sem juros no cartão</span><span class="stock stock--ok">Em estoque</span></div><a class="primary-button card-cta">${cores.length > 1 ? "Ver cores" : "Ver produto"}</a></div></article>`;
    const drawer = `<section class="pv-drawer"><div class="modal-media pv-media">${img(ativa.src)}</div><div class="modal-info"><p class="product-kicker">${escapar(kicker)}</p><h2>${escapar(titulo)}</h2><p class="modal-variant-name">${escapar(ativa.nome)}</p><div class="price-block"><strong class="price-main">${moeda(r.normal)}</strong><span class="price-pix">${moeda(r.pix)} no Pix <em>5% OFF</em></span><span class="price-installments">ou ${PARCELAS}x de ${moeda(r.parcela)} sem juros no cartão</span></div>${obs ? `<p class="modal-obs">${escapar(obs)}</p>` : ""}<div class="variant-heading"><h3>Escolha a cor</h3><small>${cores.length} cores</small></div><div class="variant-grid">${lista.map((cor) => `<button class="variant-choice ${cor === ativa ? "is-active" : ""}" type="button"><span class="variant-choice-image">${img(cor.src)}</span><span class="variant-choice-name">${escapar(cor.nome)}</span></button>`).join("")}</div></div></section>`;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="../style.css"><style>body{margin:0;padding:14px;background:#DAE3EA;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}.product-card{width:236px;flex:none}.pv-drawer{width:360px;background:#F3F6F9;border-radius:16px;overflow:hidden;border:1px solid rgba(24,42,60,.12)}.pv-media{position:relative;height:220px;display:flex;align-items:center;justify-content:center;background:#E0E7ED}.pv-media img{max-height:200px;max-width:90%;object-fit:contain}.pv-drawer .modal-info{padding:14px 16px 18px}.pv-drawer .variant-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.variant-choice-image img{width:100%;height:100%;object-fit:cover}a{cursor:default}</style></head><body>${card}${drawer}</body></html>`;
  }

  function iframePrevia(doc) {
    if (!doc) return '<div class="vazio"><strong>Sem variações para mostrar</strong></div>';
    return `<iframe class="p2-previa" title="Prévia do card e do drawer" srcdoc="${escapar(doc)}"></iframe>`;
  }

  function previaProduto(produto) {
    const cores = produto.cores.map((cor) => ({ nome: cor.nome, preco: cor.preco, src: cor.imagens[0] ? P.urlFoto(cor.imagens[0]) : "", raw: cor.raw }));
    return iframePrevia(documentoPrevia({ titulo: produto.nomeInterface, kicker: produto.acessorio ? produto.categoria || "Acessório" : produto.raw.marca, badge: produto.acessorio ? "ACESSÓRIO" : produto.material, cores, obs: produto.raw.obs || "", manual: produto.raw.ordemCores === "manual" }));
  }

  let timerPreviaCadastro = null;
  function previaCadastro() {
    clearTimeout(timerPreviaCadastro);
    timerPreviaCadastro = setTimeout(() => {
      const alvo = $("#cadastro-previa");
      if (!alvo || !estado.cadastro) return;
      const contexto = P.contextoCadastro() || {};
      const cadastro = estado.cadastro;
      const existente = cadastro.modo === "cores" ? P.produtoRawPorId(estado.baseAtualRaw, cadastro.produtoExistenteId) : null;
      const precoBase = Number(contexto.preco) || 0;
      const coresNovas = cadastro.variantes.map((variante) => ({
        nome: variante.nome || "Nova cor",
        preco: variante.precoModo === "especifico" && P.precoEntrada(variante.preco) ? P.precoEntrada(variante.preco) : precoBase,
        src: variante.arquivos?.[0] ? urlArquivo(variante.arquivos[0]) : "",
        raw: { nome: variante.nome, familiaCor: variante.familiaCor, efeito: variante.efeito }
      }));
      const coresExistentes = existente ? existente.cores.map((cor) => ({ nome: cor.nome, preco: vazio(cor.preco) ? precoBase : Number(cor.preco), src: P.imagensRaw(cor)[0] ? P.urlFoto(P.imagensRaw(cor)[0]) : "", raw: cor })) : [];
      const acessorio = existente ? secaoRaw(existente) === "acessorios" : contexto.acessorio;
      const titulo = existente ? nomeInterface(existente) : [contexto.marca, contexto.material, contexto.linha].filter(Boolean).join(" ") || "Novo produto";
      const doc = documentoPrevia({ titulo, kicker: acessorio ? (existente?.categoria || contexto.categoria || "Acessório") : (contexto.marca || "Marca"), badge: acessorio ? "ACESSÓRIO" : (contexto.material || "PLA"), cores: [...coresNovas, ...coresExistentes], obs: contexto.obs || "", manual: existente?.ordemCores === "manual" });
      alvo.innerHTML = iframePrevia(doc);
    }, 250);
  }

  /* ---------- ESTOQUE / OLIST ---------- */
  function renderOlist(m) {
    const chaves = estado.baseAtualRaw.flatMap((produto) => (produto.cores || []).map((cor) => String(cor.chaveEstoque || "")));
    const itens = estado.mapeamentoAtualRaw?.itens || [];
    const ids = itens.map((item) => Number(item.olistId));
    const skus = itens.map((item) => String(item.sku || "").trim());
    const chavesBase = new Set(chaves);
    const linhas = m.flatMap((produto) => produto.cores.map((cor) => {
      const problemasCor = [];
      if (!cor.olist) problemasCor.push(["erro", ["ativa", "ultimas", "sem_estoque"].includes(cor.status) ? "Sem vínculo (bloqueia salvar)" : "Sem vínculo (pausada)"]);
      if (chaves.filter((chave) => chave === cor.id).length > 1) problemasCor.push(["erro", "chaveEstoque duplicada"]);
      if (cor.olist && ids.filter((id) => id === Number(cor.olist.olistId)).length > 1) problemasCor.push(["erro", "ID Olist duplicado"]);
      if (cor.olist?.sku && skus.filter((sku) => sku === String(cor.olist.sku).trim()).length > 1) problemasCor.push(["aviso", "SKU repetido"]);
      if (cor.raw.sku && cor.olist?.sku && String(cor.raw.sku) !== String(cor.olist.sku)) problemasCor.push(["aviso", "SKU diferente da base"]);
      return { produto, cor, problemas: problemasCor };
    }));
    const orfaos = itens.filter((item) => !chavesBase.has(String(item.chave || "")));
    const filtro = p2.olistFiltro;
    const filtradas = linhas.filter(({ cor, problemas: lista }) => {
      if (filtro === "problemas") return lista.length > 0;
      if (filtro === "sem-vinculo") return !cor.olist;
      if (filtro === "sem-estoque") return cor.estoque === "sem_estoque";
      return true;
    });
    const meta = p2.meta;
    $("#p2-olist").innerHTML = `
      <div class="p2-cabecalho"><div><h2>Estoque e Olist</h2><p><strong>Fonte do estoque: Olist.</strong> O saldo é somente leitura aqui — a sincronização automática sobrescreveria qualquer edição manual.</p></div>
        <div class="p2-acoes-rapidas"><a class="botao botao--primario" href="${URL_WORKFLOW_ESTOQUE}" target="_blank" rel="noopener" title="Abre o GitHub Actions: clique em Run workflow">Sincronizar estoque agora</a><button class="botao botao--claro" type="button" data-p2-acao="consultar-github">Atualizar status</button></div></div>
      <div class="p2-faixa">
        <div><small>Última sincronização</small><strong>${meta?.ultimaVerificacao ? dataCurta(meta.ultimaVerificacao) : "—"}</strong><span>${meta ? `${meta.coresDisponiveis ?? "?"} disponíveis · ${meta.consultasRealizadas ?? "?"} consultas${meta.limiteApiAtingido ? " · limite da API atingido" : ""}` : "arquivo dados/ultima-atualizacao.json não encontrado"}</span></div>
        <div><small>Execução no GitHub</small><strong>${p2.github?.estoque ? (p2.github.estoque.status !== "completed" ? "Executando..." : p2.github.estoque.conclusion === "success" ? "Concluído" : "Erro") : "—"}</strong><span>${p2.github?.estoque ? `${dataCurta(p2.github.estoque.updated_at)} · ${escapar(p2.github.estoque.event)}` : escapar(p2.github?.erro || "consultando...")}</span></div>
        <div><small>Próxima automática</small><strong>${dataCurta(proximoHorario(CRON_ESTOQUE_UTC))}</strong><span>08h, 15h e 18h (Brasília)</span></div>
        <div><small>Vínculos</small><strong>${itens.length}</strong><span>${orfaos.length ? `${orfaos.length} órfão(s)` : "nenhum órfão"}</span></div>
      </div>
      <p class="p2-nota">“Sincronizar estoque agora” abre o workflow oficial no GitHub (botão <em>Run workflow</em>). Para consultar só algumas cores, informe os IDs Olist no campo <em>ids_olist</em>. O painel não guarda tokens da Olist nem do GitHub.</p>
      <div class="p2-ferramentas"><div class="segmentado">${[["problemas", "Com problema"], ["sem-vinculo", "Sem vínculo"], ["sem-estoque", "Sem estoque"], ["todas", "Todas"]].map(([id, nome]) => `<button type="button" data-p2-olist-filtro="${id}" class="${filtro === id ? "ativo" : ""}">${nome}</button>`).join("")}</div><span class="p2-contagem">${plural(filtradas.length, "variação", "variações")}</span></div>
      ${orfaos.length ? `<div class="p2-aviso-bloco"><strong>Vínculos apontando para variação inexistente:</strong> ${orfaos.map((item) => `<code>${escapar(item.chave)}</code> (ID ${escapar(item.olistId)})`).join(" • ")}</div>` : ""}
      <div class="p2-tabela-wrap"><table class="p2-tabela"><thead><tr><th>Produto</th><th>Variação</th><th>SKU</th><th>chaveEstoque</th><th>ID Olist</th><th>Estoque</th><th>Vínculo</th><th></th></tr></thead><tbody>
      ${filtradas.map(({ produto, cor, problemas: lista }) => `<tr data-p2-cor="${escapar(cor.id)}" data-p2-produto-da-cor="${escapar(produto.id)}"><td>${escapar(produto.nome)}</td><td>${escapar(cor.nome)} ${cor.status !== "ativa" ? pill(cor.status) : ""}</td><td>${escapar(cor.olist?.sku || cor.raw.sku || "—")}</td><td><code>${escapar(cor.id)}</code></td><td>${cor.olist ? `<code>${escapar(cor.olist.olistId)}</code>` : "—"}</td><td>${rotuloEstoque(cor.estoque)}</td><td>${lista.length ? lista.map(([nivel, texto]) => `<span class="p2-pill p2-pill--${nivel === "erro" ? "vermelha" : "amarela"}"><b>!</b>${escapar(texto)}</span>`).join(" ") : '<span class="p2-pill p2-pill--verde"><b>✓</b>OK</span>'}</td><td><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="olist">${cor.olist ? "Editar" : "Vincular"}</button></td></tr>`).join("") || '<tr><td colspan="8"><div class="vazio"><strong>Nada por aqui</strong><span>Nenhuma variação neste filtro.</span></div></td></tr>'}
      </tbody></table></div>`;
  }

  /* ---------- IMAGENS ---------- */
  function renderImagens(m) {
    const cores = m.flatMap((produto) => produto.cores.map((cor) => ({ produto, cor })));
    const uso = new Map();
    cores.forEach(({ cor }) => cor.imagens.forEach((caminho) => uso.set(caminho, (uso.get(caminho) || 0) + 1)));
    const statusFoto = (cor) => {
      if (cor.faltandoConfirmada) return ["inexistentes", "Arquivo inexistente", "vermelha"];
      if (cor.semFoto) return ["sem-foto", cor.imagens.length ? "Aguardando arquivo" : "Sem foto", "amarela"];
      if (cor.imagens.some((caminho) => estado.arquivosFotosPendentes.has(caminho))) return ["novas", "Nova (não salva)", "azul"];
      if (cor.imagens.some((caminho) => uso.get(caminho) > 1)) return ["duplicadas", "Foto repetida", "amarela"];
      return ["ok", "OK", "verde"];
    };
    const referenciadas = new Set(uso.keys());
    const orfas = p2.arquivosFotos ? [...p2.arquivosFotos].filter((caminho) => !referenciadas.has(caminho) && /\.(webp|jpe?g|png|avif)$/i.test(caminho)).sort() : [];
    const filtro = p2.imagensFiltro;
    const lista = cores.filter(({ cor }) => {
      const [id] = statusFoto(cor);
      if (filtro === "todas") return true;
      if (filtro === "problemas") return id !== "ok";
      return id === filtro;
    });
    const contagem = (id) => cores.filter(({ cor }) => statusFoto(cor)[0] === id).length;
    $("#p2-imagens").innerHTML = `
      <div class="p2-cabecalho"><div><h2>Imagens</h2><p>Gerencie arquivos e referências. O painel converte para WebP e nomeia automaticamente; não altera cor nem recorta a foto. Remover uma referência não apaga o arquivo.</p></div><div class="p2-acoes-rapidas"><button class="botao botao--claro" type="button" data-p2-acao="varrer-fotos">${p2.varrendoFotos ? "Verificando..." : "Verificar arquivos"}</button></div></div>
      <div class="p2-ferramentas"><div class="segmentado">${[["problemas", `Com problema (${cores.length - contagem("ok")})`], ["sem-foto", `Sem foto (${contagem("sem-foto")})`], ["inexistentes", `Inexistentes (${contagem("inexistentes")})`], ["duplicadas", `Repetidas (${contagem("duplicadas")})`], ["novas", `Novas (${contagem("novas")})`], ["orfas", `Sem uso (${orfas.length})`], ["todas", "Todas"]].map(([id, nome]) => `<button type="button" data-p2-imagens-filtro="${id}" class="${filtro === id ? "ativo" : ""}">${nome}</button>`).join("")}</div>${p2.fotosVarridas ? "" : '<span class="p2-nota">verificando arquivos...</span>'}</div>
      ${filtro === "orfas" ? `<div class="p2-tabela-wrap"><table class="p2-tabela"><thead><tr><th></th><th>Arquivo em assets/fotos sem nenhuma variação apontando</th></tr></thead><tbody>${orfas.map((caminho) => `<tr><td>${thumb(caminho)}</td><td><code>${escapar(caminho)}</code></td></tr>`).join("") || '<tr><td colspan="2"><div class="vazio"><strong>Nenhum arquivo sem uso</strong></div></td></tr>'}</tbody></table></div><p class="p2-nota">Para usar um desses arquivos, abra a variação em <em>Gerenciar</em> e adicione a imagem. Arquivos sem uso não são publicados como produto e podem ser apagados manualmente se não forem necessários.</p>`
      : `<div class="p2-fotos-grade">${lista.map(({ produto, cor }) => { const [, rotulo, classe] = statusFoto(cor); return `<div class="p2-foto-cartao" data-p2-cor="${escapar(cor.id)}" data-p2-produto-da-cor="${escapar(produto.id)}">${thumb(cor.imagens[0], cor.raw.hex, "p2-thumb p2-thumb--foto")}<strong>${escapar(cor.nome)}</strong><span>${escapar(produto.nome)}</span><span class="p2-pill p2-pill--${classe}"><b>${classe === "verde" ? "✓" : "!"}</b>${rotulo}</span><code title="${escapar(cor.imagens.join("\n"))}">${escapar(cor.imagens[0] || "—")}${cor.imagens.length > 1 ? ` +${cor.imagens.length - 1}` : ""}</code><div><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="foto-cor">Gerenciar</button><button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="substituir-foto">Substituir</button></div></div>`; }).join("") || '<div class="vazio"><strong>Nenhuma imagem neste filtro</strong></div>'}</div>`}`;
    aplicarFundos($("#p2-imagens"));
  }

  /* ---------- SEO ---------- */
  function renderSeo(m) {
    const linhas = m.map((produto) => ({ produto, seo: statusSeo(produto, m) }));
    const filtradas = p2.seoFiltro === "problemas" ? linhas.filter(({ seo }) => seo.avisos.length) : linhas;
    $("#p2-seo").innerHTML = `
      <div class="p2-cabecalho"><div><h2>SEO</h2><p>Título e description são gerados automaticamente com os dados reais de cada produto. Personalize só quando precisar.</p></div></div>
      <div class="p2-ferramentas"><div class="segmentado"><button type="button" data-p2-seo-filtro="problemas" class="${p2.seoFiltro === "problemas" ? "ativo" : ""}">Com pendência (${linhas.filter(({ seo }) => seo.avisos.length).length})</button><button type="button" data-p2-seo-filtro="todos" class="${p2.seoFiltro === "todos" ? "ativo" : ""}">Todos (${linhas.length})</button></div></div>
      <div class="p2-tabela-wrap"><table class="p2-tabela"><thead><tr><th>Produto</th><th>Título SEO</th><th>Description</th><th>Slug</th><th>Status</th><th></th></tr></thead><tbody>
      ${filtradas.map(({ produto, seo }) => `<tr data-p2-produto-linha="${escapar(produto.id)}"><td><strong>${escapar(produto.nome)}</strong>${seo.personalizado ? '<br><small class="p2-pill p2-pill--azul">personalizado</small>' : ""}</td><td>${escapar(truncar(seo.titulo, 70))} <small>(${seo.titulo.length})</small></td><td>${escapar(truncar(seo.descricao, 90))} <small>(${seo.descricao.length})</small></td><td><code>${escapar(seo.slug)}</code></td><td>${seo.avisos.length ? seo.avisos.map((aviso) => `<span class="p2-pill p2-pill--amarela"><b>!</b>${escapar(aviso)}</span>`).join(" ") : '<span class="p2-pill p2-pill--verde"><b>✓</b>SEO completo</span>'} ${seo.infos.map((info) => `<span class="p2-pill p2-pill--cinza"><b>i</b>${escapar(info)}</span>`).join(" ")}</td><td><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="editar-seo">Editar</button></td></tr>`).join("") || '<tr><td colspan="6"><div class="vazio"><strong>SEO completo em todos os produtos</strong></div></td></tr>'}
      </tbody></table></div>`;
  }

  /* ---------- PUBLICAÇÃO ---------- */
  function renderPublicacao() {
    const alteracoes = diferencas();
    const contar = (fn) => alteracoes.filter(fn).length;
    const categorias = [
      ["Novos produtos", contar((i) => i.tipo === "cadastro-produto")],
      ["Novas variações", alteracoes.filter((i) => i.tipo === "cadastro-cores").reduce((n, i) => n + (i.quantidade || 0), 0)],
      ["Preços alterados", contar((i) => i.tipo === "preco" || i.tipo === "extra-herdar" || (i.tipo === "extra-cor" && i.campo === "preco"))],
      ["Fotos alteradas", contar((i) => i.tipo === "foto")],
      ["Pausas", contar((i) => (i.tipo === "produto" || i.tipo === "cor") && i.acao === "pausar")],
      ["Reativações", contar((i) => (i.tipo === "produto" || i.tipo === "cor") && i.acao === "ativar")],
      ["Família / acabamento / ordem", contar((i) => (i.tipo === "extra-cor" && i.campo !== "preco") || i.tipo === "extra-ordem" || (i.tipo === "extra-produto" && i.campo === "ordemCores"))],
      ["SEO e informações gerais", contar((i) => i.tipo === "extra-produto" && i.campo !== "ordemCores")],
      ["Vínculos Olist", contar((i) => i.tipo === "extra-olist")],
      ["Rascunhos", contar((i) => i.tipo === "extra-rascunho")]
    ].filter(([, n]) => n);
    const git = p2.git;
    const gh = p2.github;
    const publicadoSha = gh?.publicado?.sha;
    const pendentePublicacao = git?.sha && publicadoSha && git.sha !== publicadoSha;
    const naoEnviado = git?.sha && git.origem && git.sha !== git.origem;
    const salvasDepoisDoCommit = git?.ultimoCommit ? estado.historico.filter((item) => new Date(item.data) > git.ultimoCommit).length : 0;
    const historico = [...estado.historico].slice(-40).reverse();
    let statusGeral;
    if (alteracoes.length) statusGeral = ["amarela", `${plural(alteracoes.length, "alteração não salva", "alterações não salvas")}`];
    else if (salvasDepoisDoCommit) statusGeral = ["amarela", "Salvo no computador — falta Commit e Push"];
    else if (naoEnviado) statusGeral = ["amarela", "Commit local ainda não enviado (Push)"];
    else if (pendentePublicacao) statusGeral = ["amarela", gh?.andamento ? "Publicação em andamento" : "1 publicação pendente"];
    else if (git?.sha && publicadoSha) statusGeral = ["verde", "Site atualizado com a versão local"];
    else statusGeral = ["cinza", "Consultando versões..."];
    $("#p2-publicacao").innerHTML = `
      <div class="p2-cabecalho"><div><h2>Publicação</h2><p>Fluxo oficial: <strong>Salvar</strong> no painel → <strong>Commit e Push</strong> no GitHub Desktop → o GitHub publica sozinho (workflow “Publicar catálogo rápido”).</p></div>
        <div class="p2-acoes-rapidas"><button class="botao botao--claro" type="button" data-p2-acao="previsualizar">Pré-visualizar alterações</button><button class="botao botao--primario" type="button" data-p2-rapida="publicar">Publicar agora</button></div></div>
      <div class="p2-status-geral p2-status-geral--${statusGeral[0]}"><b>${statusGeral[0] === "verde" ? "✓" : "!"}</b><strong>${escapar(statusGeral[1])}</strong>${p2.acompanhamento ? "<span>acompanhando o GitHub a cada 45 s…</span>" : ""}</div>
      <div class="p2-faixa">
        <div><small>Dados locais</small><strong>${git?.sha ? `<code>${git.sha.slice(0, 7)}</code>` : "—"}</strong><span>${git?.erro ? escapar(git.erro) : git?.ultimoCommit ? `último commit ${dataCurta(git.ultimoCommit)}` : ""}${naoEnviado ? " · <em class=\"p2-alerta\">diferente do GitHub</em>" : ""}</span></div>
        <div><small>GitHub (main)</small><strong>${gh?.mainSha ? `<code>${gh.mainSha.slice(0, 7)}</code>` : "—"}</strong><span>${gh?.mainData ? `${dataCurta(gh.mainData)} · ${escapar(truncar(gh.mainMensagem, 40))}` : escapar(gh?.erro || "consultando...")}</span></div>
        <div><small>Site publicado</small><strong>${publicadoSha ? `<code>${publicadoSha.slice(0, 7)}</code>` : "—"}</strong><span>${gh?.publicado ? `${dataCurta(gh.publicado.data)} ${tempoRelativo(gh.publicado.data)}` : ""}${gh?.andamento ? " · <em>publicando agora</em>" : ""}${gh?.ultima?.conclusion === "failure" ? ' · <em class="p2-erro">última execução falhou</em>' : ""}</span></div>
        <div><small>Próxima publicação automática</small><strong>${dataCurta(proximoHorario(CRON_PUBLICACAO_UTC))}</strong><span>09h, 14h e 21h (Brasília) · republica o que já está no GitHub</span></div>
      </div>
      <div class="p2-grade">
        <article class="p2-cartao"><div class="p2-cartao__topo"><div><strong>Alterações pendentes</strong><span>Ainda não gravadas nos arquivos</span></div><button class="botao botao--primario botao--pequeno" type="button" data-p2-acao="salvar" ${alteracoes.length ? "" : "disabled"}>Salvar alterações</button></div>
          ${categorias.length ? `<ul class="p2-resumo-lista">${categorias.map(([nome, n]) => `<li><strong>${n}</strong>${escapar(nome)}</li>`).join("")}</ul><div class="alteracoes-lista p2-alteracoes">${$("#lista-alteracoes")?.innerHTML || ""}</div>` : '<div class="vazio"><strong>Nenhuma alteração pendente</strong><span>Tudo o que foi feito já está salvo nos arquivos.</span></div>'}
        </article>
        <article class="p2-cartao"><div class="p2-cartao__topo"><div><strong>Como publicar</strong><span>Sem processo paralelo</span></div></div>
          <ol class="p2-passos"><li><b>1</b><span><strong>Salvar alterações</strong> no painel (grava base, controle, mapeamento e fotos).</span></li><li><b>2</b><span>No <strong>GitHub Desktop</strong>: confira os arquivos, faça <strong>Commit</strong> e <strong>Push origin</strong>.</span></li><li><b>3</b><span>O workflow <strong>Publicar catálogo rápido</strong> roda sozinho e atualiza o site em ~2 min.</span></li></ol>
          <div class="p2-form-acoes"><a class="botao botao--claro botao--pequeno" href="x-github-client://openRepo/https://github.com/${REPO}">Abrir GitHub Desktop</a><button class="botao botao--claro botao--pequeno" type="button" data-p2-acao="acompanhar">Acompanhar publicação</button><a class="botao botao--cinza botao--pequeno" href="${URL_WORKFLOW_PUBLICAR}" target="_blank" rel="noopener" title="Republica o que já está no GitHub, sem alterações novas">Republicar sem alterações</a></div>
          <p class="p2-nota">A publicação automática agendada continua ativa. O painel não guarda tokens: ele só consulta o status público do GitHub.</p>
        </article>
      </div>
      <article class="p2-cartao"><div class="p2-cartao__topo"><div><strong>Histórico do painel</strong><span>Últimas alterações salvas neste navegador · desfazer cria uma alteração pendente</span></div><button class="botao botao--cinza botao--pequeno" type="button" data-p2-acao="limpar-historico">Limpar histórico</button></div>
        <div class="p2-historico">${historico.map((item) => { const desfazer = podeDesfazerHistorico(item); return `<div class="p2-historico__item"><time>${escapar(dataCurta(item.data))}</time><div><strong>${escapar(item.resumo || item.nome || "Alteração")}</strong><span>${escapar(item.operador || "")}${item.motivo ? ` · ${escapar(item.motivo)}` : ""}${item.tipo === "preco" && item.antes != null ? ` · ${moeda(item.antes)} → ${moeda(item.depois)}` : ""}</span></div>${desfazer ? `<button class="botao botao--cinza botao--pequeno" type="button" data-p2-desfazer-historico="${escapar(item.id)}">Desfazer</button>` : ""}</div>`; }).join("") || '<div class="vazio"><strong>Histórico vazio</strong><span>As próximas alterações salvas aparecem aqui.</span></div>'}</div>
      </article>`;
  }

  function podeDesfazerHistorico(item) {
    if (!estado.carregado) return false;
    if (item.tipo === "preco") {
      const produto = P.produtoRawPorId(estado.baseAtualRaw, item.itemId);
      return produto && item.antes != null && Math.abs(Number(produto.preco) - Number(item.depois)) < 0.001;
    }
    if (item.tipo === "produto" || item.tipo === "cor") {
      const pausado = item.tipo === "produto" ? estado.produtosPausados.has(item.itemId) : estado.coresPausadas.has(item.itemId);
      return item.acao === "pausar" ? pausado : !pausado;
    }
    if (item.tipo === "extra-cor" && ["preco", "familiaCor", "efeito"].includes(item.campo)) {
      const produto = P.produtoRawPorId(estado.baseAtualRaw, item.produtoId);
      const cor = P.corRawPorId(produto, item.itemId?.split("¦")[2]);
      return cor && iguais(cor[item.campo], item.depois);
    }
    if (item.tipo === "extra-produto" && ["categoria", "seoTitulo", "seoDescricao", "obs"].includes(item.campo)) {
      const produto = P.produtoRawPorId(estado.baseAtualRaw, item.produtoId);
      return produto && iguais(produto[item.campo], item.depois);
    }
    return false;
  }

  function desfazerHistorico(id) {
    const item = estado.historico.find((registro) => registro.id === id);
    if (!item || !podeDesfazerHistorico(item)) { mostrarToast("Não é possível desfazer", "O item já foi alterado de novo depois deste registro."); return; }
    if (item.tipo === "preco") P.aplicarPreco(item.itemId, String(item.antes));
    else if (item.tipo === "produto" || item.tipo === "cor") {
      if (item.acao === "pausar") ativarItem(item.tipo, item.itemId);
      else {
        (item.tipo === "produto" ? estado.produtosPausados : estado.coresPausadas).add(item.itemId);
        (item.tipo === "produto" ? estado.detalhesProdutos : estado.detalhesCores)[item.itemId] = { motivo: item.motivo || "Outro", observacao: "Desfeito pelo histórico", pausadoEm: new Date().toISOString(), pausadoPor: operadorAtual() };
        registrarSessao(item.tipo, item.itemId, "pausar", { motivo: "Desfeito pelo histórico" });
        limparSessaoSeIgualOriginal(item.tipo, item.itemId);
        atualizarTudo();
      }
    } else if (item.tipo === "extra-cor") definirCampoCor(item.produtoId, item.itemId.split("¦")[2], item.campo, item.antes);
    else if (item.tipo === "extra-produto") definirCampoProduto(item.produtoId, item.campo, item.antes);
    P.reconstruir();
    mostrarToast("Desfazer preparado", "Revise e clique em Salvar alterações.");
  }

  /* ---------------- MODAIS ---------------- */
  const MODAIS_HTML = `
  <div class="p2-busca" id="p2-busca" hidden><div class="p2-busca__caixa" role="dialog" aria-modal="true" aria-label="Busca universal">
    <div class="p2-busca__campo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg><input id="p2-busca-campo" type="search" autocomplete="off" placeholder="Nome, marca, material, cor, SKU, chaveEstoque ou ID Olist..."><kbd>Esc</kbd></div>
    <div class="p2-busca__modo" id="p2-busca-modo"></div>
    <div class="p2-busca__resultados" id="p2-busca-resultados"></div></div></div>

  <div class="p2-drawer" id="p2-editor" hidden><aside class="p2-drawer__painel" role="dialog" aria-modal="true" aria-label="Editar produto" id="p2-editor-conteudo"></aside></div>

  <div class="modal" id="p2-modal-preco" hidden><div class="modal__caixa"><div class="modal__topo"><div class="modal__icone">R$</div><button class="modal__fechar" type="button" data-p2-fechar="p2-modal-preco">×</button></div><div id="p2-preco-conteudo"></div></div></div>

  <div class="modal" id="p2-modal-variacao" hidden><div class="modal__caixa modal__caixa--grande"><div class="modal__topo"><div class="modal__icone">+</div><button class="modal__fechar" type="button" data-p2-fechar="p2-modal-variacao">×</button></div><div id="p2-variacao-conteudo"></div></div></div>

  <div class="modal" id="p2-modal-olist" hidden><div class="modal__caixa"><div class="modal__topo"><div class="modal__icone">ID</div><button class="modal__fechar" type="button" data-p2-fechar="p2-modal-olist">×</button></div><div id="p2-olist-conteudo"></div></div></div>

  <div class="modal" id="p2-modal-lote" hidden><div class="modal__caixa modal__caixa--grande"><div class="modal__topo"><div class="modal__icone">▦</div><button class="modal__fechar" type="button" data-p2-fechar="p2-modal-lote">×</button></div><div id="p2-lote-conteudo"></div></div></div>
  <input type="file" id="p2-seletor-substituir" accept="image/jpeg,image/png,image/webp,image/avif" hidden>`;

  function abrirModal(id) { $(`#${id}`).hidden = false; setTimeout(() => $(`#${id} input:not([type=hidden]):not([disabled]), #${id} select`)?.focus(), 30); }
  function fecharModalP2(id) {
    if (id === "editor") { fecharEditor(); return; }
    const el = $(`#${id}`);
    if (el) el.hidden = true;
    if (id === "p2-busca") document.body.classList.remove("p2-travado");
  }

  /* ---------- PREÇO (produto ou variação) ---------- */
  function abrirPreco(produtoId, corId = null) {
    const produto = modelo().find((item) => item.id === produtoId);
    if (!produto) return;
    const cor = corId ? produto.cores.find((item) => item.id === corId) : null;
    p2.modalPreco = { produtoId, corId };
    const atual = cor ? cor.preco : produto.preco;
    const fixasIguais = produto.cores.filter((item) => item.temPreco && !item.precoProprio).length;
    const proprias = produto.cores.filter((item) => item.precoProprio).length;
    $("#p2-preco-conteudo").innerHTML = `
      <h2>${cor ? "Preço da variação" : "Preço base"}</h2><p>${escapar(produto.nome)}${cor ? ` — <strong>${escapar(cor.nome)}</strong>` : ""}</p>
      ${cor ? `<div class="segmentado p2-largo" id="p2-preco-modo"><button type="button" data-modo="herdar" class="${cor.temPreco ? "" : "ativo"}">Herdar preço base (${moeda(produto.preco)})</button><button type="button" data-modo="especifico" class="${cor.temPreco ? "ativo" : ""}">Preço específico</button></div>` : ""}
      <div class="p2-preco-editor"><label class="p2-campo"><span>Preço atual</span><strong>${moeda(atual)}</strong></label><label class="p2-campo"><span>Novo preço</span><input class="campo" id="p2-preco-novo" inputmode="decimal" value="${escapar(Number(atual).toLocaleString("pt-BR", { minimumFractionDigits: 2 }))}" ${cor && !cor.temPreco ? "disabled" : ""}></label></div>
      <div class="p2-preco-simulacao" id="p2-preco-simulacao"></div>
      ${!cor && fixasIguais ? `<label class="p2-check"><input type="checkbox" id="p2-preco-seguir" checked><span><strong>${plural(fixasIguais, "variação tem", "variações têm")} o preço antigo gravado</strong> e não mudariam sozinhas. Marcado: passam a herdar o novo preço base.</span></label>` : ""}
      ${!cor && proprias ? `<p class="p2-nota">${plural(proprias, "variação mantém", "variações mantêm")} preço próprio diferente (não muda).</p>` : ""}
      <div class="modal__acoes"><button class="botao botao--cinza" type="button" data-p2-fechar="p2-modal-preco">Cancelar</button><button class="botao botao--primario" type="button" id="p2-preco-aplicar" data-p2-principal>Aplicar preço</button></div>`;
    atualizarSimulacaoPreco();
    abrirModal("p2-modal-preco");
    setTimeout(() => $("#p2-preco-novo")?.select(), 40);
  }

  function atualizarSimulacaoPreco() {
    const { produtoId, corId } = p2.modalPreco || {};
    const produto = P.produtoRawPorId(estado.baseAtualRaw, produtoId);
    const herdar = corId && $("#p2-preco-modo .ativo")?.dataset.modo === "herdar";
    const campo = $("#p2-preco-novo");
    if (campo) campo.disabled = Boolean(herdar);
    const valor = herdar ? Number(produto?.preco) : P.precoEntrada(campo?.value);
    const alvo = $("#p2-preco-simulacao");
    if (!alvo) return;
    if (!valor) { alvo.innerHTML = '<div class="p2-aviso-bloco">Digite um valor maior que zero. Ex.: 105,00</div>'; return; }
    const r = resumoPreco(valor);
    alvo.innerHTML = `<div><small>Preço normal</small><strong>${moeda(r.normal)}</strong></div><div class="p2-verde"><small>Pix 5%</small><strong>${moeda(r.pix)}</strong></div><div><small>${PARCELAS}x sem juros</small><strong>${moeda(r.parcela)}</strong></div>`;
  }

  function aplicarPrecoModal() {
    const { produtoId, corId } = p2.modalPreco || {};
    const produto = P.produtoRawPorId(estado.baseAtualRaw, produtoId);
    if (!produto) return;
    if (corId) {
      const herdar = $("#p2-preco-modo .ativo")?.dataset.modo === "herdar";
      const valor = herdar ? null : P.precoEntrada($("#p2-preco-novo").value);
      if (!herdar && valor === null) { mostrarToast("Preço inválido", "Digite um valor maior que zero."); return; }
      definirCampoCor(produtoId, corId, "preco", herdar ? null : valor);
      P.reconstruir();
      mostrarToast("Preço preparado", herdar ? "A variação volta a herdar o preço base." : `Variação por ${moeda(valor)} após salvar.`);
    } else {
      const valor = P.precoEntrada($("#p2-preco-novo").value);
      if (valor === null) { mostrarToast("Preço inválido", "Digite um valor maior que zero."); return; }
      const antigo = Number(produto.preco) || 0;
      const seguir = $("#p2-preco-seguir")?.checked;
      if (seguir) (produto.cores || []).forEach((cor) => { if (!vazio(cor.preco) && Math.abs(Number(cor.preco) - antigo) < 0.001) definirCampoCor(produtoId, obterIdCor(produtoId, cor), "preco", null); });
      P.aplicarPreco(produtoId, String(valor));
    }
    fecharModalP2("p2-modal-preco");
  }

  /* ---------- NOVA / DUPLICAR VARIAÇÃO ---------- */
  function abrirNovaVariacao(produtoId = "", base = null) {
    const m = modelo();
    p2.modalVariacao = { produtoId, arquivos: [], base };
    const produtoAtual = m.find((item) => item.id === produtoId);
    const familia = base?.familiaCor || "";
    $("#p2-variacao-conteudo").innerHTML = `
      <h2>${base ? "Duplicar variação" : "Nova variação"}</h2><p>${base ? `Copia família, acabamento, cor visual e preço de <strong>${escapar(base.nome)}</strong>. SKU, GTIN e ID Olist <strong>não</strong> são copiados.` : "Herda marca, material, pasta de fotos e preço base do produto."}</p>
      <div class="p2-form-grade">
        <label class="p2-campo p2-largo"><span>Produto *</span><select class="campo" id="p2-var-produto"><option value="">Selecione...</option>${m.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((item) => `<option value="${escapar(item.id)}" ${item.id === produtoId ? "selected" : ""}>${escapar(item.nome)} · ${plural(item.cores.length, "variação", "variações")}</option>`).join("")}</select></label>
        <label class="p2-campo"><span>Nome da cor / opção *</span><input class="campo" id="p2-var-nome" maxlength="100" placeholder="Ex.: Azul Ártico" value=""></label>
        <label class="p2-campo"><span>Família de cor</span><select class="campo" id="p2-var-familia">${opcoesFamilia(familia, "")}</select></label>
        <label class="p2-campo"><span>Acabamento</span><select class="campo" id="p2-var-efeito">${opcoesAcabamento(base?.efeito || "")}</select></label>
        <label class="p2-campo"><span>Cor visual (amostra)</span><div class="cadastro-cor-linha"><input type="color" id="p2-var-hex-cor" value="${escapar(base?.hex || "#D9DFE8")}"><input class="campo" id="p2-var-hex" maxlength="7" value="${escapar(base?.hex || "#D9DFE8")}"></div></label>
        <div class="p2-campo p2-largo"><span>Preço</span><div class="segmentado" id="p2-var-preco-modo"><button type="button" data-modo="herdar" class="${base && !vazio(base.preco) ? "" : "ativo"}">Herdar preço base <b id="p2-var-preco-base">${produtoAtual ? moeda(produtoAtual.preco) : ""}</b></button><button type="button" data-modo="especifico" class="${base && !vazio(base.preco) ? "ativo" : ""}">Preço específico</button></div><input class="campo" id="p2-var-preco" inputmode="decimal" placeholder="R$" value="${base && !vazio(base.preco) ? escapar(String(base.preco).replace(".", ",")) : ""}" ${base && !vazio(base.preco) ? "" : "hidden"}></div>
        <label class="p2-campo"><span>ID Olist <small>(vazio = fica pausada até vincular)</small></span><input class="campo" id="p2-var-olist" inputmode="numeric" placeholder="Ex.: 1048182488"></label>
        <label class="p2-campo"><span>SKU <small>(opcional)</small></span><input class="campo" id="p2-var-sku" maxlength="100"></label>
        <label class="p2-campo"><span>GTIN / EAN <small>(opcional)</small></span><input class="campo" id="p2-var-gtin" maxlength="30"></label>
        <label class="p2-campo"><span>Situação</span><select class="campo" id="p2-var-situacao"><option value="ativa">Ativa (aparece quando houver estoque)</option><option value="pausada">Pausada até revisão</option></select></label>
        <div class="p2-campo p2-largo"><span>Fotos <small>(a primeira é a principal; convertidas para WebP)</small></span><div class="variante-fotos" id="p2-var-fotos"><button class="botao botao--claro botao--pequeno" type="button" id="p2-var-add-foto">+ Selecionar fotos</button></div><input type="file" id="p2-var-arquivos" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden></div>
      </div>
      <div class="cadastro-status" id="p2-var-validacao"></div>
      <div class="modal__acoes"><button class="botao botao--cinza" type="button" data-p2-fechar="p2-modal-variacao">Cancelar</button><button class="botao botao--primario" type="button" id="p2-var-salvar" data-p2-principal>Adicionar variação</button></div>`;
    abrirModal("p2-modal-variacao");
    setTimeout(() => $(produtoId ? "#p2-var-nome" : "#p2-var-produto")?.focus(), 40);
    validarNovaVariacao();
  }

  function dadosNovaVariacao() {
    const produtoId = $("#p2-var-produto").value;
    const especifico = $("#p2-var-preco-modo .ativo")?.dataset.modo === "especifico";
    return {
      produtoId, produto: P.produtoRawPorId(estado.baseAtualRaw, produtoId),
      nome: $("#p2-var-nome").value.trim(), familiaCor: $("#p2-var-familia").value, efeito: $("#p2-var-efeito").value,
      hex: $("#p2-var-hex").value.trim().toUpperCase(), especifico, preco: especifico ? P.precoEntrada($("#p2-var-preco").value) : null,
      olistTexto: $("#p2-var-olist").value.trim(), sku: $("#p2-var-sku").value.trim(), gtin: $("#p2-var-gtin").value.trim(),
      situacao: $("#p2-var-situacao").value
    };
  }

  function validarNovaVariacao() {
    const alvo = $("#p2-var-validacao");
    if (!alvo) return { erros: ["Formulário indisponível"], avisos: [] };
    const d = dadosNovaVariacao();
    const erros = [];
    const avisos = [];
    if (!d.produto) erros.push("Selecione o produto.");
    if (!d.nome) erros.push("Informe o nome da variação.");
    const slug = slugificar(d.nome);
    if (d.nome && !slug) erros.push("O nome não gera um identificador válido.");
    if (d.produto && slug && (d.produto.cores || []).some((cor) => slugificar(cor.nome) === slug)) erros.push(`Já existe “${d.nome}” neste produto.`);
    const chave = d.produto && slug ? P.chaveCor(obterIdProduto(d.produto), d.nome) : "";
    const itens = estado.mapeamentoAtualRaw?.itens || [];
    if (chave && (itens.some((item) => item.chave === chave) || estado.baseAtualRaw.some((produto) => (produto.cores || []).some((cor) => cor.chaveEstoque === chave)))) erros.push(`A chave ${chave} já existe.`);
    if (!/^#[0-9A-F]{6}$/i.test(d.hex)) erros.push("Cor visual precisa estar no formato #RRGGBB.");
    if (d.especifico && d.preco === null) erros.push("Informe um preço específico válido ou use Herdar.");
    const olistId = Number(d.olistTexto);
    if (d.olistTexto && (!Number.isInteger(olistId) || olistId <= 0)) erros.push("O ID Olist precisa ser um número inteiro.");
    if (d.olistTexto && itens.some((item) => Number(item.olistId) === olistId)) erros.push(`O ID Olist ${olistId} já está ligado a outra variação.`);
    if (d.sku && itens.some((item) => String(item.sku || "").trim() === d.sku)) avisos.push(`O SKU ${d.sku} já existe em outra variação.`);
    if (!d.olistTexto) avisos.push("Sem ID Olist: a variação será salva pausada (“Aguardando vínculo Olist”).");
    if (!p2.modalVariacao?.arquivos.length) avisos.push("Sem foto: aparecerá com a amostra de cor até receber foto.");
    alvo.innerHTML = [...erros.map((texto) => `<div class="cadastro-status__item cadastro-status__item--erro"><b>!</b><span>${escapar(texto)}</span></div>`), ...avisos.map((texto) => `<div class="cadastro-status__item cadastro-status__item--aviso"><b>i</b><span>${escapar(texto)}</span></div>`)].join("") || '<div class="cadastro-status__item cadastro-status__item--ok"><b>✓</b><span>Pronto para adicionar.</span></div>';
    $("#p2-var-salvar").disabled = erros.length > 0;
    if (d.produto) $("#p2-var-preco-base").textContent = moeda(d.produto.preco);
    return { erros, avisos, dados: d, chave };
  }

  function renderFotosNovaVariacao() {
    const alvo = $("#p2-var-fotos");
    const arquivos = p2.modalVariacao?.arquivos || [];
    alvo.innerHTML = `<button class="botao botao--claro botao--pequeno" type="button" id="p2-var-add-foto">+ Selecionar fotos</button>${arquivos.map((arquivo, i) => `<div class="variante-foto"><img src="${escapar(urlArquivo(arquivo))}" alt=""><button data-p2-remover-foto-var="${i}" type="button" aria-label="Remover foto">×</button></div>`).join("")}`;
  }

  async function salvarNovaVariacao() {
    const { erros, dados: d, chave } = validarNovaVariacao();
    if (erros.length) { mostrarToast("Revise a variação", erros[0]); return; }
    if (!operadorAtual()) { abrirModalOperador(salvarNovaVariacao); return; }
    const botao = $("#p2-var-salvar");
    botao.disabled = true;
    botao.textContent = "Preparando...";
    const produtoId = obterIdProduto(d.produto);
    const nomeProduto = P.nomeProduto(d.produto);
    const imagens = [];
    try {
      for (const arquivo of p2.modalVariacao.arquivos) {
        const blob = await P.converterWebp(arquivo);
        const caminho = await P.proximoCaminhoFoto({ nome: nomeProduto }, { nome: d.nome });
        estado.arquivosFotosPendentes.set(caminho, blob);
        imagens.push(caminho);
      }
      const corBase = { nome: d.nome, hex: d.hex, hexFonte: imagens.length ? "foto" : "manual", fotoStatus: imagens.length ? "confirmada" : "ausente", imagens, chaveEstoque: chave };
      if (d.familiaCor) corBase.familiaCor = d.familiaCor;
      if (d.efeito) corBase.efeito = d.efeito;
      if (d.especifico && d.preco) corBase.preco = d.preco;
      if (p2.modalVariacao.base?.gradiente) corBase.gradiente = p2.modalVariacao.base.gradiente;
      const corPublica = structuredClone(corBase);
      delete corPublica.chaveEstoque;
      Object.assign(corPublica, { idCatalogo: chave, statusEstoque: "sem_estoque", disponivel: false });
      d.produto.cores.push(corBase);
      P.produtoRawPorId(estado.publicoAtualRaw, produtoId)?.cores.push(corPublica);
      if (d.olistTexto) {
        estado.mapeamentoAtualRaw.itens.push({ chave, marca: d.produto.marca, material: d.produto.material, linha: d.produto.linha || "", cor: d.nome, olistId: Number(d.olistTexto), sku: d.sku || null, gtin: d.gtin || null, descricaoOlist: `${nomeProduto} - ${d.nome}` });
        estado.mapeamentoAtualRaw.total = estado.mapeamentoAtualRaw.itens.length;
      }
      if (!d.olistTexto || d.situacao === "pausada") {
        const motivo = d.olistTexto ? "Revisando cadastro" : "Aguardando vínculo Olist";
        estado.coresPausadas.add(chave);
        estado.detalhesCores[chave] = { motivo, observacao: `Cadastrada por ${operadorAtual()}`, pausadoEm: new Date().toISOString(), pausadoPor: operadorAtual() };
        registrarSessao("cor", chave, "pausar", { motivo });
      }
      p2.abertos.add(produtoId);
      fecharModalP2("p2-modal-variacao");
      P.reconstruir();
      varrerFotosDepois();
      mostrarToast("Variação preparada", `${d.nome} entra em ${nomeProduto} após Salvar alterações.`);
    } catch (erro) {
      imagens.forEach((caminho) => estado.arquivosFotosPendentes.delete(caminho));
      mostrarToast("Não foi possível adicionar", erro.message);
    } finally {
      botao.textContent = "Adicionar variação";
      botao.disabled = false;
    }
  }

  /* ---------- DUPLICAR PRODUTO (usa o cadastro guiado) ---------- */
  function duplicarProduto(produtoId) {
    const raw = P.produtoRawPorId(estado.baseAtualRaw, produtoId);
    if (!raw) return;
    if (P.diferencasCadastro().length === 0 && estado.cadastro?.variantes?.some((v) => v.nome) && !confirmar("O formulário de cadastro tem um rascunho. Substituir pelo produto duplicado?")) return;
    const acessorio = secaoRaw(raw) === "acessorios";
    const precoBase = Number(raw.preco) || 0;
    estado.cadastro = {
      ...P.cadastroVazio(),
      modo: "novo", tipo: acessorio ? "acessorio" : "filamento", marca: raw.marca || "", material: raw.material || "",
      linha: raw.linha ? `${raw.linha} (nova linha)` : "Nova linha", preco: String(precoBase).replace(".", ","),
      peso: "", diametro: "", categoria: raw.categoria || "", linkLoja: raw.linkLoja || "https://3zkfilamentos.com.br/", obs: raw.obs || "", status: "rascunho",
      variantes: (raw.cores || []).map((cor) => P.novaVariante({ nome: cor.nome, hex: cor.hex, efeito: cor.efeito, familiaCor: cor.familiaCor, precoModo: !vazio(cor.preco) && Math.abs(Number(cor.preco) - precoBase) > 0.001 ? "especifico" : "herdar", preco: !vazio(cor.preco) ? String(cor.preco).replace(".", ",") : "" }))
    };
    P.salvarRascunhoCadastro();
    fecharEditor();
    abrirAba("cadastro");
    P.renderizarCadastro();
    mostrarToast("Produto duplicado no formulário", "Ajuste a linha/nome. SKU, GTIN, ID Olist e fotos NÃO foram copiados.");
    setTimeout(() => $("#cadastro-linha")?.focus(), 120);
  }

  /* ---------- VÍNCULO OLIST (crítico) ---------- */
  function abrirOlist(produtoId, corId) {
    const produto = modelo().find((item) => item.id === produtoId);
    const cor = produto?.cores.find((item) => item.id === corId);
    if (!cor) return;
    p2.modalOlist = { produtoId, corId };
    const atual = cor.olist;
    $("#p2-olist-conteudo").innerHTML = `
      <h2>${atual ? "Editar vínculo Olist" : "Vincular à Olist"}</h2><p>${escapar(produto.nome)} — <strong>${escapar(cor.nome)}</strong></p>
      <dl class="p2-situacao"><div><dt>chaveEstoque</dt><dd><code>${escapar(corId)}</code> <small>(não muda)</small></dd></div>${atual ? `<div><dt>Vínculo atual</dt><dd>ID <code>${escapar(atual.olistId)}</code> · SKU ${escapar(atual.sku || "—")} · GTIN ${escapar(atual.gtin || "—")}</dd></div>` : ""}</dl>
      <div class="p2-form-grade"><label class="p2-campo"><span>ID Olist *</span><input class="campo" id="p2-olist-id" inputmode="numeric" value="${escapar(atual?.olistId || "")}"></label><label class="p2-campo"><span>SKU</span><input class="campo" id="p2-olist-sku" value="${escapar(atual?.sku || "")}"></label><label class="p2-campo"><span>GTIN</span><input class="campo" id="p2-olist-gtin" value="${escapar(atual?.gtin || "")}"></label><label class="p2-campo p2-largo"><span>Descrição na Olist</span><input class="campo" id="p2-olist-desc" value="${escapar(atual?.descricaoOlist || `${produto.nome} - ${cor.nome}`)}"></label></div>
      ${atual ? '<label class="p2-campo p2-largo p2-critico"><span>Alteração crítica: o estoque desta variação passará a vir de outro item da Olist. Digite <strong>ALTERAR</strong> para confirmar.</span><input class="campo" id="p2-olist-confirmacao" autocomplete="off"></label>' : ""}
      ${cor.pausada && estado.detalhesCores[corId]?.motivo === "Aguardando vínculo Olist" ? '<label class="p2-check"><input type="checkbox" id="p2-olist-reativar" checked><span>Reativar a variação depois de vincular.</span></label>' : ""}
      <div class="cadastro-status" id="p2-olist-validacao"></div>
      <div class="modal__acoes"><button class="botao botao--cinza" type="button" data-p2-fechar="p2-modal-olist">Cancelar</button><button class="botao botao--primario" type="button" id="p2-olist-salvar" data-p2-principal>${atual ? "Confirmar alteração" : "Vincular"}</button></div>`;
    abrirModal("p2-modal-olist");
    validarOlist();
  }

  function validarOlist() {
    const { corId } = p2.modalOlist || {};
    const itens = estado.mapeamentoAtualRaw?.itens || [];
    const atual = itens.find((item) => item.chave === corId);
    const id = Number($("#p2-olist-id").value.trim());
    const sku = $("#p2-olist-sku").value.trim();
    const erros = [];
    const avisos = [];
    if (!Number.isInteger(id) || id <= 0) erros.push("Informe um ID Olist numérico.");
    if (itens.some((item) => item.chave !== corId && Number(item.olistId) === id)) erros.push(`O ID ${id} já está ligado a outra variação.`);
    if (sku && itens.some((item) => item.chave !== corId && String(item.sku || "").trim() === sku)) avisos.push(`O SKU ${sku} já existe em outra variação.`);
    const mudouId = atual && Number(atual.olistId) !== id;
    if (atual && mudouId && $("#p2-olist-confirmacao")?.value.trim().toUpperCase() !== "ALTERAR") erros.push("Digite ALTERAR para confirmar a troca do ID.");
    if (atual && !mudouId && sku === String(atual.sku || "") && $("#p2-olist-gtin").value.trim() === String(atual.gtin || "") && $("#p2-olist-desc").value.trim() === String(atual.descricaoOlist || "")) avisos.push("Nada foi alterado.");
    $("#p2-olist-validacao").innerHTML = [...erros.map((texto) => `<div class="cadastro-status__item cadastro-status__item--erro"><b>!</b><span>${escapar(texto)}</span></div>`), ...avisos.map((texto) => `<div class="cadastro-status__item cadastro-status__item--aviso"><b>i</b><span>${escapar(texto)}</span></div>`)].join("");
    $("#p2-olist-salvar").disabled = erros.length > 0;
    return erros;
  }

  function salvarOlist() {
    if (validarOlist().length) return;
    const { produtoId, corId } = p2.modalOlist;
    const produto = P.produtoRawPorId(estado.baseAtualRaw, produtoId);
    const cor = P.corRawPorId(produto, corId);
    const itens = estado.mapeamentoAtualRaw.itens;
    const novo = { chave: corId, marca: produto.marca, material: produto.material, linha: produto.linha || "", cor: cor.nome, olistId: Number($("#p2-olist-id").value.trim()), sku: $("#p2-olist-sku").value.trim() || null, gtin: $("#p2-olist-gtin").value.trim() || null, descricaoOlist: $("#p2-olist-desc").value.trim() || `${P.nomeProduto(produto)} - ${cor.nome}` };
    const indice = itens.findIndex((item) => item.chave === corId);
    if (indice >= 0) itens[indice] = { ...itens[indice], ...novo }; else itens.push(novo);
    estado.mapeamentoAtualRaw.total = itens.length;
    if ($("#p2-olist-reativar")?.checked) ativarItem("cor", corId);
    fecharModalP2("p2-modal-olist");
    P.reconstruir();
    mostrarToast("Vínculo preparado", "Salve as alterações; o estoque é consultado na próxima sincronização.");
  }

  /* ---------- EDIÇÃO EM MASSA ---------- */
  function alvosSelecionados() {
    const m = modelo();
    const produtos = [];
    const cores = [];
    p2.selecao.forEach((chave) => {
      if (chave.startsWith("p:")) { const produto = m.find((item) => item.id === chave.slice(2)); if (produto) produtos.push(produto); }
      else if (chave.startsWith("c:")) {
        const [produtoId, corId] = chave.slice(2).split("::");
        const produto = m.find((item) => item.id === produtoId);
        const cor = produto?.cores.find((item) => item.id === corId);
        if (cor) cores.push({ produto, cor });
      }
    });
    const coresDosProdutos = produtos.flatMap((produto) => produto.cores.map((cor) => ({ produto, cor })));
    const todasCores = [...cores, ...coresDosProdutos.filter(({ cor }) => !cores.some((item) => item.cor.id === cor.id))];
    return { produtos, cores, todasCores };
  }

  function abrirLote(operacao) {
    const alvos = alvosSelecionados();
    if (!alvos.produtos.length && !alvos.cores.length) return;
    if (operacao === "pausar") {
      const lista = [...alvos.produtos.filter((p) => !estado.produtosPausados.has(p.id)).map((p) => ({ tipo: "produto", id: p.id, nome: p.nome })), ...alvos.cores.filter(({ cor }) => !cor.pausada).map(({ produto, cor }) => ({ tipo: "cor", id: cor.id, nome: `${produto.nome} — ${cor.nome}` }))];
      if (lista.length) abrirModalPausa(lista); else mostrarToast("Nada para pausar", "Os itens selecionados já estão pausados.");
      return;
    }
    if (operacao === "reativar") {
      const produtos = alvos.produtos.filter((p) => estado.produtosPausados.has(p.id));
      const cores = alvos.cores.filter(({ cor }) => cor.pausada);
      if (!produtos.length && !cores.length) { mostrarToast("Nada para reativar", "Os itens selecionados já estão ativos."); return; }
      if (!confirmar(`Reativar ${plural(produtos.length + cores.length, "item", "itens")}? Eles voltam ao site quando houver estoque.`)) return;
      produtos.forEach((p) => reativarProduto(p.id, false));
      cores.forEach(({ cor }) => ativarItem("cor", cor.id));
      p2.selecao.clear();
      P.reconstruir();
      return;
    }
    p2.modalLote = { operacao };
    const titulos = { familia: "Família de cor", acabamento: "Acabamento", categoria: "Categoria", preco: "Preço" };
    let campos = "";
    if (operacao === "familia") campos = `<label class="p2-campo"><span>Nova família</span><select class="campo" id="p2-lote-valor">${opcoesFamilia("", "")}</select></label>`;
    if (operacao === "acabamento") campos = `<label class="p2-campo"><span>Novo acabamento</span><select class="campo" id="p2-lote-valor">${opcoesAcabamento("")}</select></label>`;
    if (operacao === "categoria") campos = `<label class="p2-campo"><span>Nova categoria</span><input class="campo" id="p2-lote-valor" list="categorias-cadastro" maxlength="60"></label>`;
    if (operacao === "preco") campos = `<label class="p2-campo"><span>Operação</span><select class="campo" id="p2-lote-operacao"><option value="definir">Definir R$</option><option value="somar">+ R$</option><option value="subtrair">− R$</option><option value="mais-pct">+ %</option><option value="menos-pct">− %</option></select></label><label class="p2-campo"><span>Valor</span><input class="campo" id="p2-lote-valor" inputmode="decimal" placeholder="Ex.: 5"></label>`;
    $("#p2-lote-conteudo").innerHTML = `<h2>Editar em massa: ${titulos[operacao]}</h2><p>${operacao === "categoria" ? plural(alvos.produtos.length, "produto selecionado", "produtos selecionados") : operacao === "preco" ? `${plural(alvos.produtos.length, "produto", "produtos")} (preço base) e ${plural(alvos.cores.length, "variação", "variações")} (preço próprio)` : plural(alvos.todasCores.length, "variação afetada", "variações afetadas")}. SKU, chaveEstoque, ID Olist e idCatalogo nunca são alterados em massa.</p><div class="p2-form-grade">${campos}</div><h4 class="p2-subtitulo">Prévia</h4><div class="p2-tabela-wrap p2-lote-previa" id="p2-lote-previa"></div><div class="modal__acoes"><button class="botao botao--cinza" type="button" data-p2-fechar="p2-modal-lote">Cancelar</button><button class="botao botao--primario" type="button" id="p2-lote-aplicar" data-p2-principal>Aplicar</button></div>`;
    abrirModal("p2-modal-lote");
    previaLote();
  }

  function calcularLote() {
    const { operacao } = p2.modalLote || {};
    const alvos = alvosSelecionados();
    const valorTexto = $("#p2-lote-valor")?.value ?? "";
    const mudancas = [];
    if (operacao === "familia" || operacao === "acabamento") {
      const campo = operacao === "familia" ? "familiaCor" : "efeito";
      alvos.todasCores.forEach(({ produto, cor }) => {
        const antes = cor.raw[campo] || "";
        if (antes !== valorTexto) mudancas.push({ nome: `${produto.nome} — ${cor.nome}`, antes: valorLegivel(campo, antes), depois: valorLegivel(campo, valorTexto), aplicar: () => definirCampoCor(produto.id, cor.id, campo, valorTexto || null) });
      });
    }
    if (operacao === "categoria") {
      alvos.produtos.forEach((produto) => {
        if ((produto.raw.categoria || "") !== valorTexto.trim()) mudancas.push({ nome: produto.nome, antes: produto.raw.categoria || "—", depois: valorTexto.trim() || "—", aplicar: () => definirCampoProduto(produto.id, "categoria", valorTexto.trim() || null) });
      });
    }
    if (operacao === "preco") {
      const op = $("#p2-lote-operacao")?.value || "definir";
      const valor = Number(String(valorTexto).replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(valor) || valor <= 0) return { mudancas, erro: "Informe um valor maior que zero." };
      const calcular = (atual) => centavos(op === "definir" ? valor : op === "somar" ? atual + valor : op === "subtrair" ? atual - valor : op === "mais-pct" ? atual * (1 + valor / 100) : atual * (1 - valor / 100));
      for (const produto of alvos.produtos) {
        const novo = calcular(produto.preco);
        if (!(novo > 0)) return { mudancas, erro: `${produto.nome} ficaria com preço inválido.` };
        if (Math.abs(novo - produto.preco) > 0.001) mudancas.push({ nome: `${produto.nome} (base)`, antes: moeda(produto.preco), depois: moeda(novo), novo, aplicar: () => {
          const antigo = produto.preco;
          (produto.raw.cores || []).forEach((cor) => { if (!vazio(cor.preco) && Math.abs(Number(cor.preco) - antigo) < 0.001) definirCampoCor(produto.id, obterIdCor(produto.id, cor), "preco", null); });
          P.definirPrecoRaw(produto.id, novo);
        } });
      }
      for (const { produto, cor } of alvos.cores) {
        const novo = calcular(cor.preco);
        if (!(novo > 0)) return { mudancas, erro: `${cor.nome} ficaria com preço inválido.` };
        if (Math.abs(novo - cor.preco) > 0.001) mudancas.push({ nome: `${produto.nome} — ${cor.nome}`, antes: moeda(cor.preco), depois: moeda(novo), novo, aplicar: () => definirCampoCor(produto.id, cor.id, "preco", Math.abs(novo - produto.preco) < 0.001 ? null : novo) });
      }
    }
    return { mudancas };
  }

  function previaLote() {
    const { mudancas, erro } = calcularLote();
    const alvo = $("#p2-lote-previa");
    const preco = p2.modalLote?.operacao === "preco";
    alvo.innerHTML = erro ? `<div class="p2-aviso-bloco">${escapar(erro)}</div>` : mudancas.length ? `<table class="p2-tabela"><thead><tr><th>Item</th><th>Antes</th><th>Depois</th>${preco ? "<th>Pix 5%</th><th>3x</th>" : ""}</tr></thead><tbody>${mudancas.slice(0, 200).map((item) => `<tr><td>${escapar(item.nome)}</td><td>${escapar(item.antes)}</td><td><strong>${escapar(item.depois)}</strong></td>${preco ? `<td>${moeda(resumoPreco(item.novo).pix)}</td><td>${moeda(resumoPreco(item.novo).parcela)}</td>` : ""}</tr>`).join("")}</tbody></table>` : '<div class="vazio"><strong>Nenhuma mudança</strong><span>Os itens já têm esse valor.</span></div>';
    $("#p2-lote-aplicar").disabled = Boolean(erro) || !mudancas.length;
    $("#p2-lote-aplicar").textContent = mudancas.length ? `Aplicar em ${plural(mudancas.length, "item", "itens")}` : "Aplicar";
  }

  function aplicarLote() {
    const { mudancas, erro } = calcularLote();
    if (erro || !mudancas.length) return;
    mudancas.forEach((item) => item.aplicar());
    fecharModalP2("p2-modal-lote");
    p2.selecao.clear();
    P.reconstruir();
    mostrarToast("Edição em massa preparada", `${plural(mudancas.length, "item alterado", "itens alterados")}. Revise e salve.`);
  }

  /* ---------- STATUS: pausar / reativar / rascunho ---------- */
  function reativarProduto(produtoId, confirmarAntes = true) {
    const produto = modelo().find((item) => item.id === produtoId);
    if (!produto) return;
    const rascunho = produto.status === "rascunho";
    const semVinculo = produto.cores.filter((cor) => !cor.olist && !cor.pausada);
    if (confirmarAntes && !confirmar(`${rascunho ? "Publicar o rascunho" : "Reativar"} ${produto.nome}?\n\nEle aparece no site quando a Olist informar estoque.${semVinculo.length ? `\n\n${plural(semVinculo.length, "variação sem vínculo Olist continuará", "variações sem vínculo Olist continuarão")} pausada(s) até ser vinculada(s).` : ""}`)) return;
    semVinculo.forEach((cor) => {
      estado.coresPausadas.add(cor.id);
      estado.detalhesCores[cor.id] = { motivo: "Aguardando vínculo Olist", observacao: "", pausadoEm: new Date().toISOString(), pausadoPor: operadorAtual() };
      registrarSessao("cor", cor.id, "pausar", { motivo: "Aguardando vínculo Olist" });
      limparSessaoSeIgualOriginal("cor", cor.id);
    });
    marcarRascunho(produtoId, false);
    ativarItem("produto", produtoId);
  }

  function moverParaRascunho(produtoId) {
    if (!confirmar("Mover para rascunho? O produto sai do site até ser publicado de novo pelo painel.")) return;
    marcarRascunho(produtoId, true);
    if (!estado.produtosPausados.has(produtoId)) {
      estado.produtosPausados.add(produtoId);
      estado.detalhesProdutos[produtoId] = { motivo: "Revisando cadastro", observacao: "Movido para rascunho", pausadoEm: new Date().toISOString(), pausadoPor: operadorAtual() };
      registrarSessao("produto", produtoId, "pausar", { motivo: "Revisando cadastro" });
      limparSessaoSeIgualOriginal("produto", produtoId);
    }
    P.reconstruir();
  }

  /* ---------- FOTOS: substituir e arrastar no gerenciador ---------- */
  function substituirFoto(produtoId, corId) {
    p2.substituir = { produtoId, corId };
    const seletor = $("#p2-seletor-substituir");
    seletor.value = "";
    seletor.click();
  }

  async function aplicarSubstituicao(arquivo) {
    const { produtoId, corId } = p2.substituir || {};
    const produto = P.produtoRawPorId(estado.baseAtualRaw, produtoId);
    const cor = P.corRawPorId(produto, corId);
    if (!cor || !arquivo) return;
    try {
      const blob = await P.converterWebp(arquivo);
      const caminho = await P.proximoCaminhoFoto({ nome: P.nomeProduto(produto) }, { nome: cor.nome });
      estado.arquivosFotosPendentes.set(caminho, blob);
      const antigas = P.imagensRaw(cor);
      P.definirImagensRaw(produtoId, corId, [caminho, ...antigas.slice(1)]);
      P.reconstruir();
      varrerFotosDepois();
      mostrarToast("Foto substituída", `Nova foto principal preparada. O arquivo antigo (${antigas[0] || "nenhum"}) não é apagado.`);
    } catch (erro) {
      mostrarToast("Não foi possível usar a imagem", erro.message);
    }
  }

  let timerVarredura = null;
  function varrerFotosDepois() { clearTimeout(timerVarredura); timerVarredura = setTimeout(varrerFotos, 600); }

  function ativarArrastarFotosModal() {
    const lista = $("#lista-fotos-modal");
    if (!lista || lista.dataset.p2Arrastar) return;
    lista.dataset.p2Arrastar = "1";
    new MutationObserver(() => $$("[data-foto-indice]", lista).forEach((item) => { item.draggable = true; item.classList.add("p2-arrastavel"); })).observe(lista, { childList: true });
    let origem = null;
    lista.addEventListener("dragstart", (evento) => { const item = evento.target.closest("[data-foto-indice]"); if (!item) return; origem = Number(item.dataset.fotoIndice); evento.dataTransfer.effectAllowed = "move"; });
    lista.addEventListener("dragover", (evento) => { if (origem !== null) evento.preventDefault(); });
    lista.addEventListener("drop", (evento) => {
      evento.preventDefault();
      const destino = evento.target.closest("[data-foto-indice]");
      const alvo = estado.fotoAlvo;
      if (!destino || origem === null || !alvo) return;
      const produto = P.produtoRawPorId(estado.baseAtualRaw, alvo.produtoId);
      const imagens = P.imagensRaw(P.corRawPorId(produto, alvo.corId));
      const [movida] = imagens.splice(origem, 1);
      imagens.splice(Number(destino.dataset.fotoIndice), 0, movida);
      origem = null;
      P.definirImagensRaw(alvo.produtoId, alvo.corId, imagens);
      P.reconstruir();
      P.renderizarModalFotos();
    });
  }

  /* ---------- ARRASTAR VARIAÇÕES ---------- */
  function ativarArrastarVariacoes() {
    let origem = null;
    document.addEventListener("dragstart", (evento) => {
      const linha = evento.target.closest?.("tr[data-p2-cor][draggable='true']");
      if (!linha || !linha.closest("[data-p2-ordenavel]")) return;
      origem = linha;
      linha.classList.add("is-arrastando");
      evento.dataTransfer.effectAllowed = "move";
    });
    document.addEventListener("dragover", (evento) => {
      if (!origem) return;
      const linha = evento.target.closest?.("tr[data-p2-cor]");
      if (!linha || linha.parentElement !== origem.parentElement) return;
      evento.preventDefault();
      const meio = linha.getBoundingClientRect().top + linha.offsetHeight / 2;
      linha.parentElement.insertBefore(origem, evento.clientY < meio ? linha : linha.nextSibling);
    });
    document.addEventListener("dragend", () => {
      if (!origem) return;
      const corpo = origem.parentElement;
      origem.classList.remove("is-arrastando");
      origem = null;
      const produtoId = corpo.dataset.p2Ordenavel;
      const ids = $$("tr[data-p2-cor]", corpo).map((linha) => linha.dataset.p2Cor);
      const produto = P.produtoRawPorId(estado.baseAtualRaw, produtoId);
      const atuais = (produto?.cores || []).map((cor) => obterIdCor(produtoId, cor));
      if (ids.join("\n") === atuais.join("\n")) return;
      reordenarCores(produtoId, ids, "manual");
      P.reconstruir();
      mostrarToast("Ordem manual preparada", "O site vai respeitar esta ordem depois de salvar e publicar.");
    });
  }

  /* ---------- BUSCA UNIVERSAL ---------- */
  function indiceBusca() {
    const m = modelo();
    const entradas = [];
    m.forEach((produto) => {
      const baseTexto = [produto.nome, produto.raw.marca, produto.raw.material, produto.raw.linha, produto.categoria, produto.id].join(" ");
      entradas.push({ tipo: "produto", produto, texto: buscaNorm(baseTexto), exatos: [produto.id] });
      produto.cores.forEach((cor) => {
        const campos = [cor.nome, FAMILIA_POR_ID.get(cor.familia)?.nome, cor.id, cor.olist?.olistId, cor.olist?.sku, cor.olist?.gtin, cor.raw.sku, cor.raw.gtin, cor.raw.idCatalogo];
        entradas.push({ tipo: "cor", produto, cor, texto: buscaNorm(`${baseTexto} ${campos.filter(Boolean).join(" ")}`), textoCor: buscaNorm(cor.nome), exatos: campos.filter(Boolean).map(String) });
      });
    });
    return entradas;
  }

  function buscar(termo) {
    const t = buscaNorm(termo);
    if (!t) return [];
    const tokens = t.split(" ");
    const bruto = String(termo).trim();
    return indiceBusca().map((entrada) => {
      if (entrada.exatos.some((valor) => valor === bruto)) return { entrada, pontos: 1000 };
      if (!tokens.every((token) => entrada.texto.includes(token))) return null;
      let pontos = entrada.tipo === "cor" ? 10 : 20;
      if (entrada.textoCor) tokens.forEach((token) => { if (entrada.textoCor.includes(token)) pontos += 30; if (entrada.textoCor.startsWith(token)) pontos += 10; });
      if (entrada.tipo === "produto" && buscaNorm(entrada.produto.nome).startsWith(t)) pontos += 60;
      return { entrada, pontos };
    }).filter(Boolean).sort((a, b) => b.pontos - a.pontos).slice(0, 40).map((item) => item.entrada);
  }

  const MODOS_BUSCA = { preco: "Escolha o item para alterar o preço", foto: "Escolha a variação para trocar a foto", pausa: "Escolha o item para pausar ou reativar", variacao: "Escolha o produto que vai receber a nova variação", "": "" };

  function abrirBusca(modo = "") {
    p2.buscaModo = modo;
    p2.buscaAtivo = 0;
    $("#p2-busca").hidden = false;
    document.body.classList.add("p2-travado");
    $("#p2-busca-modo").textContent = MODOS_BUSCA[modo] || "";
    $("#p2-busca-modo").hidden = !modo;
    const campo = $("#p2-busca-campo");
    campo.value = "";
    renderBusca();
    setTimeout(() => campo.focus(), 20);
  }

  function renderBusca() {
    const resultados = buscar($("#p2-busca-campo").value);
    p2.resultadosBusca = resultados;
    p2.buscaAtivo = Math.min(p2.buscaAtivo, Math.max(0, resultados.length - 1));
    const alvo = $("#p2-busca-resultados");
    if (!$("#p2-busca-campo").value.trim()) {
      alvo.innerHTML = '<div class="p2-busca__dica">Exemplos: <code>FOS Roxo</code> · <code>Closin PLA</code> · <code>1049870674</code> · <code>6937120327684</code> · <code>flashforge|pla||vermelho-coral</code></div>';
      return;
    }
    alvo.innerHTML = resultados.map((entrada, i) => {
      const { produto, cor } = entrada;
      const titulo = cor ? `${cor.nome}` : produto.nome;
      const sub = cor ? `${produto.nome} · ${cor.id}${cor.olist ? ` · Olist ${cor.olist.olistId}` : " · sem vínculo"}${cor.olist?.sku ? ` · SKU ${cor.olist.sku}` : ""}` : `${produto.acessorio ? produto.categoria || "Acessório" : produto.material} · ${plural(produto.cores.length, "variação", "variações")} · ${produto.id}`;
      const pausado = cor ? cor.pausada : estado.produtosPausados.has(produto.id);
      return `<div class="p2-resultado ${i === p2.buscaAtivo ? "is-ativo" : ""}" data-p2-resultado="${i}" data-p2-produto="${escapar(produto.id)}" ${cor ? `data-p2-cor="${escapar(cor.id)}" data-p2-produto-da-cor="${escapar(produto.id)}"` : ""}>
        ${thumb(cor ? cor.imagens[0] : produto.capa, (cor || produto.cores[0])?.raw?.hex)}
        <div class="p2-resultado__texto"><strong>${escapar(titulo)}</strong><span>${escapar(sub)}</span></div>
        ${pill(cor ? cor.status : produto.status)}
        <div class="p2-resultado__acoes">
          <button class="botao botao--primario botao--pequeno" type="button" data-p2-busca-acao="editar">Editar</button>
          <button class="botao botao--claro botao--pequeno" type="button" data-p2-busca-acao="preco">Preço</button>
          <button class="botao botao--claro botao--pequeno" type="button" data-p2-busca-acao="foto">Foto</button>
          <button class="botao botao--claro botao--pequeno" type="button" data-p2-busca-acao="variacao">+ Variação</button>
          <button class="botao botao--cinza botao--pequeno" type="button" data-p2-busca-acao="pausa">${pausado ? "Reativar" : "Pausar"}</button>
          <a class="botao botao--cinza botao--pequeno" href="${escapar(linkCatalogo(produto.raw, cor?.raw))}" target="_blank" rel="noopener">↗</a>
        </div></div>`;
    }).join("") || '<div class="p2-busca__dica">Nenhum resultado. Tente outro termo, SKU ou ID.</div>';
    aplicarFundos(alvo);
  }

  function executarBusca(indice, acao) {
    const entrada = p2.resultadosBusca?.[indice];
    if (!entrada) return;
    const { produto, cor } = entrada;
    acao = acao || p2.buscaModo || "editar";
    fecharModalP2("p2-busca");
    if (acao === "editar") { abrirEditor(produto.id, cor ? "variacoes" : "geral"); return; }
    if (acao === "preco") { abrirPreco(produto.id, cor?.id || null); return; }
    if (acao === "foto") { if (cor) P.abrirModalFotos(produto.id, cor.id); else abrirEditor(produto.id, "fotos"); return; }
    if (acao === "variacao") { abrirNovaVariacao(produto.id); return; }
    if (acao === "pausa") {
      if (cor) { if (cor.pausada) { if (confirmar(`Reativar ${cor.nome}?`)) ativarItem("cor", cor.id); } else abrirModalPausa([{ tipo: "cor", id: cor.id, nome: `${produto.nome} — ${cor.nome}` }]); }
      else if (estado.produtosPausados.has(produto.id)) reativarProduto(produto.id);
      else abrirModalPausa([{ tipo: "produto", id: produto.id, nome: produto.nome }]);
    }
  }

  /* ---------------- EVENTOS ---------------- */
  function contextoDoEvento(alvo) {
    const linhaCor = alvo.closest("[data-p2-cor]");
    const produtoEl = alvo.closest("[data-p2-produto], [data-p2-produto-linha]");
    const produtoId = linhaCor?.dataset.p2ProdutoDaCor || produtoEl?.dataset.p2Produto || produtoEl?.dataset.p2ProdutoLinha || p2.editor?.produtoId;
    return { produtoId, corId: linhaCor?.dataset.p2Cor || null };
  }

  function acaoLinha(acao, produtoId, corId, botao) {
    const produtoModelo = () => modelo().find((item) => item.id === produtoId);
    switch (acao) {
      case "expandir": if (p2.abertos.has(produtoId)) p2.abertos.delete(produtoId); else p2.abertos.add(produtoId); renderTudo(); break;
      case "editar": abrirEditor(produtoId); break;
      case "editar-seo": abrirEditor(produtoId, "seo"); break;
      case "preco": abrirPreco(produtoId); break;
      case "preco-cor": abrirPreco(produtoId, corId); break;
      case "foto": { const produto = produtoModelo(); const cor = produto?.cores.find((item) => !item.imagens.length) || produto?.cores[0]; if (cor) P.abrirModalFotos(produtoId, cor.id); break; }
      case "foto-cor": P.abrirModalFotos(produtoId, corId); break;
      case "substituir-foto": substituirFoto(produtoId, corId); break;
      case "nova-cor": abrirNovaVariacao(produtoId); break;
      case "duplicar-cor": { const raw = P.corRawPorId(P.produtoRawPorId(estado.baseAtualRaw, produtoId), corId); if (raw) abrirNovaVariacao(produtoId, raw); break; }
      case "duplicar": duplicarProduto(produtoId); break;
      case "pausar": abrirModalPausa([{ tipo: "produto", id: produtoId, nome: nomePorId("produto", produtoId) }]); break;
      case "reativar": case "publicar-rascunho": reativarProduto(produtoId); break;
      case "mover-rascunho": moverParaRascunho(produtoId); break;
      case "pausar-cor": abrirModalPausa([{ tipo: "cor", id: corId, nome: nomePorId("cor", corId) }]); break;
      case "reativar-cor": if (confirmar(`Reativar ${nomePorId("cor", corId)}? Volta ao site quando houver estoque.`)) ativarItem("cor", corId); break;
      case "ordenar-familia": ordenarPorFamilia(produtoId); break;
      case "olist": abrirOlist(produtoId, corId); break;
      case "aplicar-geral": {
        const corpo = botao.closest(".p2-editor__corpo");
        const raw = P.produtoRawPorId(estado.baseAtualRaw, produtoId);
        const campos = $$("[data-p2-edit]", corpo);
        const link = campos.find((campo) => campo.dataset.p2Edit === "linkLoja")?.value.trim();
        if (link && !/^https?:\/\//i.test(link)) { mostrarToast("Link inválido", "Use um endereço começando com https://"); break; }
        let mudou = 0;
        campos.forEach((campo) => {
          const nome = campo.dataset.p2Edit;
          const valor = campo.value.trim();
          if (valor === String(raw?.[nome] ?? "").trim()) return; // não cria alteração em campo intocado
          definirCampoProduto(produtoId, nome, valor || (nome === "linkLoja" ? "" : null));
          mudou += 1;
        });
        P.reconstruir();
        mostrarToast(mudou ? "Informações preparadas" : "Nada mudou", mudou ? "Revise e salve as alterações." : "Os campos já tinham esses valores.");
        break;
      }
      case "aplicar-seo": {
        const corpo = botao.closest(".p2-editor__corpo");
        const raw = P.produtoRawPorId(estado.baseAtualRaw, produtoId);
        $$("[data-p2-seo]", corpo).forEach((campo) => { if (campo.value.trim() !== String(raw?.[campo.dataset.p2Seo] ?? "").trim()) definirCampoProduto(produtoId, campo.dataset.p2Seo, campo.value.trim() || null); });
        P.reconstruir();
        mostrarToast("SEO preparado", "Vale para a próxima publicação.");
        break;
      }
      case "seo-automatico": definirCampoProduto(produtoId, "seoTitulo", null); definirCampoProduto(produtoId, "seoDescricao", null); P.reconstruir(); break;
      default: return false;
    }
    return true;
  }

  function registrarEventos() {
    document.addEventListener("click", (evento) => {
      const alvo = evento.target;
      if (!(alvo instanceof Element)) return;

      const fechar = alvo.closest("[data-p2-fechar]");
      if (fechar) { fecharModalP2(fechar.dataset.p2Fechar); return; }
      if (alvo.id === "p2-editor") { fecharEditor(); return; }
      if (alvo.id === "p2-busca") { fecharModalP2("p2-busca"); return; }
      if (alvo.matches(".modal") && alvo.id.startsWith("p2-")) { fecharModalP2(alvo.id); return; }

      const rapida = alvo.closest("[data-p2-rapida]");
      if (rapida) {
        const tipo = rapida.dataset.p2Rapida;
        if (tipo === "produto") { estado.cadastro && (estado.cadastro.modo = "novo"); abrirAba("cadastro"); P.renderizarCadastro(); }
        else if (tipo === "variacao") abrirBusca("variacao");
        else if (tipo === "preco" || tipo === "foto" || tipo === "pausa") abrirBusca(tipo);
        else if (tipo === "problemas") { abrirAba("visao"); setTimeout(() => $("#p2-problemas")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }
        else if (tipo === "publicar") publicarAgora();
        return;
      }

      const metrica = alvo.closest("[data-p2-metrica]");
      if (metrica) { const acao = JSON.parse(metrica.dataset.p2Metrica); if (acao.tipo === "publicacao") abrirAba("publicacao"); else executarAcaoProblema(acao); return; }
      const problema = alvo.closest("[data-p2-problema]");
      if (problema) { executarAcaoProblema(p2.ultimosProblemas?.[Number(problema.dataset.p2Problema)]?.acao); return; }

      const resultado = alvo.closest("[data-p2-resultado]");
      if (resultado && alvo.closest("#p2-busca")) {
        if (alvo.closest("a")) return;
        const acao = alvo.closest("[data-p2-busca-acao]")?.dataset.p2BuscaAcao;
        executarBusca(Number(resultado.dataset.p2Resultado), acao);
        return;
      }

      const aba = alvo.closest("[data-p2-editor-aba]");
      if (aba) { p2.editor.aba = aba.dataset.p2EditorAba; renderEditor(modelo()); return; }

      const filtroOlist = alvo.closest("[data-p2-olist-filtro]");
      if (filtroOlist) { p2.olistFiltro = filtroOlist.dataset.p2OlistFiltro; renderTudo(); return; }
      const filtroImagens = alvo.closest("[data-p2-imagens-filtro]");
      if (filtroImagens) { p2.imagensFiltro = filtroImagens.dataset.p2ImagensFiltro; renderTudo(); return; }
      const filtroSeo = alvo.closest("[data-p2-seo-filtro]");
      if (filtroSeo) { p2.seoFiltro = filtroSeo.dataset.p2SeoFiltro; renderTudo(); return; }

      const lote = alvo.closest("[data-p2-lote]");
      if (lote) { abrirLote(lote.dataset.p2Lote); return; }

      const desfazerExtraBotao = alvo.closest("[data-desfazer-extra]");
      if (desfazerExtraBotao) { desfazerExtra(desfazerExtraBotao.dataset.desfazerExtra); return; }
      const desfazerHist = alvo.closest("[data-p2-desfazer-historico]");
      if (desfazerHist) { desfazerHistorico(desfazerHist.dataset.p2DesfazerHistorico); return; }

      const sugestao = alvo.closest("[data-p2-usar-sugestao]");
      if (sugestao) { const campo = $(`[data-p2-seo='${sugestao.dataset.p2UsarSugestao}']`); if (campo) { campo.value = sugestao.dataset.valor; campo.dispatchEvent(new Event("input", { bubbles: true })); } return; }

      const botao = alvo.closest("[data-p2-acao]");
      if (botao) {
        const acao = botao.dataset.p2Acao;
        if (acao === "limpar-filtro-ids") { p2.filtroIds = null; p2.filtroRotulo = ""; renderTudo(); return; }
        if (acao === "limpar-selecao") { p2.selecao.clear(); renderTudo(); return; }
        if (acao === "varrer-fotos") { p2.fotosVarridas = false; varrerFotos(); renderTudo(); return; }
        if (acao === "consultar-github") { consultarGitHub(false); return; }
        if (acao === "previsualizar") { $("#drawer-resumo").hidden = false; return; }
        if (acao === "salvar") { refs.salvar.click(); return; }
        if (acao === "acompanhar") { acompanharPublicacao(); return; }
        if (acao === "limpar-historico") { $("#limpar-historico").click(); renderTudo(); return; }
        const { produtoId, corId } = contextoDoEvento(botao);
        if (produtoId) acaoLinha(acao, produtoId, corId, botao);
        return;
      }

      // Segmentados dos modais (modo de preço)
      const modoPreco = alvo.closest("#p2-preco-modo [data-modo], #p2-var-preco-modo [data-modo]");
      if (modoPreco) {
        $$("[data-modo]", modoPreco.parentElement).forEach((item) => item.classList.toggle("ativo", item === modoPreco));
        if (modoPreco.closest("#p2-preco-modo")) atualizarSimulacaoPreco();
        else { $("#p2-var-preco").hidden = modoPreco.dataset.modo !== "especifico"; validarNovaVariacao(); }
        return;
      }
      if (alvo.id === "p2-preco-aplicar") { aplicarPrecoModal(); return; }
      if (alvo.closest("#p2-var-add-foto")) { $("#p2-var-arquivos").click(); return; }
      const removerFotoVar = alvo.closest("[data-p2-remover-foto-var]");
      if (removerFotoVar) { p2.modalVariacao.arquivos.splice(Number(removerFotoVar.dataset.p2RemoverFotoVar), 1); renderFotosNovaVariacao(); validarNovaVariacao(); return; }
      if (alvo.id === "p2-var-salvar") { salvarNovaVariacao(); return; }
      if (alvo.id === "p2-olist-salvar") { salvarOlist(); return; }
      if (alvo.id === "p2-lote-aplicar") { aplicarLote(); return; }
      if (alvo.closest("#p2-abrir-busca")) { abrirBusca(); return; }
      if (alvo.id === "acompanhar-publicacao") { acompanharPublicacao(); return; }

      // Cadastro guiado: tipo e situação
      const tipoCadastro = alvo.closest("[data-cadastro-tipo]");
      if (tipoCadastro && estado.cadastro) { estado.cadastro.tipo = tipoCadastro.dataset.cadastroTipo; P.renderizarCadastro(); P.salvarRascunhoCadastro(); return; }
      const statusCadastro = alvo.closest("[data-cadastro-status]");
      if (statusCadastro && estado.cadastro) { estado.cadastro.status = statusCadastro.dataset.cadastroStatus; estado.cadastro.pausado = estado.cadastro.status !== "ativo"; P.renderizarCadastro(); P.salvarRascunhoCadastro(); }
    });

    document.addEventListener("change", (evento) => {
      const alvo = evento.target;
      const sel = alvo.closest?.("[data-p2-sel]");
      if (sel) { if (sel.checked) p2.selecao.add(sel.dataset.p2Sel); else p2.selecao.delete(sel.dataset.p2Sel); renderTudo(); return; }
      const campoCor = alvo.closest?.("[data-p2-campo-cor]");
      if (campoCor) {
        const { produtoId, corId } = contextoDoEvento(campoCor);
        definirCampoCor(produtoId, corId, campoCor.dataset.p2CampoCor, campoCor.value || null);
        P.reconstruir();
        return;
      }
      if (alvo.id === "p2-filtro-status") { p2.filtroStatus = alvo.value; renderTudo(); return; }
      if (alvo.id === "p2-filtro-material") { p2.filtroMaterial = alvo.value; renderTudo(); return; }
      if (alvo.id === "p2-var-produto") { validarNovaVariacao(); return; }
      if (alvo.id === "p2-var-arquivos") { p2.modalVariacao.arquivos.push(...[...alvo.files].filter((arquivo) => arquivo.size > 0)); alvo.value = ""; renderFotosNovaVariacao(); validarNovaVariacao(); return; }
      if (alvo.id === "p2-seletor-substituir") { const arquivo = alvo.files?.[0]; alvo.value = ""; aplicarSubstituicao(arquivo); return; }
      if (alvo.id === "p2-var-familia") { const familia = FAMILIA_POR_ID.get(alvo.value); if (familia && !p2.modalVariacao?.base) { $("#p2-var-hex").value = familia.hex; $("#p2-var-hex-cor").value = familia.hex; } validarNovaVariacao(); return; }
      if (alvo.id === "p2-lote-operacao") { previaLote(); return; }
      if (alvo.matches?.("[data-variante-campo='precoModo']")) {
        const campoPreco = alvo.parentElement.querySelector("[data-variante-campo='preco']");
        if (campoPreco) campoPreco.hidden = alvo.value !== "especifico";
        P.atualizarResumoCadastro();
      }
    });

    document.addEventListener("input", (evento) => {
      const alvo = evento.target;
      if (alvo.id === "p2-filtro-texto") { p2.filtroTexto = alvo.value; renderTudo(); return; }
      if (alvo.id === "p2-busca-campo") { p2.buscaAtivo = 0; renderBusca(); return; }
      if (alvo.id === "p2-preco-novo") { atualizarSimulacaoPreco(); return; }
      if (alvo.id?.startsWith("p2-var-")) {
        if (alvo.id === "p2-var-hex-cor") $("#p2-var-hex").value = alvo.value.toUpperCase();
        if (alvo.id === "p2-var-hex" && /^#[0-9a-f]{6}$/i.test(alvo.value)) $("#p2-var-hex-cor").value = alvo.value;
        if (alvo.id === "p2-var-nome" && !$("#p2-var-familia").value) $("#p2-var-familia").innerHTML = opcoesFamilia("", alvo.value, $("#p2-var-efeito").value);
        validarNovaVariacao();
        return;
      }
      if (alvo.id?.startsWith("p2-olist-")) { validarOlist(); return; }
      if (alvo.id === "p2-lote-valor") { previaLote(); return; }
      if (alvo.matches?.("[data-p2-seo]")) {
        const contador = $(`[data-p2-contador='${alvo.dataset.p2Seo}']`);
        const limite = alvo.dataset.p2Seo === "seoTitulo" ? 65 : 160;
        const tamanho = (alvo.value.trim() || alvo.placeholder).length;
        if (contador) { contador.textContent = `${tamanho}/${limite}`; contador.classList.toggle("p2-erro", tamanho > limite); }
      }
    });

    document.addEventListener("keydown", (evento) => {
      const tecla = evento.key;
      if ((evento.ctrlKey || evento.metaKey) && tecla.toLowerCase() === "k") { evento.preventDefault(); abrirBusca(); return; }
      if ((evento.ctrlKey || evento.metaKey) && tecla.toLowerCase() === "s") {
        evento.preventDefault();
        const modalAberto = $$(".modal:not([hidden])").find((modal) => modal.id.startsWith("p2-"));
        const principal = modalAberto && $("[data-p2-principal]", modalAberto);
        if (principal && !principal.disabled) { principal.click(); return; }
        if (p2.aba === "cadastro" && !$("#cadastro-preparar").disabled) { $("#cadastro-preparar").click(); return; }
        if (!refs.salvar.disabled) refs.salvar.click(); else mostrarToast("Nada para salvar", "Não há alterações pendentes.");
        return;
      }
      if (tecla === "Escape") {
        if (!$("#p2-busca").hidden) { fecharModalP2("p2-busca"); return; }
        const modalAberto = [...$$(".modal:not([hidden])")].pop();
        if (modalAberto) { modalAberto.hidden = true; return; }
        if (!$("#drawer-resumo").hidden) { $("#drawer-resumo").hidden = true; return; }
        if (p2.editor) { fecharEditor(); return; }
      }
      if (!$("#p2-busca").hidden) {
        if (tecla === "ArrowDown" || tecla === "ArrowUp") {
          evento.preventDefault();
          const total = p2.resultadosBusca?.length || 0;
          if (!total) return;
          p2.buscaAtivo = (p2.buscaAtivo + (tecla === "ArrowDown" ? 1 : -1) + total) % total;
          $$(".p2-resultado").forEach((el, i) => el.classList.toggle("is-ativo", i === p2.buscaAtivo));
          $(".p2-resultado.is-ativo")?.scrollIntoView({ block: "nearest" });
        }
        if (tecla === "Enter" && evento.target.id === "p2-busca-campo") { evento.preventDefault(); executarBusca(p2.buscaAtivo); }
      }
      if (tecla === "Enter" && evento.target.id === "p2-preco-novo") { evento.preventDefault(); aplicarPrecoModal(); }
    });

    // Desfazer tudo também restaura os rascunhos (roda antes do listener original, que interrompe a propagação).
    document.addEventListener("click", (evento) => {
      if (evento.target.closest?.("#desfazer")) p2.rascunhos = new Set(p2.rascunhosOriginal);
    }, true);
  }

  /* ---------------- PUBLICAR AGORA ---------------- */
  function publicarAgora() {
    if (estado.modo !== "arquivo" || !estado.pastaHandle) { mostrarToast("Conecte a pasta do catálogo", "Selecione a pasta catalogo-3zk para salvar e publicar."); return; }
    if (diferencas().length) {
      if (refs.salvar.disabled) { mostrarToast("Não é possível salvar ainda", "Revise as alterações pendentes na aba Publicação."); abrirAba("publicacao"); return; }
      refs.salvar.click(); // salva com validação; ao terminar mostra o passo a passo do Commit e Push
      return;
    }
    $("#summary-sugerido").textContent = "Atualiza catálogo pelo Painel 3ZK";
    $("#descricao-sugerida").textContent = "Alterações já salvas pelo Painel Local 2.0.";
    $("#modal-salvo").hidden = false;
  }

  /* ---------------- INTEGRAÇÃO COM O PAINEL EXISTENTE ---------------- */
  const diferencasBaseP2 = diferencas;
  diferencas = function() { return [...diferencasBaseP2(), ...diferencasExtras()]; };
  temAlteracoes = function() { return diferencas().length > 0; };

  const atualizarTudoBaseP2 = atualizarTudo;
  atualizarTudo = function() {
    if (p2.controleVisto && estado.controleOriginal !== p2.controleVisto) {
      // O controle acabou de ser gravado: os rascunhos salvos passam a ser o novo ponto de partida.
      p2.rascunhosOriginal = rascunhosEfetivos();
    }
    p2.controleVisto = estado.controleOriginal;
    if (p2.baseVista && estado.baseOriginalRaw !== p2.baseVista) varrerFotosDepois();
    p2.baseVista = estado.baseOriginalRaw;
    atualizarTudoBaseP2();
    renderTudo();
  };

  Object.assign(P, { diferencasExtras, validarAntesDeSalvar, marcarRascunho, opcoesFamilia: (valor, nome) => opcoesFamilia(valor, nome), previaCadastro });

  montarLayout();
  registrarEventos();
  ativarArrastarVariacoes();
  ativarArrastarFotosModal();
  P.renderizarVariantesCadastro();
  abrirAba("visao");
})();
