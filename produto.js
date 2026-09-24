/* Compatibilidade com links antigos: produto.html?produto=slug&cor=slug
   agora abre o mesmo produto e a mesma variação na ficha do catálogo. */
(() => {
  "use strict";
  const origem = new URLSearchParams(window.location.search);
  const destino = new URLSearchParams();
  ["produto", "cor"].forEach((chave) => {
    const valor = origem.get(chave);
    if (valor) destino.set(chave, valor);
  });
  const url = `./${destino.toString() ? `?${destino}` : ""}`;
  const link = document.getElementById("linkCatalogo");
  if (link) link.href = url;
  window.location.replace(url);
})();
