/* ==========================================================================
   Temeron — Utilitários compartilhados
   ========================================================================== */

(function (global) {
  "use strict";

  var Temeron = (global.Temeron = global.Temeron || {});

  /* --- Raiz do site --------------------------------------------------------
     A proposta é servida em /p/slug por reescrita de URL, então caminhos
     relativos ("dados/x.json") apontariam para o lugar errado. Descobrimos a
     raiz a partir do endereço deste próprio script, que sempre mora em
     <raiz>/assets/js/utils.js.
     ---------------------------------------------------------------------- */

  var raiz = (function () {
    var script = document.currentScript;
    if (script && script.src) {
      var marcador = script.src.indexOf("assets/js/");
      if (marcador !== -1) return script.src.slice(0, marcador);
    }
    return "/";
  })();

  Temeron.caminhoBase = function () {
    return raiz;
  };

  /* --- Segurança ---------------------------------------------------------
     Todo texto vindo do banco passa por aqui antes de virar HTML. Evita que
     um caractere solto (< > &) quebre o layout ou injete marcação.
     -------------------------------------------------------------------- */

  function escaparHtml(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* --- Texto -------------------------------------------------------------- */

  function slugificar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove os acentos separados pelo NFD
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  // Sufixo aleatório: impede que alguém adivinhe /p/nome-do-concorrente
  function sufixoAleatorio(tamanho) {
    var alfabeto = "abcdefghijkmnpqrstuvwxyz23456789"; // sem 0/o/1/l
    var bytes = new Uint8Array(tamanho || 6);
    global.crypto.getRandomValues(bytes);
    var saida = "";
    for (var i = 0; i < bytes.length; i++) {
      saida += alfabeto[bytes[i] % alfabeto.length];
    }
    return saida;
  }

  function gerarSlug(nomeCliente) {
    var base = slugificar(nomeCliente) || "proposta";
    return base + "-" + sufixoAleatorio(6);
  }

  /* --- Números e datas ---------------------------------------------------- */

  var formatadorMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

  function formatarMoeda(valor) {
    var numero = Number(valor);
    if (!isFinite(numero)) return "";
    return formatadorMoeda.format(numero);
  }

  // Divide "R$ 1.500,00" em partes para o layout do preço nos cards
  function partesMoeda(valor) {
    var numero = Number(valor);
    if (!isFinite(numero)) return null;
    return {
      simbolo: "R$",
      inteiro: new Intl.NumberFormat("pt-BR").format(Math.floor(numero)),
      centavos: String(Math.round((numero - Math.floor(numero)) * 100)).padStart(2, "0"),
    };
  }

  // Aceita "2026-07-19" (banco) e devolve um Date em horário local.
  // Usar new Date("2026-07-19") daria UTC e poderia voltar um dia no Brasil.
  function paraData(iso) {
    if (!iso) return null;
    var partes = String(iso).slice(0, 10).split("-");
    if (partes.length !== 3) return null;
    var d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function formatarData(iso, estilo) {
    var d = paraData(iso);
    if (!d) return "";
    if (estilo === "extenso") {
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    }
    return d.toLocaleDateString("pt-BR"); // 19/07/2026
  }

  function inicioDoDia(data) {
    var d = new Date(data.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Dias restantes até a validade. Negativo = já venceu.
  function diasAte(iso) {
    var alvo = paraData(iso);
    if (!alvo) return null;
    var hoje = inicioDoDia(new Date());
    var diff = inicioDoDia(alvo).getTime() - hoje.getTime();
    return Math.round(diff / 86400000);
  }

  function estaVencida(iso) {
    var dias = diasAte(iso);
    return dias !== null && dias < 0;
  }

  /* --- WhatsApp ----------------------------------------------------------- */

  function linkWhatsapp(numero, mensagem) {
    var digitos = String(numero || "").replace(/\D/g, "");
    if (!digitos) return "";
    var base = "https://wa.me/" + digitos;
    return mensagem ? base + "?text=" + encodeURIComponent(mensagem) : base;
  }

  /* --- DOM ---------------------------------------------------------------- */

  function $(seletor, escopo) {
    return (escopo || document).querySelector(seletor);
  }

  function $$(seletor, escopo) {
    return Array.prototype.slice.call((escopo || document).querySelectorAll(seletor));
  }

  function criarElemento(tag, atributos, filhos) {
    var el = document.createElement(tag);
    Object.keys(atributos || {}).forEach(function (chave) {
      var valor = atributos[chave];
      if (valor === null || valor === undefined || valor === false) return;
      if (chave === "className") el.className = valor;
      else if (chave === "textContent") el.textContent = valor;
      else if (chave === "innerHTML") el.innerHTML = valor;
      else if (chave.indexOf("on") === 0 && typeof valor === "function") {
        el.addEventListener(chave.slice(2).toLowerCase(), valor);
      } else el.setAttribute(chave, valor);
    });
    (filhos || []).forEach(function (filho) {
      if (filho === null || filho === undefined) return;
      el.appendChild(typeof filho === "string" ? document.createTextNode(filho) : filho);
    });
    return el;
  }

  /* --- Diversos ------------------------------------------------------------ */

  function debounce(fn, espera) {
    var timer = null;
    return function () {
      var contexto = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(contexto, args);
      }, espera || 250);
    };
  }

  function clonar(valor) {
    return JSON.parse(JSON.stringify(valor));
  }

  Temeron.utils = {
    escaparHtml: escaparHtml,
    slugificar: slugificar,
    sufixoAleatorio: sufixoAleatorio,
    gerarSlug: gerarSlug,
    formatarMoeda: formatarMoeda,
    partesMoeda: partesMoeda,
    formatarData: formatarData,
    paraData: paraData,
    diasAte: diasAte,
    estaVencida: estaVencida,
    linkWhatsapp: linkWhatsapp,
    $: $,
    $$: $$,
    criarElemento: criarElemento,
    debounce: debounce,
    clonar: clonar,
  };
})(window);
