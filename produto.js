(() => {
  'use strict';

  if (document.body.dataset.page !== 'produto-v57') return;

  let iniciado = false;
  let produtoAtual = null;
  let indiceVariacao = 0;
  let itensGaleria = [];
  let indiceGaleria = 0;
  let buscaVariacao = '';
  let touchInicioX = null;
  let touchLightboxInicioX = null;
  let zoomLightbox = 1;
  let panLightboxX = 0;
  let panLightboxY = 0;
  let arrastandoLightbox = false;
  let origemArrasteX = 0;
  let origemArrasteY = 0;
  let origemPanX = 0;
  let origemPanY = 0;

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

  function ehAcessorio(produto) {
    return obterSecaoProduto(produto) === 'acessorios';
  }

  function rotuloSingular(produto) {
    return obterRotuloVariacaoSingular(produto) || (ehAcessorio(produto) ? 'opção' : 'cor');
  }

  function rotuloPlural(produto) {
    return obterRotuloVariacaoPlural(produto) || (ehAcessorio(produto) ? 'opções' : 'cores');
  }

  function encontrarProduto() {
    const params = new URLSearchParams(location.search);
    const slug = params.get('produto') || '';
    return produtos.find((produto) => obterSlugProduto(produto) === slug) || null;
  }

  function encontrarIndiceVariacao(produto) {
    const params = new URLSearchParams(location.search);
    const slugCor = params.get('cor') || '';
    const indice = encontrarIndiceCorPorSlug(produto, slugCor);
    return indice >= 0 ? indice : 0;
  }

  async function montarGaleria(produto) {
    const grupos = await Promise.all(produto.cores.map(async (cor, indiceCor) => {
      const fotos = obterFotosCor(produto, cor);
      const validadas = await Promise.all(fotos.map((foto) => testarImagem(foto)));
      const fotosValidas = validadas.filter(Boolean);

      if (!fotosValidas.length) {
        return [{ src: '', cor, indiceCor, indiceFoto: 0, totalFotosCor: 0 }];
      }

      return fotosValidas.map((src, indiceFoto) => ({
        src,
        cor,
        indiceCor,
        indiceFoto,
        totalFotosCor: fotosValidas.length
      }));
    }));

    return grupos.flat();
  }

  function indiceGaleriaDaVariacao(indiceCor, indiceFoto = 0) {
    const encontrado = itensGaleria.findIndex(
      (item) => item.indiceCor === indiceCor && item.indiceFoto === indiceFoto
    );
    return encontrado >= 0 ? encontrado : 0;
  }

  function atualizarUrl() {
    const cor = produtoAtual?.cores[indiceVariacao];
    if (!cor) return;
    const url = new URL(location.href);
    url.searchParams.set('produto', obterSlugProduto(produtoAtual));
    url.searchParams.set('cor', obterSlugCor(cor));
    history.replaceState(null, '', url);
  }

  function textoEstoque(cor) {
    const status = obterStatusEstoque(cor);
    if (status === 'sem_estoque') return 'Sem estoque no momento';
    if (status === 'ultimas_unidades') return 'Últimas unidades';
    return 'Em estoque';
  }

  function configurarBotaoAdicionar(botao, cor) {
    if (!botao || !cor) return;
    botao.dataset.itemId = obterIdItemCarrinho(produtoAtual, cor);
    botao.dataset.corNome = cor.nome;
    botao.disabled = !corEstaDisponivel(cor);
    const texto = botao.querySelector('.produto__adicionar-texto');
    sincronizarBotaoAdicionar(botao);
    if (texto && !corEstaDisponivel(cor)) texto.textContent = 'Sem estoque';
  }

  function renderizarGaleria() {
    const item = itensGaleria[indiceGaleria];
    if (!item) return;

    const imagem = $('#produto-foto-v57');
    const semFoto = $('#produto-sem-foto-v57');

    if (item.src) {
      imagem.hidden = false;
      imagem.src = item.src;
      imagem.alt = `${obterNomeProdutoParaInterface(produtoAtual)} — ${item.cor.nome}`;
      semFoto.hidden = true;
    } else {
      imagem.hidden = true;
      imagem.removeAttribute('src');
      semFoto.hidden = false;
    }

    const contador = $('#produto-foto-contador-v57');
    if (item.totalFotosCor > 1) {
      contador.textContent = `${item.cor.nome} · foto ${item.indiceFoto + 1} de ${item.totalFotosCor}`;
    } else {
      contador.textContent = item.cor.nome;
    }

    const lb = $('#produto-lightbox-v57');
    if (lb?.getAttribute('aria-hidden') === 'false') renderizarLightbox();
  }

  function atualizarSelecao(indiceCor, opcoes = {}) {
    const cor = produtoAtual?.cores[indiceCor];
    if (!cor) return;

    indiceVariacao = indiceCor;
    indiceGaleria = Number.isInteger(opcoes.indiceGaleria)
      ? opcoes.indiceGaleria
      : indiceGaleriaDaVariacao(indiceCor, 0);

    const preco = obterPrecoProdutoOuVariacao(produtoAtual, cor);
    const resumo = obterResumoPrecoCatalogo(preco);

    $('#produto-cor-v57').textContent = cor.nome;
    $('#produto-preco-v57').textContent = formatarPreco(resumo.precoNormal);
    $('#produto-pix-v57').textContent = `${formatarPrecoPedido(resumo.precoPix)} no Pix · 5% OFF`;
    $('#produto-parcelamento-v57').textContent = `ou ${PARCELAS_SEM_JUROS}x de ${formatarPrecoPedido(resumo.valorParcela)} sem juros`;

    const estoque = $('#produto-estoque-v57');
    estoque.textContent = textoEstoque(cor);
    estoque.className = '';
    if (!corEstaDisponivel(cor)) estoque.classList.add('sem-estoque');
    else if (obterStatusEstoque(cor) === 'ultimas_unidades') estoque.classList.add('ultimas-unidades');

    configurarBotaoAdicionar($('#produto-adicionar-v57'), cor);
    configurarBotaoAdicionar($('#produto-sticky-add-v57'), cor);

    $('#produto-sticky-cor-v57').textContent = cor.nome;
    $('#produto-sticky-preco-v57').textContent = formatarPreco(resumo.precoNormal);
    obterPrimeiraFotoValida(produtoAtual, cor).then((src) => {
      const img = $('#produto-sticky-foto-v57');
      if (src) {
        if (img) {
          img.src = src;
          img.hidden = false;
        }
      } else if (img) {
        img.hidden = true;
      }
    });

    atualizarUrl();
    renderizarGaleria();
    atualizarSelecaoGrade();
  }

  function avancarGaleria(delta) {
    if (!itensGaleria.length) return;
    indiceGaleria = (indiceGaleria + delta + itensGaleria.length) % itensGaleria.length;
    const item = itensGaleria[indiceGaleria];

    if (item.indiceCor !== indiceVariacao) {
      atualizarSelecao(item.indiceCor, { indiceGaleria });
    } else {
      renderizarGaleria();
    }
  }

  function atualizarSelecaoGrade() {
    $$('.produto-v57__variacao').forEach((botao) => {
      const ativo = Number(botao.dataset.indice) === indiceVariacao;
      botao.classList.toggle('produto-v57__variacao--ativa', ativo);
      botao.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      const marca = botao.querySelector('.produto-v57__variacao-check');
      if (marca) marca.hidden = !ativo;
    });
  }

  function precoMaisComum() {
    const mapa = new Map();
    produtoAtual.cores.forEach((cor) => {
      const preco = obterPrecoProdutoOuVariacao(produtoAtual, cor);
      mapa.set(preco, (mapa.get(preco) || 0) + 1);
    });
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  }

  function variacoesFiltradas() {
    const consulta = criarConsultaBusca(buscaVariacao);
    return produtoAtual.cores
      .map((cor, indice) => ({ cor, indice }))
      .filter(({ cor }) => {
        if (!consulta.normalizado) return true;
        return pontuarCorNaBusca(cor, consulta) > 0 || normalizarBusca(cor.nome).includes(consulta.normalizado);
      });
  }

  function renderizarGrade() {
    const grade = $('#produto-grade-v57');
    const lista = variacoesFiltradas();
    const precoComum = precoMaisComum();
    const vazio = $('#produto-vazio-v57');
    const info = $('#produto-filtro-info-v57');

    vazio.hidden = lista.length > 0;
    info.hidden = !buscaVariacao;
    info.textContent = buscaVariacao
      ? `${lista.length} ${lista.length === 1 ? rotuloSingular(produtoAtual) : rotuloPlural(produtoAtual)} para “${buscaVariacao}”`
      : '';

    grade.innerHTML = lista.map(({ cor, indice }) => {
      const preco = obterPrecoProdutoOuVariacao(produtoAtual, cor);
      const diferenciado = Math.abs(preco - precoComum) > 0.001;
      return `
        <button class="produto-v57__variacao" type="button" data-indice="${indice}" aria-pressed="false">
          <span class="produto-v57__variacao-foto" data-foto-indice="${indice}">
            <span class="produto-v57__variacao-sem-foto">Foto</span>
          </span>
          <span class="produto-v57__variacao-texto">
            <strong title="${escaparHTML(cor.nome)}">${escaparHTML(cor.nome)}</strong>
            <small>${diferenciado ? formatarPreco(preco) : textoEstoque(cor)}</small>
          </span>
          <span class="produto-v57__variacao-check" hidden>✓ Selecionada</span>
        </button>
      `;
    }).join('');

    lista.forEach(({ cor, indice }) => {
      const alvo = grade.querySelector(`[data-foto-indice="${indice}"]`);
      if (!alvo) return;
      obterPrimeiraFotoValida(produtoAtual, cor).then((src) => {
        if (!src) return;
        alvo.innerHTML = `<img src="${escaparHTML(src)}" alt="${escaparHTML(cor.nome)}" loading="lazy" decoding="async">`;
      });
    });

    atualizarSelecaoGrade();
  }

  function renderizarRelacionados() {
    const secao = $('#produto-relacionados-v57');
    const grade = $('#produto-relacionados-grade-v57');
    const relacionados = produtos.filter((produto) => {
      if (produto === produtoAtual) return false;
      if (obterSecaoProduto(produto) !== obterSecaoProduto(produtoAtual)) return false;
      if (!ehAcessorio(produtoAtual)) return normalizar(produto.material) === normalizar(produtoAtual.material);
      return normalizar(obterCategoriaProduto(produto)) === normalizar(obterCategoriaProduto(produtoAtual));
    }).slice(0, 3);

    if (!relacionados.length) {
      secao.hidden = true;
      return;
    }

    secao.hidden = false;
    grade.innerHTML = relacionados.map((produto, indice) => {
      const cor = produto.cores[0];
      const preco = Math.min(...produto.cores.map((c) => obterPrecoProdutoOuVariacao(produto, c)));
      return `
        <a class="produto-v57__relacionado" href="produto.html?produto=${encodeURIComponent(obterSlugProduto(produto))}&cor=${encodeURIComponent(obterSlugCor(cor))}" data-rel="${indice}">
          <span class="produto-v57__relacionado-foto" data-rel-foto="${indice}"></span>
          <span><strong>${escaparHTML(obterNomeProdutoParaInterface(produto))}</strong><small>${produto.cores.length} ${produto.cores.length === 1 ? rotuloSingular(produto) : rotuloPlural(produto)} · a partir de ${formatarPreco(preco)}</small></span>
        </a>
      `;
    }).join('');

    relacionados.forEach((produto, indice) => {
      obterPrimeiraFotoValida(produto, produto.cores[0]).then((src) => {
        const alvo = grade.querySelector(`[data-rel-foto="${indice}"]`);
        if (src && alvo) alvo.innerHTML = `<img src="${escaparHTML(src)}" alt="" loading="lazy">`;
      });
    });
  }

  function renderizarDadosProduto() {
    const acessorio = ehAcessorio(produtoAtual);
    const nome = obterNomeProdutoParaInterface(produtoAtual);
    const quantidade = produtoAtual.cores.length;

    document.title = `${nome} — 3ZK`;
    $('#produto-tag-v57').textContent = acessorio ? obterCategoriaProduto(produtoAtual) : produtoAtual.material;
    $('#produto-nome-v57').textContent = nome;
    $('#produto-quantidade-v57').textContent = quantidade === 1
      ? `1 ${rotuloSingular(produtoAtual)} disponível`
      : `${quantidade} ${rotuloPlural(produtoAtual)} disponíveis`;
    $('#produto-escolha-rotulo-v57').textContent = acessorio ? 'Opção escolhida' : 'Cor escolhida';
    $('#produto-variacoes-titulo-v57').textContent = acessorio ? 'Escolha uma opção' : 'Escolha uma cor';
    $('#produto-busca-cor-v57').placeholder = acessorio ? 'Buscar uma opção...' : 'Buscar uma cor...';

    const seloVariacoes = $('#produto-variacoes-selo-v60');
    const contagemVariacoes = $('#produto-variacoes-contagem-v60');
    const buscaWrap = $('#produto-busca-wrap-v60');
    const secaoVariacoes = $('#produto-variacoes-v57');

    if (seloVariacoes) seloVariacoes.textContent = acessorio ? 'OPÇÕES DESTE PRODUTO' : 'CORES DESTE PRODUTO';
    if (contagemVariacoes) contagemVariacoes.textContent = quantidade === 1
      ? `1 ${rotuloSingular(produtoAtual)}`
      : `${quantidade} ${rotuloPlural(produtoAtual)}`;

    const ajudaVariacoes = $('#produto-variacoes-ajuda-v61');
    if (ajudaVariacoes) ajudaVariacoes.textContent = acessorio
      ? 'Selecione uma opção para atualizar o preço e a disponibilidade.'
      : 'Selecione uma cor para atualizar a foto, o preço e a disponibilidade.';

    if (buscaWrap) buscaWrap.hidden = quantidade <= 8;
    if (secaoVariacoes) secaoVariacoes.hidden = acessorio && quantidade === 1;

    const ajudaGaleria = $('#produto-galeria-ajuda-v57');
    if (ajudaGaleria) ajudaGaleria.hidden = true;
    $('#produto-sobre-titulo-v57').textContent = acessorio ? 'Sobre este acessório' : 'Sobre este filamento';
    $('#produto-loja-v57').href = obterLinkLoja(produtoAtual);

    const descricao = acessorio
      ? [produtoAtual.obs || '', 'Escolha a opção desejada, confira o preço e adicione ao seu pedido.'].filter(Boolean).join(' ')
      : [`Filamento ${produtoAtual.material || ''} da ${produtoAtual.marca || '3ZK'}.`, produtoAtual.obs || '', 'Escolha a cor que mais combina com seu projeto.'].filter(Boolean).join(' ');
    $('#produto-descricao-v57').textContent = descricao;

    const dados = [];
    dados.push(`<span>Marca: <strong>${escaparHTML(produtoAtual.marca || '—')}</strong></span>`);
    dados.push(`<span>${acessorio ? 'Categoria' : 'Material'}: <strong>${escaparHTML(acessorio ? obterCategoriaProduto(produtoAtual) : (produtoAtual.material || '—'))}</strong></span>`);
    if (produtoAtual.linha) dados.push(`<span>Linha: <strong>${escaparHTML(produtoAtual.linha)}</strong></span>`);
    if (produtoAtual.obs) {
      produtoAtual.obs.split('·').map((x) => x.trim()).filter(Boolean).slice(0, 4).forEach((item) => dados.push(`<span>${escaparHTML(item)}</span>`));
    }
    $('#produto-dados-v57').innerHTML = dados.join('');
  }

  function aplicarZoomLightbox() {
    const img = $('#produto-lightbox-img-v57');
    if (!img) return;

    img.style.transform = `translate3d(${panLightboxX}px, ${panLightboxY}px, 0) scale(${zoomLightbox})`;
    img.style.cursor = zoomLightbox > 1 ? (arrastandoLightbox ? 'grabbing' : 'grab') : 'zoom-in';

    const valor = $('#produto-lightbox-zoom-valor-v63');
    if (valor) valor.textContent = `${Math.round(zoomLightbox * 100)}%`;

    const menos = $('#produto-lightbox-zoom-out-v63');
    const mais = $('#produto-lightbox-zoom-in-v63');
    if (menos) menos.disabled = zoomLightbox <= 1;
    if (mais) mais.disabled = zoomLightbox >= 3;
  }

  function resetarZoomLightbox() {
    zoomLightbox = 1;
    panLightboxX = 0;
    panLightboxY = 0;
    arrastandoLightbox = false;
    aplicarZoomLightbox();
  }

  function alterarZoomLightbox(delta) {
    const proximo = Math.max(1, Math.min(3, Math.round((zoomLightbox + delta) * 100) / 100));
    if (proximo === zoomLightbox) return;
    zoomLightbox = proximo;
    if (zoomLightbox === 1) {
      panLightboxX = 0;
      panLightboxY = 0;
    }
    aplicarZoomLightbox();
  }

  function navegarLightbox(delta) {
    resetarZoomLightbox();
    avancarGaleria(delta);
  }

  function abrirLightboxProduto() {
    const item = itensGaleria[indiceGaleria];
    if (!item?.src) return;
    $('#produto-lightbox-v57').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    resetarZoomLightbox();
    renderizarLightbox();
  }

  function fecharLightboxProduto() {
    $('#produto-lightbox-v57').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    resetarZoomLightbox();
  }

  function renderizarLightbox() {
    const item = itensGaleria[indiceGaleria];
    if (!item) return;
    const img = $('#produto-lightbox-img-v57');
    if (item.src) {
      img.src = item.src;
      img.alt = `${obterNomeProdutoParaInterface(produtoAtual)} — ${item.cor.nome}`;
      img.hidden = false;
    } else {
      img.hidden = true;
    }
    $('#produto-lightbox-cor-v57').textContent = item.cor.nome;
    $('#produto-lightbox-contador-v57').textContent = `${indiceGaleria + 1} de ${itensGaleria.length}`;
    aplicarZoomLightbox();
  }

  function rolarParaGaleria() {
    const galeria = $('#produto-galeria-v57');
    if (!galeria) return;
    galeria.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bind() {
    $('#produto-foto-ant-v57').addEventListener('click', () => avancarGaleria(-1));
    $('#produto-foto-prox-v57').addEventListener('click', () => avancarGaleria(1));
    $('#produto-foto-abrir-v57').addEventListener('click', abrirLightboxProduto);

    $('#produto-adicionar-v57').addEventListener('click', (evento) => {
      adicionarAoCarrinho(produtoAtual, produtoAtual.cores[indiceVariacao], evento.currentTarget);
    });
    $('#produto-sticky-add-v57').addEventListener('click', (evento) => {
      adicionarAoCarrinho(produtoAtual, produtoAtual.cores[indiceVariacao], evento.currentTarget);
    });

    $('#produto-grade-v57').addEventListener('click', (evento) => {
      const botao = evento.target.closest('.produto-v57__variacao');
      if (!botao) return;
      const indice = Number(botao.dataset.indice);
      atualizarSelecao(indice);
      window.setTimeout(rolarParaGaleria, 40);
    });

    const busca = $('#produto-busca-cor-v57');
    busca.addEventListener('input', () => {
      buscaVariacao = busca.value.trim();
      $('#produto-limpar-cor-v57').hidden = !buscaVariacao;
      renderizarGrade();
    });
    $('#produto-limpar-cor-v57').addEventListener('click', () => {
      buscaVariacao = '';
      busca.value = '';
      $('#produto-limpar-cor-v57').hidden = true;
      renderizarGrade();
      busca.focus();
    });

    $('#produto-lightbox-fechar-v57').addEventListener('click', fecharLightboxProduto);
    $('#produto-lightbox-fundo-v57').addEventListener('click', fecharLightboxProduto);
    $('#produto-lightbox-ant-v57').addEventListener('click', () => navegarLightbox(-1));
    $('#produto-lightbox-prox-v57').addEventListener('click', () => navegarLightbox(1));
    $('#produto-lightbox-zoom-out-v63').addEventListener('click', () => alterarZoomLightbox(-0.25));
    $('#produto-lightbox-zoom-in-v63').addEventListener('click', () => alterarZoomLightbox(0.25));
    $('#produto-lightbox-zoom-reset-v63').addEventListener('click', resetarZoomLightbox);

    const fotoBotao = $('#produto-foto-abrir-v57');
    fotoBotao.addEventListener('touchstart', (evento) => {
      touchInicioX = evento.touches[0]?.clientX ?? null;
    }, { passive: true });
    fotoBotao.addEventListener('touchend', (evento) => {
      if (touchInicioX === null) return;
      const fim = evento.changedTouches[0]?.clientX ?? touchInicioX;
      if (Math.abs(fim - touchInicioX) > 45) avancarGaleria(fim < touchInicioX ? 1 : -1);
      touchInicioX = null;
    }, { passive: true });

    const palco = $('.produto-lightbox-v57__palco');
    palco.addEventListener('touchstart', (evento) => {
      touchLightboxInicioX = evento.touches[0]?.clientX ?? null;
    }, { passive: true });
    palco.addEventListener('touchend', (evento) => {
      if (touchLightboxInicioX === null) return;
      const fim = evento.changedTouches[0]?.clientX ?? touchLightboxInicioX;
      if (zoomLightbox === 1 && Math.abs(fim - touchLightboxInicioX) > 45) navegarLightbox(fim < touchLightboxInicioX ? 1 : -1);
      touchLightboxInicioX = null;
    }, { passive: true });

    palco.addEventListener('wheel', (evento) => {
      if ($('#produto-lightbox-v57').getAttribute('aria-hidden') !== 'false') return;
      evento.preventDefault();
      alterarZoomLightbox(evento.deltaY < 0 ? 0.25 : -0.25);
    }, { passive: false });

    palco.addEventListener('dblclick', (evento) => {
      if (evento.target?.id !== 'produto-lightbox-img-v57') return;
      zoomLightbox > 1 ? resetarZoomLightbox() : alterarZoomLightbox(1);
    });

    palco.addEventListener('pointerdown', (evento) => {
      if (zoomLightbox <= 1 || evento.pointerType === 'touch') return;
      arrastandoLightbox = true;
      origemArrasteX = evento.clientX;
      origemArrasteY = evento.clientY;
      origemPanX = panLightboxX;
      origemPanY = panLightboxY;
      palco.setPointerCapture?.(evento.pointerId);
      aplicarZoomLightbox();
    });

    palco.addEventListener('pointermove', (evento) => {
      if (!arrastandoLightbox) return;
      panLightboxX = origemPanX + (evento.clientX - origemArrasteX);
      panLightboxY = origemPanY + (evento.clientY - origemArrasteY);
      aplicarZoomLightbox();
    });

    const encerrarArraste = (evento) => {
      if (!arrastandoLightbox) return;
      arrastandoLightbox = false;
      palco.releasePointerCapture?.(evento.pointerId);
      aplicarZoomLightbox();
    };
    palco.addEventListener('pointerup', encerrarArraste);
    palco.addEventListener('pointercancel', encerrarArraste);

    document.addEventListener('keydown', (evento) => {
      const alvo = evento.target?.tagName?.toLowerCase();
      if (alvo === 'input' || alvo === 'textarea') return;
      if (evento.key === 'Escape' && $('#produto-lightbox-v57').getAttribute('aria-hidden') === 'false') {
        fecharLightboxProduto();
        return;
      }
      const lightboxAberto = $('#produto-lightbox-v57').getAttribute('aria-hidden') === 'false';
      if (evento.key === 'ArrowRight') lightboxAberto ? navegarLightbox(1) : avancarGaleria(1);
      if (evento.key === 'ArrowLeft') lightboxAberto ? navegarLightbox(-1) : avancarGaleria(-1);
    });

    const sticky = $('#produto-sticky-v57');
    const botaoPrincipal = $('#produto-adicionar-v57');
    const mediaMobile = window.matchMedia('(max-width: 700px)');

    if (sticky && botaoPrincipal) {
      let rafSticky = 0;
      const atualizarSticky = () => {
        rafSticky = 0;
        if (!mediaMobile.matches) {
          sticky.hidden = true;
          return;
        }
        const rect = botaoPrincipal.getBoundingClientRect();
        sticky.hidden = !(rect.bottom < 78);
      };
      const solicitarSticky = () => {
        if (rafSticky) return;
        rafSticky = requestAnimationFrame(atualizarSticky);
      };
      window.addEventListener('scroll', solicitarSticky, { passive: true });
      window.addEventListener('resize', solicitarSticky);
      if (mediaMobile.addEventListener) mediaMobile.addEventListener('change', solicitarSticky);
      solicitarSticky();
    }
  }

  async function iniciar() {
    if (iniciado || !Array.isArray(produtos) || !produtos.length) return;
    iniciado = true;

    produtoAtual = encontrarProduto();
    if (!produtoAtual) {
      $('#produto-erro-v57').hidden = false;
      return;
    }

    indiceVariacao = encontrarIndiceVariacao(produtoAtual);
    renderizarDadosProduto();
    itensGaleria = await montarGaleria(produtoAtual);
    indiceGaleria = indiceGaleriaDaVariacao(indiceVariacao, 0);
    $('#produto-v57').hidden = false;
    atualizarSelecao(indiceVariacao, { indiceGaleria });
    renderizarGrade();
    renderizarRelacionados();
    bind();
  }

  document.addEventListener('3zk:produtos-carregados', iniciar, { once: true });
  if (typeof produtos !== 'undefined' && Array.isArray(produtos) && produtos.length) iniciar();
})();
