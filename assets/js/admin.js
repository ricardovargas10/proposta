/* ==========================================================================
   Temeron — Painel: login e listagem de propostas
   ========================================================================== */

(function (global) {
  "use strict";

  var Temeron = global.Temeron;
  var u = Temeron.utils;
  var ui = Temeron.ui;
  var dados = Temeron.dados;
  var esc = u.escaparHtml;

  var filtros = { status: "todas", busca: "" };

  /* --- Troca de telas ------------------------------------------------------ */

  function mostrarTela(qual) {
    ["login", "lista", "config"].forEach(function (nome) {
      u.$("#tela-" + nome).hidden = nome !== qual;
    });
  }

  /* ======================================================================
     Login
     ====================================================================== */

  function ligarLogin() {
    var form = u.$("#form-login");
    var caixaErro = u.$("#login-erro");

    form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      caixaErro.hidden = true;

      var email = u.$("#email").value.trim();
      var senha = u.$("#senha").value;

      if (!email || !senha) {
        caixaErro.textContent = "Preencha e-mail e senha.";
        caixaErro.hidden = false;
        return;
      }

      var liberar = ui.ocupar(u.$("#botao-entrar"), "Entrando…");

      dados
        .entrar(email, senha)
        .then(function () {
          liberar();
          irParaDestinoOuLista();
        })
        .catch(function (erro) {
          liberar();
          caixaErro.textContent = erro.message || "Não foi possível entrar.";
          caixaErro.hidden = false;
        });
    });
  }

  // Depois do login, volta para a página que o usuário tentou abrir
  function irParaDestinoOuLista() {
    var retorno = new URLSearchParams(global.location.search).get("retorno");
    if (retorno && retorno.indexOf("/") === 0 && retorno.indexOf("//") !== 0) {
      global.location.replace(retorno);
      return;
    }
    mostrarTela("lista");
    carregarLista();
  }

  function ligarSair() {
    u.$("#botao-sair").addEventListener("click", function () {
      ui.confirmar({
        titulo: "Sair do painel?",
        texto: "Você vai precisar entrar de novo com e-mail e senha.",
        textoConfirmar: "Sair",
      }).then(function (confirmado) {
        if (!confirmado) return;
        dados.sair().then(function () {
          global.location.reload();
        });
      });
    });
  }

  /* ======================================================================
     Listagem
     ====================================================================== */

  function ligarFiltros() {
    u.$$(".aba").forEach(function (aba) {
      aba.addEventListener("click", function () {
        u.$$(".aba").forEach(function (outra) {
          outra.setAttribute("aria-selected", String(outra === aba));
        });
        filtros.status = aba.dataset.status;
        carregarLista();
      });
    });

    u.$("#busca").addEventListener(
      "input",
      u.debounce(function (evento) {
        filtros.busca = evento.target.value.trim();
        carregarLista();
      }, 320)
    );
  }

  function carregarLista() {
    var container = u.$("#lista");
    var erro = u.$("#lista-erro");

    erro.hidden = true;
    container.innerHTML = '<p class="pagina__subtitulo">Carregando…</p>';

    dados
      .listar(filtros)
      .then(function (linhas) {
        desenharLista(linhas);
      })
      .catch(function (e) {
        container.innerHTML = "";
        erro.textContent = e.message || "Não foi possível carregar as propostas.";
        erro.hidden = false;
        u.$("#resumo-lista").textContent = "";
      });
  }

  function desenharLista(linhas) {
    var container = u.$("#lista");
    var resumo = u.$("#resumo-lista");

    if (!linhas.length) {
      container.innerHTML =
        '<div class="vazio">' +
        '<h2 class="vazio__titulo">' +
        (filtros.busca || filtros.status !== "todas"
          ? "Nada encontrado com esse filtro"
          : "Nenhuma proposta ainda") +
        "</h2>" +
        '<p class="vazio__texto">' +
        (filtros.busca || filtros.status !== "todas"
          ? "Tente outro termo ou volte para “Todas”."
          : "Crie a primeira proposta: preencha os dados do cliente, monte os pacotes e publique. O link fica pronto na hora.") +
        "</p>" +
        '<a class="botao botao--primario" href="/admin/editor.html">Nova proposta</a>' +
        "</div>";
      resumo.textContent = "";
      return;
    }

    var publicadas = linhas.filter(function (l) {
      return l.status === "publicada";
    }).length;

    resumo.textContent =
      linhas.length +
      (linhas.length === 1 ? " proposta" : " propostas") +
      (publicadas ? " · " + publicadas + " no ar" : "");

    container.innerHTML = linhas.map(itemHtml).join("");
    ligarAcoesItem();
  }

  function itemHtml(linha) {
    var vencida = linha.status === "publicada" && u.estaVencida(linha.data_validade);
    var dias = u.diasAte(linha.data_validade);

    var selo = vencida
      ? '<span class="selo selo--vencida">Vencida</span>'
      : '<span class="selo selo--' + esc(linha.status) + '">' + esc(rotuloStatus(linha.status)) + "</span>";

    var dadosLinha = [];

    if (linha.data_envio) {
      dadosLinha.push("Enviada em <strong>" + esc(u.formatarData(linha.data_envio)) + "</strong>");
    }
    if (linha.data_validade) {
      var textoValidade = esc(u.formatarData(linha.data_validade));
      if (dias !== null && dias >= 0 && linha.status === "publicada") {
        textoValidade += " (" + dias + (dias === 1 ? " dia" : " dias") + ")";
      }
      dadosLinha.push("Válida até <strong>" + textoValidade + "</strong>");
    }
    if (linha.atualizado_em) {
      dadosLinha.push(
        "Editada em <strong>" + esc(u.formatarData(linha.atualizado_em)) + "</strong>"
      );
    }

    var acoes =
      '<a class="botao botao--contorno" href="/admin/editor.html?id=' +
      esc(linha.id) +
      '">Editar</a>';

    if (linha.status === "publicada") {
      acoes +=
        '<a class="botao botao--fantasma" href="' +
        esc(ui.urlPublica(linha.slug)) +
        '" target="_blank" rel="noopener">Abrir</a>' +
        '<button class="botao botao--fantasma" type="button" data-acao="copiar" data-slug="' +
        esc(linha.slug) +
        '">Copiar link</button>';
    }

    acoes +=
      '<button class="botao botao--fantasma" type="button" data-acao="duplicar" data-id="' +
      esc(linha.id) +
      '">Duplicar</button>' +
      '<button class="botao botao--fantasma" type="button" data-acao="excluir" data-id="' +
      esc(linha.id) +
      '" data-nome="' +
      esc(linha.cliente_nome || "sem nome") +
      '">Excluir</button>';

    return (
      '<article class="item">' +
      '<div class="item__principal">' +
      '<h2 class="item__cliente">' +
      esc(linha.cliente_nome || "Sem nome") +
      selo +
      "</h2>" +
      '<div class="item__dados">' +
      dadosLinha
        .map(function (d) {
          return "<span>" + d + "</span>";
        })
        .join("") +
      "</div>" +
      "</div>" +
      '<div class="item__acoes">' +
      acoes +
      "</div>" +
      "</article>"
    );
  }

  function rotuloStatus(status) {
    return { rascunho: "Rascunho", publicada: "No ar", arquivada: "Arquivada" }[status] || status;
  }

  /* --- Ações de cada item -------------------------------------------------- */

  function ligarAcoesItem() {
    u.$$("[data-acao]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        var acao = botao.dataset.acao;
        if (acao === "copiar") return acaoCopiar(botao);
        if (acao === "duplicar") return acaoDuplicar(botao);
        if (acao === "excluir") return acaoExcluir(botao);
      });
    });
  }

  function acaoCopiar(botao) {
    ui.copiar(ui.urlPublica(botao.dataset.slug))
      .then(function () {
        ui.avisar("Link copiado. É só colar no WhatsApp do cliente.", "sucesso");
      })
      .catch(function () {
        ui.avisar("Não consegui copiar. Copie manualmente da barra de endereço.", "erro");
      });
  }

  function acaoDuplicar(botao) {
    var liberar = ui.ocupar(botao, "Duplicando…");

    dados
      .duplicar(botao.dataset.id)
      .then(function (nova) {
        liberar();
        ui.avisar("Cópia criada como rascunho.", "sucesso");
        global.location.href = "/admin/editor.html?id=" + nova.id;
      })
      .catch(function (e) {
        liberar();
        ui.avisar(e.message || "Não consegui duplicar.", "erro");
      });
  }

  function acaoExcluir(botao) {
    ui.confirmar({
      titulo: "Excluir a proposta de " + botao.dataset.nome + "?",
      texto:
        "O link que o cliente recebeu vai parar de funcionar imediatamente. Não dá para desfazer.",
      textoConfirmar: "Excluir",
      perigo: true,
    }).then(function (confirmado) {
      if (!confirmado) return;

      dados
        .excluir(botao.dataset.id)
        .then(function () {
          ui.avisar("Proposta excluída.", "sucesso");
          carregarLista();
        })
        .catch(function (e) {
          ui.avisar(e.message || "Não consegui excluir.", "erro");
        });
    });
  }

  /* ======================================================================
     Início
     ====================================================================== */

  function iniciar() {
    ligarLogin();
    ligarSair();
    ligarFiltros();

    var demonstracao = dados.modo() === "local";

    // Sem Supabase não há login nem botão de sair: tudo mora neste navegador
    u.$("#faixa-demo").hidden = !demonstracao;
    u.$("#botao-sair").hidden = demonstracao;

    dados
      .sessaoAtual()
      .then(function (sessao) {
        if (sessao) {
          mostrarTela("lista");
          carregarLista();
        } else {
          mostrarTela("login");
          u.$("#email").focus();
        }
      })
      .catch(function (erro) {
        u.$("#config-texto").textContent = erro.message;
        mostrarTela("config");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})(window);
