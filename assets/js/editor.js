/* ==========================================================================
   Temeron — Editor de proposta
   --------------------------------------------------------------------------
   Uma única fonte de verdade: o objeto "proposta". Os campos declaram para
   onde escrevem através de data-caminho="cliente.nome" e um só ouvinte cuida
   de todos.

   O painel edita apenas o que muda de cliente para cliente. Os blocos
   institucionais (Temeron, serviços, método, bônus, cases, depoimentos) vêm
   prontos de assets/js/modelo.js e são gravados junto com a proposta — assim,
   mudar o padrão no futuro não altera nada que já foi enviado.
   ========================================================================== */

(function (global) {
  "use strict";

  var Temeron = global.Temeron;
  var u = Temeron.utils;
  var ui = Temeron.ui;
  var dados = Temeron.dados;
  var modelo = Temeron.modelo;
  var esc = u.escaparHtml;

  var proposta = null;
  var sujo = false;

  /* ======================================================================
     Leitura e escrita por caminho ("pacotes.0.itens.2.valor")
     ====================================================================== */

  function lerCaminho(objeto, caminho) {
    return caminho.split(".").reduce(function (atual, chave) {
      if (atual === null || atual === undefined) return undefined;
      return atual[chave];
    }, objeto);
  }

  function escreverCaminho(objeto, caminho, valor) {
    var chaves = caminho.split(".");
    var ultima = chaves.pop();
    var alvo = chaves.reduce(function (atual, chave) {
      if (atual[chave] === null || atual[chave] === undefined) {
        atual[chave] = /^\d+$/.test(chave) ? [] : {};
      }
      return atual[chave];
    }, objeto);
    alvo[ultima] = valor;
  }

  /* ======================================================================
     Estado de alterações
     ====================================================================== */

  function marcarSujo() {
    sujo = true;
    u.$("#estado-salvamento").textContent = "Alterações não salvas.";
  }

  function marcarLimpo(mensagem) {
    sujo = false;
    u.$("#estado-salvamento").textContent = mensagem || "Tudo salvo.";
  }

  /* ======================================================================
     Campos
     ====================================================================== */

  function ligarCampos() {
    var form = u.$("#form-proposta");

    // A gravação é feita pelos botões; sem isto, um Enter recarregaria a página
    form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      salvar(false, u.$("#salvar"));
    });

    form.addEventListener("input", function (evento) {
      var campo = evento.target.closest("[data-caminho]");
      if (!campo) return;

      var caminho = campo.dataset.caminho;
      var valor = campo.type === "checkbox" ? campo.checked : campo.value;

      if (campo.dataset.numero === "sim") {
        var limpo = String(valor).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
        valor = limpo === "" ? null : Number(limpo);
      }

      escreverCaminho(proposta, caminho, valor);
      marcarSujo();

      if (caminho === "slug" || caminho === "cliente.nome") atualizarLinkPublico();
      if (caminho === "cliente.nome" || caminho === "cliente.artigo") atualizarEco();
    });

    form.addEventListener("change", function (evento) {
      var campo = evento.target.closest("[data-caminho]");
      if (campo && campo.tagName === "SELECT") {
        escreverCaminho(proposta, campo.dataset.caminho, campo.value);
        marcarSujo();
        if (campo.dataset.caminho === "cliente.artigo") atualizarEco();
      }
    });

    global.addEventListener("beforeunload", function (evento) {
      if (!sujo) return;
      evento.preventDefault();
      evento.returnValue = "";
    });
  }

  function preencherCamposEstaticos() {
    u.$$("#form-proposta [data-caminho]").forEach(function (campo) {
      if (campo.closest("[data-dinamico]")) return;

      var valor = lerCaminho(proposta, campo.dataset.caminho);
      if (valor === null || valor === undefined) valor = "";

      if (campo.type === "checkbox") campo.checked = Boolean(valor);
      else campo.value = valor;
    });
  }

  // Mostra ao vivo como o título do diagnóstico vai ficar
  function atualizarEco() {
    var eco = u.$("#eco-cliente");
    if (!eco) return;

    var artigo = proposta.cliente.artigo;
    var nome = proposta.cliente.nome || "a empresa";
    eco.textContent = artigo ? artigo + " " + nome : nome;
  }

  /* ======================================================================
     Repetidores de texto simples
     ====================================================================== */

  function desenharRepetidoresTexto() {
    u.$$("[data-lista]").forEach(function (container) {
      var caminho = container.dataset.lista;
      var lista = lerCaminho(proposta, caminho) || [];
      var longo = container.dataset.tipo === "texto-longo";

      container.innerHTML = lista
        .map(function (valor, indice) {
          var entrada = longo
            ? '<textarea class="area" data-caminho="' +
              esc(caminho + "." + indice) +
              '" rows="4">' +
              esc(valor) +
              "</textarea>"
            : '<input class="entrada" type="text" data-caminho="' +
              esc(caminho + "." + indice) +
              '" value="' +
              esc(valor) +
              '">';

          return (
            '<div class="repetidor__linha">' +
            entrada +
            '<button class="remover" type="button" data-remover="' +
            esc(caminho) +
            '" data-indice="' +
            indice +
            '" aria-label="Remover">&times;</button>' +
            "</div>"
          );
        })
        .join("");
    });
  }

  function ligarBotoesLista() {
    u.$("#form-proposta").addEventListener("click", function (evento) {
      var adicionar = evento.target.closest("[data-adicionar]");
      if (adicionar) {
        var caminhoAdd = adicionar.dataset.adicionar;
        var listaAdd = lerCaminho(proposta, caminhoAdd);
        if (!Array.isArray(listaAdd)) {
          escreverCaminho(proposta, caminhoAdd, []);
          listaAdd = lerCaminho(proposta, caminhoAdd);
        }
        listaAdd.push("");
        desenharRepetidoresTexto();
        marcarSujo();
        return;
      }

      var remover = evento.target.closest("[data-remover]");
      if (remover) {
        var listaRem = lerCaminho(proposta, remover.dataset.remover) || [];
        listaRem.splice(Number(remover.dataset.indice), 1);
        desenharRepetidoresTexto();
        marcarSujo();
      }
    });
  }

  /* ======================================================================
     Redes sociais
     ====================================================================== */

  function desenharRedes() {
    var container = u.$("#redes");

    container.innerHTML = modelo.REDES_CATALOGO.map(function (rede) {
      var marcada = proposta.redes.indexOf(rede.id) !== -1;
      return (
        '<label class="marcador">' +
        '<input type="checkbox" value="' +
        esc(rede.id) +
        '"' +
        (marcada ? " checked" : "") +
        ">" +
        esc(rede.nome) +
        "</label>"
      );
    }).join("");

    container.addEventListener("change", function (evento) {
      var caixa = evento.target;
      if (caixa.type !== "checkbox") return;

      var posicao = proposta.redes.indexOf(caixa.value);
      if (caixa.checked && posicao === -1) proposta.redes.push(caixa.value);
      if (!caixa.checked && posicao !== -1) proposta.redes.splice(posicao, 1);

      marcarSujo();
    });
  }

  /* ======================================================================
     Pacotes
     ====================================================================== */

  function desenharPacotes() {
    var container = u.$("#pacotes");

    if (!proposta.pacotes.length) {
      container.innerHTML =
        '<p class="nota nota--info">Nenhum pacote ainda. Adicione ao menos um — é o que o ' +
        "cliente usa para decidir e chamar você no WhatsApp.</p>";
      return;
    }

    container.innerHTML = proposta.pacotes.map(pacoteHtml).join("");
  }

  function pacoteHtml(pacote, indice) {
    var base = "pacotes." + indice;

    var resumo = (pacote.resumo || [])
      .map(function (linha, i) {
        return (
          '<div class="repetidor__linha">' +
          '<input class="entrada entrada--curta" type="text" placeholder="8x" value="' +
          esc(linha.valor) +
          '" data-caminho="' +
          base +
          ".resumo." +
          i +
          '.valor" aria-label="Quantidade">' +
          '<input class="entrada" type="text" placeholder="postagens mensais" value="' +
          esc(linha.rotulo) +
          '" data-caminho="' +
          base +
          ".resumo." +
          i +
          '.rotulo" aria-label="Do que">' +
          '<button class="remover" type="button" data-pacote-acao="remover-resumo" ' +
          'data-pacote="' + indice + '" data-indice="' + i + '" aria-label="Remover">&times;</button>' +
          "</div>"
        );
      })
      .join("");

    // Checklist: marcado = entra no pacote; desmarcado = aparece acinzentado
    var itens = (pacote.itens || [])
      .map(function (item, i) {
        return (
          '<div class="item-pacote' + (item.incluso ? "" : " item-pacote--fora") + '">' +
          '<label class="item-pacote__marca">' +
          '<input type="checkbox" data-incluso="' + indice + '" data-indice="' + i + '"' +
          (item.incluso ? " checked" : "") +
          '><span class="item-pacote__label">' +
          esc(item.label) +
          "</span></label>" +
          '<input class="entrada" type="text" value="' +
          esc(item.valor) +
          '" data-caminho="' +
          base +
          ".itens." +
          i +
          '.valor" placeholder="Sim" aria-label="Quantidade de ' +
          esc(item.label) +
          '"' +
          (item.incluso ? "" : " disabled") +
          ">" +
          '<button class="remover" type="button" data-pacote-acao="remover-item" ' +
          'data-pacote="' + indice + '" data-indice="' + i + '" aria-label="Remover linha">&times;</button>' +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="pacote-editor" data-dinamico="pacote">' +
      '<div class="pacote-editor__topo">' +
      '<span class="pacote-editor__nome">' +
      esc(pacote.nome || "Pacote " + (indice + 1)) +
      "</span>" +
      '<button class="remover" type="button" data-pacote-acao="remover-pacote" data-pacote="' +
      indice +
      '" aria-label="Remover pacote">&times;</button>' +
      "</div>" +

      '<div class="campos campos--3">' +
      '<div class="campo">' +
      '<label class="campo__rotulo">Nome</label>' +
      '<input class="entrada" type="text" value="' + esc(pacote.nome) +
      '" data-caminho="' + base + '.nome" placeholder="Standard">' +
      "</div>" +
      '<div class="campo">' +
      '<label class="campo__rotulo">Preço (R$)</label>' +
      '<input class="entrada" type="text" inputmode="decimal" value="' +
      (pacote.preco === null || pacote.preco === undefined ? "" : esc(pacote.preco)) +
      '" data-caminho="' + base + '.preco" data-numero="sim" placeholder="800">' +
      "</div>" +
      '<div class="campo">' +
      '<label class="campo__rotulo">Período</label>' +
      '<input class="entrada" type="text" value="' + esc(pacote.periodo) +
      '" data-caminho="' + base + '.periodo" placeholder="/mensal">' +
      "</div>" +
      "</div>" +

      '<div class="campo">' +
      '<label class="marcador">' +
      '<input type="checkbox" data-destaque="' + indice + '"' +
      (pacote.destaque ? " checked" : "") +
      ">Destacar como recomendado</label>" +
      "</div>" +

      '<div class="campo">' +
      '<span class="campo__rotulo">Quantidades em destaque</span>' +
      '<span class="campo__dica">Os números grandes do card, tipo "8x postagens mensais".</span>' +
      '<div class="repetidor">' + resumo + "</div>" +
      '<button class="botao botao--contorno" type="button" data-pacote-acao="adicionar-resumo" ' +
      'data-pacote="' + indice + '">+ Quantidade</button>' +
      "</div>" +

      '<div class="campo">' +
      '<span class="campo__rotulo">O que entra neste pacote</span>' +
      '<span class="campo__dica">Marque o que está incluso. O campo ao lado é a quantidade ' +
      '("4x") — em branco vira "Sim".</span>' +
      '<div class="itens-pacote">' + itens + "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function ligarPacotes() {
    u.$("#adicionar-pacote").addEventListener("click", function () {
      var novo = modelo.criarPacoteVazio("Novo pacote");
      var referencia = proposta.pacotes[0];

      // Nasce com as mesmas linhas dos outros, para a comparação bater
      var rotulos = referencia
        ? referencia.itens.map(function (i) {
            return i.label;
          })
        : modelo.ITENS_PACOTE_CATALOGO;

      novo.itens = rotulos.map(function (label) {
        return { label: label, incluso: false, valor: "" };
      });

      proposta.pacotes.push(novo);
      desenharPacotes();
      marcarSujo();
    });

    // Uma linha nova precisa existir em todos os pacotes, senão a comparação
    // entre eles fica desalinhada
    u.$("#adicionar-linha-todos").addEventListener("click", function () {
      if (!proposta.pacotes.length) {
        ui.avisar("Crie um pacote primeiro.", "erro");
        return;
      }

      var label = global.prompt("Nome da nova linha (ex.: Reels editado até 60s)");
      if (!label || !label.trim()) return;

      proposta.pacotes.forEach(function (pacote) {
        pacote.itens.push({ label: label.trim(), incluso: false, valor: "" });
      });

      desenharPacotes();
      marcarSujo();
    });

    u.$("#pacotes").addEventListener("click", function (evento) {
      var botao = evento.target.closest("[data-pacote-acao]");
      if (!botao) return;

      var indice = Number(botao.dataset.pacote);
      var pacote = proposta.pacotes[indice];
      var acao = botao.dataset.pacoteAcao;

      if (acao === "remover-pacote") proposta.pacotes.splice(indice, 1);
      else if (acao === "adicionar-resumo") pacote.resumo.push({ valor: "", rotulo: "" });
      else if (acao === "remover-resumo") pacote.resumo.splice(Number(botao.dataset.indice), 1);
      else if (acao === "remover-item") {
        // Remove a mesma linha de todos, para não desalinhar a comparação
        var alvo = pacote.itens[Number(botao.dataset.indice)];
        proposta.pacotes.forEach(function (outro) {
          outro.itens = outro.itens.filter(function (i) {
            return i.label !== alvo.label;
          });
        });
      }

      desenharPacotes();
      marcarSujo();
    });

    u.$("#pacotes").addEventListener("change", function (evento) {
      // Destaque é exclusivo
      var destaque = evento.target.closest("[data-destaque]");
      if (destaque) {
        var escolhido = Number(destaque.dataset.destaque);
        proposta.pacotes.forEach(function (p, i) {
          p.destaque = destaque.checked && i === escolhido;
        });
        desenharPacotes();
        marcarSujo();
        return;
      }

      // Checklist de itens
      var incluso = evento.target.closest("[data-incluso]");
      if (incluso) {
        var pacote = proposta.pacotes[Number(incluso.dataset.incluso)];
        var item = pacote.itens[Number(incluso.dataset.indice)];
        item.incluso = incluso.checked;
        if (item.incluso && !item.valor) item.valor = "Sim";
        if (!item.incluso) item.valor = "";
        desenharPacotes();
        marcarSujo();
      }
    });

    // Mantém o título do card em dia enquanto se digita
    u.$("#pacotes").addEventListener("input", function (evento) {
      var campo = evento.target.closest("[data-caminho]");
      if (!campo || !/^pacotes\.\d+\.nome$/.test(campo.dataset.caminho)) return;
      campo.closest(".pacote-editor").querySelector(".pacote-editor__nome").textContent =
        campo.value || "Pacote";
    });
  }

  /* ======================================================================
     Publicação
     ====================================================================== */

  function atualizarLinkPublico() {
    var slug = proposta.slug || "";

    u.$("#link-publico").textContent = slug
      ? ui.urlPublica(slug)
      : "(clique em Gerar para criar o endereço)";
    u.$("#abrir-link").href = slug ? ui.urlPublica(slug) : "#";
    u.$("#abrir-link").setAttribute("aria-disabled", slug ? "false" : "true");
  }

  function ligarPublicacao() {
    u.$("#gerar-slug").addEventListener("click", function () {
      proposta.slug = u.gerarSlug(proposta.cliente.nome || "proposta");
      u.$("#slug").value = proposta.slug;
      atualizarLinkPublico();
      marcarSujo();
    });

    u.$("#copiar-link").addEventListener("click", function () {
      if (!proposta.slug) {
        ui.avisar("Gere o endereço antes de copiar.", "erro");
        return;
      }
      ui.copiar(ui.urlPublica(proposta.slug))
        .then(function () {
          ui.avisar("Link copiado.", "sucesso");
        })
        .catch(function () {
          ui.avisar("Não consegui copiar automaticamente.", "erro");
        });
    });
  }

  /* ======================================================================
     Validação e gravação
     ====================================================================== */

  function validar() {
    var problemas = [];

    var campoNome = u.$("#erro-cliente-nome");
    if (!proposta.cliente.nome.trim()) {
      problemas.push("Informe o nome do cliente.");
      campoNome.textContent = "Obrigatório.";
      campoNome.hidden = false;
    } else {
      campoNome.hidden = true;
    }

    var campoSlug = u.$("#erro-slug");
    if (!proposta.slug.trim()) {
      problemas.push("Gere o endereço do link.");
      campoSlug.textContent = "Obrigatório. Clique em “Gerar”.";
      campoSlug.hidden = false;
    } else if (!/^[a-z0-9-]+$/.test(proposta.slug)) {
      problemas.push("O endereço só pode ter letras minúsculas, números e hífen.");
      campoSlug.textContent = "Use apenas letras minúsculas, números e hífen.";
      campoSlug.hidden = false;
    } else {
      campoSlug.hidden = true;
    }

    if (proposta.status === "publicada" && !proposta.pacotes.length) {
      problemas.push("Adicione ao menos um pacote antes de publicar.");
    }

    return problemas;
  }

  function salvar(publicar, botao) {
    if (publicar) {
      proposta.status = "publicada";
      u.$("#status").value = "publicada";
    }

    var problemas = validar();
    if (problemas.length) {
      ui.avisar(problemas[0], "erro");
      return;
    }

    var liberar = ui.ocupar(botao, "Salvando…");

    var limpa = modelo.normalizar(proposta);
    limpa.id = proposta.id;
    limpa.slug = proposta.slug;
    limpa.status = proposta.status;

    dados
      .salvar(limpa)
      .then(function (salva) {
        liberar();
        proposta.id = salva.id;
        marcarLimpo(publicar ? "Publicada. O link já está no ar." : "Salvo em " + agora() + ".");
        ui.avisar(
          publicar ? "Proposta publicada. Pode enviar o link." : "Proposta salva.",
          "sucesso"
        );

        if (global.location.search.indexOf(salva.id) === -1) {
          global.history.replaceState({}, "", "/admin/editor.html?id=" + salva.id);
        }

        u.$("#contexto").textContent = proposta.cliente.nome || "Proposta";
      })
      .catch(function (erro) {
        liberar();
        ui.avisar(erro.message || "Não consegui salvar.", "erro");
      });
  }

  function agora() {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function ligarSalvamento() {
    u.$("#salvar").addEventListener("click", function () {
      salvar(false, this);
    });

    u.$("#salvar-publicar").addEventListener("click", function () {
      var botao = this;
      ui.confirmar({
        titulo: "Publicar a proposta?",
        texto: "O link passa a funcionar para qualquer pessoa que o receber. Confira os valores.",
        textoConfirmar: "Publicar",
      }).then(function (confirmado) {
        if (confirmado) salvar(true, botao);
      });
    });

    global.addEventListener("keydown", function (evento) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "s") {
        evento.preventDefault();
        salvar(false, u.$("#salvar"));
      }
    });
  }

  /* ======================================================================
     Navegação lateral
     ====================================================================== */

  function ligarNavegacao() {
    var itens = u.$$(".editor__nav-item");
    if (!("IntersectionObserver" in global)) return;

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          itens.forEach(function (item) {
            item.setAttribute(
              "aria-current",
              String(item.getAttribute("href") === "#" + entrada.target.id)
            );
          });
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    u.$$(".bloco").forEach(function (bloco) {
      observador.observe(bloco);
    });
  }

  /* ======================================================================
     Abertura
     ====================================================================== */

  function desenharTudo() {
    preencherCamposEstaticos();
    desenharRepetidoresTexto();
    desenharRedes();
    desenharPacotes();
    atualizarLinkPublico();
    atualizarEco();
  }

  function mostrarErro(mensagem) {
    u.$("#pagina").hidden = true;
    u.$("#estado-texto").textContent = "";
    var caixa = u.$("#estado-erro");
    caixa.textContent = mensagem;
    caixa.hidden = false;
  }

  function abrir(carregada) {
    proposta = carregada;

    u.$("#pagina-estado").hidden = true;
    u.$("#pagina").hidden = false;
    u.$("#faixa-demo").hidden = dados.modo() !== "local";
    u.$("#contexto").textContent = proposta.cliente.nome || "Nova proposta";

    ligarCampos();
    ligarBotoesLista();
    ligarPacotes();
    ligarPublicacao();
    ligarSalvamento();
    ligarNavegacao();

    desenharTudo();
    marcarLimpo("Nada alterado ainda.");
  }

  function novaProposta() {
    var nova = modelo.criarPropostaVazia();

    var hoje = new Date();
    var validade = new Date(hoje.getTime());
    validade.setDate(validade.getDate() + 15);

    nova.dataEnvio = paraIso(hoje);
    nova.dataValidade = paraIso(validade);
    nova.cta.whatsapp = Temeron.config.whatsappPadrao;

    // Três pacotes com as linhas do catálogo, tudo desmarcado
    ["Light", "Standard", "Premium"].forEach(function (nome) {
      var pacote = modelo.criarPacoteVazio(nome);
      pacote.itens = modelo.ITENS_PACOTE_CATALOGO.map(function (label) {
        return { label: label, incluso: false, valor: "" };
      });
      pacote.resumo = [{ valor: "", rotulo: "postagens mensais" }];
      nova.pacotes.push(pacote);
    });

    nova.pacotes[2].destaque = true;
    return nova;
  }

  function paraIso(data) {
    var mes = String(data.getMonth() + 1).padStart(2, "0");
    var dia = String(data.getDate()).padStart(2, "0");
    return data.getFullYear() + "-" + mes + "-" + dia;
  }

  function iniciar() {
    ui.exigirSessao()
      .then(function (sessao) {
        if (!sessao) return; // redirecionando para o login

        var id = new URLSearchParams(global.location.search).get("id");
        if (!id) {
          abrir(novaProposta());
          return;
        }
        return dados.obter(id).then(abrir);
      })
      .catch(function (erro) {
        mostrarErro(erro.message || "Não consegui abrir a proposta.");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})(window);
