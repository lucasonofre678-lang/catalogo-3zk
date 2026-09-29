/* 3ZK — interações das páginas estáticas de SEO (produto, categorias, marcas).
   Sem dependências e compatível com a CSP do site (nenhum script inline). */
(() => {
  "use strict";
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const $ = (s, root = document) => root.querySelector(s);
  const esc = (valor) => String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Mesmo cálculo do script.js: Pix com 5% de desconto e 3x sem juros sobre o preço real.
  function resumoPreco(valor) {
    const normal = Math.round(valor * 100) / 100;
    const pix = Math.round((normal - Math.round(normal * 5) / 100) * 100) / 100;
    const parcela = Math.round((normal / 3) * 100) / 100;
    return { normal, pix, parcela };
  }

  // Mesmo markup de priceBlock e cardPriceBlock do script.js.
  const blocoPreco = (r) => `<span class="price-card-reference">${money.format(r.normal)} no cartão</span><span class="price-pix"><strong>${money.format(r.pix)}</strong><span>à vista no Pix</span><em>5% OFF</em></span><span class="price-installments">ou 3x de ${money.format(r.parcela)} sem juros no cartão</span>`;
  const blocoPrecoCard = (r, estoque, classe) => `<span class="card-reference-price">${money.format(r.normal)} no cartão</span><span class="card-pix"><strong>${money.format(r.pix)}</strong><span><span class="txt-longo">à vista </span>no Pix</span><em>5% OFF</em></span><span class="card-installments"><span class="txt-longo">ou </span>3x de ${money.format(r.parcela)} sem juros<span class="txt-longo"> no cartão</span></span><span class="stock ${esc(classe)}">${esc(estoque)}</span>`;

  /* ---------- página de produto: troca de variação ---------- */
  const botoes = [...document.querySelectorAll("[data-seo-variant]")];
  const imagem = $("#seoProductImage");
  const nome = $("#seoVariantName");
  const precoEl = $("#seoProductPrice");
  const estoque = $("#seoProductStock");
  const linkCatalogo = $("#seoCatalogLink");

  function selecionar(botao, atualizarUrl) {
    botoes.forEach((b) => {
      const ativo = b === botao;
      b.classList.toggle("is-active", ativo);
      if (ativo) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
    const d = botao.dataset;
    if (imagem) { imagem.src = d.image; imagem.alt = `${document.querySelector("h1")?.textContent || ""} — ${d.name}`; }
    if (nome) nome.textContent = d.name;
    if (precoEl) precoEl.innerHTML = blocoPreco(resumoPreco(Number(d.price)));
    if (estoque) { estoque.textContent = d.stock; estoque.className = `stock-line ${d.stockClass || "stock--ok"}`; }
    if (linkCatalogo) {
      const url = new URL(linkCatalogo.href, location.href);
      url.searchParams.set("cor", d.slug);
      linkCatalogo.href = url.pathname + url.search;
    }
    if (atualizarUrl) history.replaceState(null, "", `?cor=${d.slug}`);
  }

  botoes.forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); selecionar(b, true); }));
  const pedida = new URLSearchParams(location.search).get("cor");
  const inicial = botoes.find((b) => b.dataset.slug === pedida) || botoes.find((b) => b.classList.contains("is-active")) || botoes[0];
  if (inicial) selecionar(inicial, false);

  /* ---------- grades de produtos: miniaturas dos cards ---------- */
  document.addEventListener("click", (e) => {
    const mini = e.target.closest(".variant-mini[data-image]");
    if (!mini) return;
    const cardEl = mini.closest(".product-card");
    if (!cardEl) return;
    cardEl.querySelectorAll(".variant-mini").forEach((m) => { const on = m === mini; m.classList.toggle("is-active", on); m.setAttribute("aria-pressed", String(on)); });
    const d = mini.dataset;
    const img = cardEl.querySelector(".card-media img");
    if (img) { img.src = d.image; img.alt = `${cardEl.querySelector(".product-title")?.textContent || ""} — ${d.name}`; }
    const resumo = cardEl.querySelector(".variant-summary > span");
    if (resumo) { resumo.textContent = d.name; resumo.title = d.name; }
    const linhaPreco = cardEl.querySelector(".card-price-row");
    if (linhaPreco) linhaPreco.innerHTML = blocoPrecoCard(resumoPreco(Number(d.price)), d.stock, d.stockClass);
    cardEl.querySelectorAll("a[data-open-product]").forEach((a) => {
      const url = new URL(a.href, location.href);
      url.searchParams.set("cor", slug(d.name));
      a.href = url.pathname + url.search;
    });
  });

  /* ---------- cabeçalho: atalho para o pedido montado no catálogo ---------- */
  const atalhoPedido = $("#seoPedido");
  if (atalhoPedido) {
    try {
      const itens = JSON.parse(window.localStorage.getItem("3zk-carrinho-v1") || "[]");
      const quantidade = Array.isArray(itens) ? itens.reduce((total, item) => total + (Number(item?.quantidade) || 0), 0) : 0;
      if (quantidade > 0) {
        $("#seoPedidoQtd", atalhoPedido).textContent = quantidade > 99 ? "99+" : String(quantidade);
        atalhoPedido.hidden = false;
      }
    } catch (erro) { /* sem armazenamento local */ }
  }

  function slug(texto) {
    return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
})();
