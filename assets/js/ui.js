/* ==========================================================================
   Temeron — Peças de interface do painel
   Avisos, diálogos de confirmação e utilidades de formulário.
   ========================================================================== */

(function (global) {
  "use strict";

  var Temeron = (global.Temeron = global.Temeron || {});
  var u = Temeron.utils;

  /* --- Avisos flutuantes --------------------------------------------------- */

  function containerAvisos() {
    var container = document.getElementById("avisos");
    if (!container) {
      container = u.criarElemento("div", {
        id: "avisos",
        className: "avisos",
        role: "status",
        "aria-live": "polite",
      });
      document.body.appendChild(container);
    }
    return container;
  }

  function avisar(mensagem, tipo, duracao) {
    var aviso = u.criarElemento("p", {
      className: "aviso" + (tipo ? " aviso--" + tipo : ""),
      textContent: mensagem,
    });

    containerAvisos().appendChild(aviso);

    setTimeout(function () {
      aviso.style.opacity = "0";
      aviso.style.transition = "opacity 200ms";
      setTimeout(function () {
        if (aviso.parentNode) aviso.parentNode.removeChild(aviso);
      }, 220);
    }, duracao || (tipo === "erro" ? 5200 : 3000));
  }

  /* --- Confirmação ---------------------------------------------------------
     Usa <dialog> nativo: acessível, fecha com Esc e prende o foco sozinho.
     ---------------------------------------------------------------------- */

  function confirmar(opcoes) {
    opcoes = opcoes || {};

    return new Promise(function (resolver) {
      var dialogo = u.criarElemento("dialog", {});

      var botaoCancelar = u.criarElemento("button", {
        className: "botao botao--contorno",
        type: "button",
        textContent: opcoes.textoCancelar || "Cancelar",
      });

      var botaoConfirmar = u.criarElemento("button", {
        className: "botao " + (opcoes.perigo ? "botao--perigo" : "botao--primario"),
        type: "button",
        textContent: opcoes.textoConfirmar || "Confirmar",
      });

      dialogo.appendChild(
        u.criarElemento("h2", {
          className: "dialogo__titulo",
          textContent: opcoes.titulo || "Tem certeza?",
        })
      );

      if (opcoes.texto) {
        dialogo.appendChild(
          u.criarElemento("p", { className: "dialogo__texto", textContent: opcoes.texto })
        );
      }

      dialogo.appendChild(
        u.criarElemento("div", { className: "dialogo__acoes" }, [botaoCancelar, botaoConfirmar])
      );

      document.body.appendChild(dialogo);

      function fechar(resultado) {
        dialogo.close();
        if (dialogo.parentNode) dialogo.parentNode.removeChild(dialogo);
        resolver(resultado);
      }

      botaoCancelar.addEventListener("click", function () {
        fechar(false);
      });
      botaoConfirmar.addEventListener("click", function () {
        fechar(true);
      });
      dialogo.addEventListener("cancel", function (e) {
        e.preventDefault();
        fechar(false);
      });

      dialogo.showModal();
      botaoConfirmar.focus();
    });
  }

  /* --- Área de transferência ----------------------------------------------- */

  function copiar(texto) {
    if (global.navigator.clipboard && global.isSecureContext) {
      return global.navigator.clipboard.writeText(texto);
    }

    // Alternativa para http:// (o servidor local não é um contexto seguro)
    return new Promise(function (resolver, rejeitar) {
      var campo = u.criarElemento("textarea", { value: texto });
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      try {
        document.execCommand("copy");
        resolver();
      } catch (e) {
        rejeitar(e);
      } finally {
        document.body.removeChild(campo);
      }
    });
  }

  /* --- Proteção de rota -----------------------------------------------------
     Toda página do painel chama isto antes de mostrar qualquer coisa.
     ---------------------------------------------------------------------- */

  function exigirSessao() {
    // Em modo demonstração não há login: sessaoAtual() já devolve uma sessão
    return Temeron.dados.sessaoAtual().then(function (sessao) {
      if (!sessao) {
        var destino = global.location.pathname + global.location.search;
        global.location.replace(
          Temeron.caminhoBase() + "admin/?retorno=" + encodeURIComponent(destino)
        );
        return null;
      }
      return sessao;
    });
  }

  /* --- Estado de botão durante operações assíncronas ------------------------ */

  function ocupar(botao, textoOcupado) {
    var original = botao.textContent;
    botao.disabled = true;
    botao.dataset.textoOriginal = original;
    if (textoOcupado) botao.textContent = textoOcupado;

    return function liberar() {
      botao.disabled = false;
      botao.textContent = botao.dataset.textoOriginal || original;
    };
  }

  /* --- URL pública de uma proposta ----------------------------------------- */

  function urlPublica(slug) {
    return global.location.origin + "/p/" + encodeURIComponent(slug);
  }

  Temeron.ui = {
    avisar: avisar,
    confirmar: confirmar,
    copiar: copiar,
    exigirSessao: exigirSessao,
    ocupar: ocupar,
    urlPublica: urlPublica,
  };
})(window);
