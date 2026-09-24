/* 3ZK — interações das páginas estáticas de SEO (produto, categorias, marcas).
   Sem dependências e compatível com a CSP do site (nenhum script inline). */
(() => {
  "use strict";
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const $ = (s, root = document) => root.querySelector(s);

  /* ---------- página de produto: troca de variação ---------- */
  const botoes = [...document.querySelectorAll("[data-seo-variant]")];
  const imagem = $("#seoProductImage");
  const nome = $("#seoVariantName");
  const precoEl = $("#seoProductPrice");
  const estoque = $("#seoProductStock");
  const linkCatalogo = $("#seoCatalogLink");

  // Mesmo cálculo do script.js: Pix com 5% de desconto e 3x sem juros sobre o preço real.
  function resumoPreco(valor) {
    const normal = Math.round(valor * 100) / 100;
    const pix = Math.round((normal - Math.round(normal * 5) / 100) * 100) / 100;
    const parcela = Math.round((normal / 3) * 100) / 100;
    return { normal, pix, parcela };
  }

  function blocoPreco(valor) {
    const r = resumoPreco(valor);
    return `<strong class="price-main">${money.format(r.normal)}</strong><span class="price-pix">${money.format(r.pix)} no Pix <em>5% OFF</em></span><span class="price-installments">ou 3x de ${money.format(r.parcela)} sem juros no cartão</span>`;
  }

  function selecionar(botao, atualizarUrl) {
    botoes.forEach((b) => {
      const ativo = b === botao;
      b.classList.toggle("is-active", ativo);
      if (ativo) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
    const d = botao.dataset;
    if (imagem) { imagem.src = d.image; imagem.alt = `${document.querySelector("h1")?.textContent || ""} — ${d.name}`; }
    if (nome) nome.textContent = d.name;
    if (precoEl) precoEl.innerHTML = blocoPreco(Number(d.price));
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
  if (pedida) { const alvo = botoes.find((b) => b.dataset.slug === pedida); if (alvo) selecionar(alvo, false); }

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
    const r = resumoPreco(Number(d.price));
    const preco = cardEl.querySelector(".price");
    if (preco) preco.textContent = money.format(r.normal);
    const pix = cardEl.querySelector(".card-pix > span");
    if (pix) pix.textContent = `${money.format(r.pix)} no Pix`;
    const parcelas = cardEl.querySelector(".card-installments");
    if (parcelas) parcelas.textContent = `ou 3x de ${money.format(r.parcela)} sem juros no cartão`;
    const stock = cardEl.querySelector(".stock");
    if (stock) { stock.textContent = d.stock; stock.className = `stock ${d.stockClass}`; }
    cardEl.querySelectorAll("a[data-open-product]").forEach((a) => {
      const url = new URL(a.href, location.href);
      url.searchParams.set("cor", slug(d.name));
      a.href = url.pathname + url.search;
    });
  });

  function slug(texto) {
    return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
})();
