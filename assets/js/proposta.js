/* ==========================================================================
   Temeron — Renderização da proposta pública
   --------------------------------------------------------------------------
   Lê o slug da URL, busca a proposta e monta a página. Não há framework:
   cada seção é uma função que devolve uma string de HTML.

   A alternância claro/escuro segue o PDF original slide a slide. As seções
   escuras não são decoração: são as divisórias de capítulo da apresentação.
   ========================================================================== */

(function (global) {
  "use strict";

  var Temeron = global.Temeron;
  var u = Temeron.utils;
  var leitor = Temeron.leitor;
  var esc = u.escaparHtml;

  var proposta = null;
  var nomeLeitor = "";

  var ICONE_ZAP =
    '<svg class="botao__icone" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.886-9.885 9.886m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488"/></svg>';

  var ICONE_PDF =
    '<svg class="botao__icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>';

  /* ======================================================================
     Descoberta do slug
     Aceita /p/easyfoot-x7k2p9 (reescrita de URL) e ?p=easyfoot-x7k2p9
     ====================================================================== */

  function lerSlug() {
    var params = new URLSearchParams(global.location.search);
    var doQuery = params.get("p") || params.get("proposta");
    if (doQuery) return doQuery.trim();

    var partes = global.location.pathname.split("/").filter(Boolean);
    var indice = partes.indexOf("p");
    if (indice !== -1 && partes[indice + 1]) return decodeURIComponent(partes[indice + 1]);

    return "";
  }

  /* ======================================================================
     Texto
     ====================================================================== */

  // Aplica o nome de quem está lendo nos textos vindos do painel
  function p(texto) {
    return esc(leitor.personalizar(texto, nomeLeitor));
  }

  function paragrafos(lista) {
    return (lista || [])
      .map(function (texto) {
        return "<p>" + p(texto) + "</p>";
      })
      .join("");
  }

  // Lê um caminho como "range.nota" dentro da proposta
  function caminho(objeto, trilha) {
    return String(trilha)
      .split(".")
      .reduce(function (atual, chave) {
        return atual === null || atual === undefined ? undefined : atual[chave];
      }, objeto);
  }

  function nomeCliente() {
    return (proposta.cliente && proposta.cliente.nome) || "sua empresa";
  }

  // "a Easyfoot" / "o Clube X" — o artigo vem do painel quando informado
  function clienteComArtigo() {
    var artigo = (proposta.cliente && proposta.cliente.artigo) || "a";
    return artigo ? artigo + " " + nomeCliente() : nomeCliente();
  }

  function primeiroNome(nome) {
    return String(nome || "").trim().split(/\s+/)[0] || "";
  }

  function numeroZap() {
    return (proposta.cta && proposta.cta.whatsapp) || Temeron.config.whatsappPadrao;
  }

  /* ======================================================================
     Mensagens do WhatsApp
     ====================================================================== */

  function assinaturaLeitor() {
    var empresa = (proposta.cliente && proposta.cliente.nome) || "";
    if (nomeLeitor && empresa) return "Aqui é o " + nomeLeitor + ", da " + empresa + ".";
    if (nomeLeitor) return "Aqui é o " + nomeLeitor + ".";
    if (empresa) return "Sou da " + empresa + ".";
    return "";
  }

  function mensagemGeral() {
    return (
      "Olá, " +
      primeiroNome(proposta.responsavel.nome) +
      "! " +
      assinaturaLeitor() +
      " Vi a proposta que você enviou e queria conversar."
    ).replace(/\s+/g, " ");
  }

  function mensagemPacote(pacote) {
    var preco = pacote.preco ? " (" + u.formatarMoeda(pacote.preco) + pacote.periodo + ")" : "";
    return (
      "Olá, " +
      primeiroNome(proposta.responsavel.nome) +
      "! " +
      assinaturaLeitor() +
      " Vi a proposta e quero seguir com o pacote " +
      pacote.nome +
      preco +
      "."
    ).replace(/\s+/g, " ");
  }

  /* ======================================================================
     Blocos
     ====================================================================== */

  function divisoria(texto, rotulo, modificador) {
    return (
      '<section class="divisoria ' +
      (modificador || "") +
      '" aria-hidden="true">' +
      '<div class="envoltorio">' +
      (rotulo ? '<span class="divisoria__rotulo">' + esc(rotulo) + "</span>" : "") +
      '<p class="divisoria__texto">' +
      esc(texto) +
      "</p>" +
      '<div class="divisoria__marca"></div>' +
      "</div>" +
      "</section>"
    );
  }

  /* --- Capa (slide claro) -------------------------------------------------- */

  function secaoCapa() {
    var cliente = proposta.cliente || {};
    var resp = proposta.responsavel || {};
    var metas = [];

    if (resp.nome) metas.push({ rotulo: resp.cargo || "Responsável", valor: esc(resp.nome) });

    if (resp.telefone) {
      metas.push({
        rotulo: "Contato",
        valor:
          '<a href="' +
          esc(u.linkWhatsapp(numeroZap(), mensagemGeral())) +
          '" target="_blank" rel="noopener">' +
          esc(resp.telefone) +
          "</a>",
      });
    }
    if (proposta.dataEnvio) {
      metas.push({ rotulo: "Envio", valor: esc(u.formatarData(proposta.dataEnvio)) });
    }
    if (proposta.dataValidade) {
      metas.push({ rotulo: "Validade", valor: esc(u.formatarData(proposta.dataValidade)) });
    }

    var logo = cliente.logo
      ? '<img class="capa__logo-cliente" src="' +
        esc(cliente.logo) +
        '" alt="' +
        esc(cliente.nome) +
        '">'
      : "";

    return (
      '<header class="capa" id="capa">' +
      '<div class="capa__interno">' +
      '<div class="capa__topo">' +
      '<p class="rotulo">Proposta comercial</p>' +
      logo +
      '<h1 class="capa__cliente">' +
      esc(cliente.nome || "Proposta") +
      "</h1>" +
      '<p class="capa__titulo">' +
      esc(proposta.titulo || "") +
      "</p>" +
      "</div>" +
      '<div class="capa__meta">' +
      metas
        .map(function (m) {
          return (
            '<div class="meta-item">' +
            '<span class="meta-item__rotulo">' +
            esc(m.rotulo) +
            "</span>" +
            '<span class="meta-item__valor">' +
            m.valor +
            "</span>" +
            "</div>"
          );
        })
        .join("") +
      "</div>" +
      "</div>" +
      "</header>"
    );
  }

  /* --- Saudação: o leitor se identifica ------------------------------------ */

  function secaoSaudacao() {
    return (
      '<section class="saudacao" id="saudacao">' +
      '<div class="envoltorio">' +
      '<div class="saudacao__caixa" id="saudacao-caixa"></div>' +
      "</div>" +
      "</section>"
    );
  }

  function desenharSaudacao() {
    var caixa = u.$("#saudacao-caixa");
    if (!caixa) return;

    if (nomeLeitor) {
      caixa.innerHTML =
        '<p class="saudacao__confirmado">' +
        '<span>Boa leitura, <span class="saudacao__nome">' +
        esc(nomeLeitor) +
        "</span>. Esta proposta foi preparada para " +
        esc(clienteComArtigo()) +
        ".</span>" +
        '<button class="saudacao__trocar" type="button" id="trocar-nome">Não sou eu</button>' +
        "</p>";

      u.$("#trocar-nome").addEventListener("click", function () {
        leitor.esquecer(proposta.slug);
        nomeLeitor = "";
        desenharSaudacao();
        atualizarPersonalizacao();
        u.$("#saudacao-campo").focus();
      });
      return;
    }

    caixa.innerHTML =
      '<h2 class="saudacao__titulo">Antes de começar: como podemos te chamar?</h2>' +
      '<p class="saudacao__texto">Só para deixar a leitura menos impessoal — e para eu saber com ' +
      "quem estou falando quando você me chamar no WhatsApp. Fica salvo só neste aparelho.</p>" +
      '<form class="saudacao__form" id="saudacao-form">' +
      '<label class="apenas-leitor" for="saudacao-campo">Seu primeiro nome</label>' +
      '<input class="saudacao__campo" type="text" id="saudacao-campo" placeholder="Seu primeiro nome" ' +
      'autocomplete="given-name" maxlength="40">' +
      '<button class="botao botao--primario" type="submit">Continuar</button>' +
      "</form>";

    u.$("#saudacao-form").addEventListener("submit", function (evento) {
      evento.preventDefault();
      var digitado = u.$("#saudacao-campo").value;
      var salvo = leitor.definir(proposta.slug, digitado);

      if (!salvo) {
        u.$("#saudacao-campo").focus();
        return;
      }

      nomeLeitor = salvo;
      desenharSaudacao();
      atualizarPersonalizacao();
    });
  }

  /* --- Diagnóstico (claro) ------------------------------------------------- */

  function secaoDiagnostico() {
    var d = proposta.diagnostico;
    if (!d || !d.paragrafos.length) return "";

    var titulo = d.titulo || "Quem é " + clienteComArtigo() + "?";

    return (
      '<section class="secao" id="diagnostico" aria-labelledby="titulo-diagnostico">' +
      '<div class="envoltorio">' +
      '<div class="duas-colunas duas-colunas--fixa revelar">' +
      '<h2 class="duas-colunas__titulo" id="titulo-diagnostico">' +
      esc(titulo) +
      "</h2>" +
      '<div class="duas-colunas__corpo">' +
      '<p class="rotulo" data-pers="abertura-diagnostico">' +
      esc(leitor.vocativo(nomeLeitor, "é assim que eu enxergo hoje")) +
      "</p>" +
      '<div data-pers-lista="diagnostico.paragrafos">' +
      paragrafos(d.paragrafos) +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</section>"
    );
  }

  /* --- Objetivo e canais (claro) ------------------------------------------- */

  function secaoObjetivo() {
    var o = proposta.objetivo;
    var temTexto = o && o.paragrafos.length;
    var temRedes = proposta.redes && proposta.redes.length;
    if (!temTexto && !temRedes) return "";

    var redesHtml = temRedes
      ? '<div class="revelar">' +
        '<p class="rotulo" style="margin-top:var(--esp-7)">Canais que vamos trabalhar</p>' +
        '<ul class="redes">' +
        proposta.redes
          .map(function (rede) {
            return '<li class="rede"><span class="rede__ponto"></span>' + esc(nomeRede(rede)) + "</li>";
          })
          .join("") +
        "</ul>" +
        "</div>"
      : "";

    return (
      '<section class="secao" id="objetivo" aria-labelledby="titulo-objetivo">' +
      '<div class="envoltorio">' +
      '<div class="duas-colunas duas-colunas--fixa revelar">' +
      '<h2 class="duas-colunas__titulo" id="titulo-objetivo">' +
      esc(o.titulo) +
      "</h2>" +
      '<div class="duas-colunas__corpo" data-pers-lista="objetivo.paragrafos">' +
      paragrafos(o.paragrafos) +
      "</div>" +
      "</div>" +
      redesHtml +
      "</div>" +
      "</section>"
    );
  }

  function nomeRede(id) {
    var achado = null;
    Temeron.modelo.REDES_CATALOGO.forEach(function (r) {
      if (r.id === id) achado = r.nome;
    });
    return achado || id;
  }

  /* --- Range de investimento (ESCURO, como no PDF) -------------------------- */

  function secaoRange() {
    var minimo = proposta.range.min;
    var maximo = proposta.range.max;

    // Sem valores definidos no painel, deriva dos pacotes
    if (!minimo || !maximo) {
      var precos = (proposta.pacotes || [])
        .map(function (pac) {
          return Number(pac.preco);
        })
        .filter(function (n) {
          return isFinite(n) && n > 0;
        });

      if (!precos.length) return "";
      minimo = minimo || Math.min.apply(null, precos);
      maximo = maximo || Math.max.apply(null, precos);
    }

    var valores =
      minimo === maximo
        ? "<span>" + esc(u.formatarMoeda(minimo)) + "</span>"
        : "<span>" +
          esc(u.formatarMoeda(minimo)) +
          '</span><span class="range__traco" aria-hidden="true"></span><span>' +
          esc(u.formatarMoeda(maximo)) +
          "</span>";

    return (
      '<section class="secao tema-escuro" id="investimento" aria-labelledby="titulo-range">' +
      '<div class="envoltorio range revelar">' +
      '<h2 class="range__rotulo" id="titulo-range">Nosso range de valores para esta solução</h2>' +
      '<div class="range__valores">' +
      valores +
      "</div>" +
      (proposta.range.nota
        ? '<p class="range__nota" data-pers-texto="range.nota">' + p(proposta.range.nota) + "</p>"
        : "") +
      "</div>" +
      "</section>"
    );
  }

  /* --- Temeron (claro) ----------------------------------------------------- */

  function secaoSobre() {
    var s = proposta.sobre;
    if (!s) return "";

    var manifesto = s.manifesto
      ? '<div class="duas-colunas revelar" style="margin-top:var(--esp-8)">' +
        '<h3 class="duas-colunas__titulo">' +
        esc(s.manifesto.titulo) +
        "</h3>" +
        '<div class="duas-colunas__corpo">' +
        paragrafos(s.manifesto.paragrafos) +
        "</div>" +
        "</div>"
      : "";

    var historia = s.historia
      ? '<p class="medida revelar" style="margin-top:var(--esp-8);color:var(--papel-texto-suave)">' +
        esc(s.historia) +
        "</p>"
      : "";

    return (
      '<section class="secao" id="temeron" aria-labelledby="titulo-sobre">' +
      '<div class="envoltorio">' +
      '<div class="duas-colunas revelar">' +
      '<h2 class="duas-colunas__titulo" id="titulo-sobre">' +
      esc(s.titulo) +
      "</h2>" +
      '<div class="duas-colunas__corpo">' +
      paragrafos(s.paragrafos) +
      "</div>" +
      "</div>" +
      manifesto +
      historia +
      "</div>" +
      "</section>"
    );
  }

  /* --- Serviços (claro) ---------------------------------------------------- */

  function secaoServicos() {
    if (!proposta.servicos.length) return "";

    return (
      '<section class="secao" id="servicos" aria-labelledby="titulo-servicos">' +
      '<div class="envoltorio">' +
      '<div class="servicos revelar">' +
      proposta.servicos
        .map(function (grupo) {
          return (
            '<div class="servico__grupo">' +
            '<h3 class="servico__nome">' +
            esc(grupo.grupo) +
            "</h3>" +
            '<ul class="servico__itens">' +
            (grupo.itens || [])
              .map(function (i) {
                return "<li>" + esc(i) + "</li>";
              })
              .join("") +
            "</ul>" +
            "</div>"
          );
        })
        .join("") +
      "</div>" +
      '<h2 class="apenas-leitor" id="titulo-servicos">Serviços</h2>' +
      "</div>" +
      "</section>"
    );
  }

  /* --- Método (claro) ------------------------------------------------------ */

  function secaoMetodo() {
    var m = proposta.metodo;
    if (!m || !m.etapas || !m.etapas.length) return "";

    return (
      '<section class="secao" id="metodo" aria-labelledby="titulo-metodo">' +
      '<div class="envoltorio">' +
      '<div class="secao__cabecalho revelar">' +
      '<p class="rotulo">Como trabalhamos</p>' +
      '<h2 class="secao__titulo" id="titulo-metodo">' +
      esc(m.titulo) +
      "</h2>" +
      (m.descricao ? '<p class="secao__subtitulo">' + p(m.descricao) + "</p>" : "") +
      "</div>" +
      '<div class="metodo revelar">' +
      m.etapas
        .map(function (e) {
          return (
            '<article class="etapa">' +
            '<span class="etapa__numero">' +
            esc(e.numero) +
            "</span>" +
            '<h3 class="etapa__nome">' +
            esc(e.nome) +
            "</h3>" +
            '<p class="etapa__texto">' +
            esc(e.texto) +
            "</p>" +
            "</article>"
          );
        })
        .join("") +
      "</div>" +
      "</div>" +
      "</section>"
    );
  }

  /* --- Bônus e expansões (claro) ------------------------------------------- */

  function secaoBonus() {
    if (!proposta.bonus.length) return "";

    var expansoes =
      proposta.expansoes && (proposta.expansoes.itens || []).length
        ? '<div class="revelar" style="margin-top:var(--esp-8)">' +
          '<p class="rotulo">Depois da gestão</p>' +
          '<h3 class="secao__titulo">' +
          esc(proposta.expansoes.titulo) +
          "</h3>" +
          '<ul class="expansoes">' +
          proposta.expansoes.itens
            .map(function (i) {
              return "<li>" + esc(i) + "</li>";
            })
            .join("") +
          "</ul>" +
          (proposta.expansoes.fecho
            ? '<p class="expansoes__fecho">' + esc(proposta.expansoes.fecho) + "</p>"
            : "") +
          "</div>"
        : "";

    return (
      '<section class="secao" id="bonus" aria-labelledby="titulo-bonus">' +
      '<div class="envoltorio">' +
      '<div class="secao__cabecalho revelar">' +
      '<p class="rotulo">Incluso, sem custo adicional</p>' +
      '<h2 class="secao__titulo" id="titulo-bonus">' +
      esc(leitor.vocativo(nomeLeitor, "isto também vai junto")) +
      "</h2>" +
      "</div>" +
      '<div class="bonus revelar">' +
      proposta.bonus
        .map(function (b) {
          return (
            '<article class="bonus__card">' +
            '<span class="bonus__selo">Bônus</span>' +
            '<h3 class="bonus__titulo">' +
            esc(b.titulo) +
            "</h3>" +
            (b.texto ? '<p class="bonus__texto">' + esc(b.texto) + "</p>" : "") +
            ((b.itens || []).length
              ? '<ul class="bonus__itens">' +
                b.itens
                  .map(function (i) {
                    return "<li>" + esc(i) + "</li>";
                  })
                  .join("") +
                "</ul>"
              : "") +
            "</article>"
          );
        })
        .join("") +
      "</div>" +
      expansoes +
      "</div>" +
      "</section>"
    );
  }

  /* --- Cases (claro, com faixa vermelha) ----------------------------------- */

  function secaoCases() {
    if (!proposta.cases.length) return "";

    return (
      '<section class="secao" id="cases" aria-labelledby="titulo-cases">' +
      '<h2 class="apenas-leitor" id="titulo-cases">Cases</h2>' +
      '<div class="envoltorio">' +
      proposta.cases.map(caseHtml).join("") +
      "</div>" +
      "</section>"
    );
  }

  function caseHtml(c) {
    var numeros = (c.numeros || []).length
      ? '<div class="case__numeros">' +
        c.numeros
          .map(function (n) {
            return (
              "<div>" +
              '<span class="case__numero-valor">' +
              esc(n.valor) +
              "</span>" +
              '<span class="case__numero-rotulo">' +
              esc(n.rotulo) +
              "</span>" +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      : "";

    var imagem = c.imagem
      ? '<img class="case__imagem" src="' +
        esc(c.imagem) +
        '" alt="Projeto ' +
        esc(c.nome) +
        '" loading="lazy" decoding="async">'
      : "";

    var transformacao =
      c.antes || c.depois
        ? '<div class="case__faixa"><div class="case__transformacao">' +
          (c.antes
            ? '<div class="case__bloco"><span class="case__bloco-rotulo">Antes</span><p>' +
              esc(c.antes) +
              "</p></div>"
            : "") +
          (c.depois
            ? '<div class="case__bloco case__bloco--depois"><span class="case__bloco-rotulo">Depois</span><p>' +
              esc(c.depois) +
              "</p></div>"
            : "") +
          "</div></div>"
        : "";

    return (
      '<article class="case revelar">' +
      '<h3 class="case__nome">' +
      esc(c.nome) +
      "</h3>" +
      (c.contexto ? '<p class="case__contexto">' + esc(c.contexto) + "</p>" : "") +
      imagem +
      ((c.servicos || []).length
        ? '<ul class="case__servicos">' +
          c.servicos
            .map(function (s) {
              return '<li class="case__servico">' + esc(s) + "</li>";
            })
            .join("") +
          "</ul>"
        : "") +
      transformacao +
      numeros +
      "</article>"
    );
  }

  /* --- Depoimentos (claro) -------------------------------------------------- */

  function secaoDepoimentos() {
    if (!proposta.depoimentos.length) return "";

    return (
      '<section class="secao" id="depoimentos" aria-labelledby="titulo-depoimentos">' +
      '<div class="envoltorio">' +
      '<div class="secao__cabecalho revelar">' +
      '<p class="rotulo">Quem já trabalhou comigo</p>' +
      '<h2 class="secao__titulo" id="titulo-depoimentos">Depoimentos</h2>' +
      "</div>" +
      '<div class="depoimentos revelar">' +
      proposta.depoimentos
        .map(function (d) {
          var foto = d.foto
            ? '<img class="depoimento__foto" src="' + esc(d.foto) + '" alt="" loading="lazy" decoding="async">'
            : '<span class="depoimento__foto" aria-hidden="true"></span>';

          return (
            '<figure class="depoimento">' +
            '<blockquote class="depoimento__texto">' +
            esc(d.texto) +
            "</blockquote>" +
            '<figcaption class="depoimento__autor">' +
            foto +
            "<span>" +
            '<span class="depoimento__nome">' +
            esc(d.nome) +
            "</span><br>" +
            '<span class="depoimento__cargo">' +
            esc([d.cargo, d.empresa].filter(Boolean).join(" · ")) +
            "</span>" +
            "</span>" +
            "</figcaption>" +
            "</figure>"
          );
        })
        .join("") +
      "</div>" +
      "</div>" +
      "</section>"
    );
  }

  /* --- Pacotes (claro) ------------------------------------------------------ */

  function secaoPacotes() {
    if (!proposta.pacotes.length) return "";

    var observacoes = (proposta.observacoes || []).length
      ? '<ul class="observacoes revelar">' +
        proposta.observacoes
          .map(function (o) {
            return "<li>" + esc(o) + "</li>";
          })
          .join("") +
        "</ul>"
      : "";

    return (
      '<section class="secao" id="pacotes" aria-labelledby="titulo-pacotes">' +
      '<div class="envoltorio">' +
      '<div class="secao__cabecalho revelar">' +
      '<p class="rotulo">Escolha o formato</p>' +
      '<h2 class="secao__titulo" id="titulo-pacotes">' +
      esc(leitor.vocativo(nomeLeitor, "são três formatos possíveis")) +
      "</h2>" +
      '<p class="secao__subtitulo">Todos incluem a construção da estratégia e a criação de ' +
      "conteúdo. A diferença está no volume e nos formatos entregues por mês.</p>" +
      "</div>" +
      '<div class="pacotes revelar">' +
      proposta.pacotes.map(pacoteHtml).join("") +
      "</div>" +
      observacoes +
      "</div>" +
      "</section>"
    );
  }

  function pacoteHtml(pacote) {
    var partes = u.partesMoeda(pacote.preco);

    var preco = partes
      ? '<div class="pacote__preco">' +
        '<span class="pacote__preco-simbolo">' +
        partes.simbolo +
        "</span>" +
        '<span class="pacote__preco-inteiro">' +
        partes.inteiro +
        "</span>" +
        '<span class="pacote__preco-centavos">,' +
        partes.centavos +
        "</span>" +
        '<span class="pacote__preco-periodo">' +
        esc(pacote.periodo || "") +
        "</span>" +
        "</div>"
      : '<p class="pacote__sob-consulta">Sob consulta</p>';

    var resumo = (pacote.resumo || []).length
      ? '<div class="pacote__resumo">' +
        pacote.resumo
          .map(function (r) {
            return (
              '<div class="pacote__resumo-item">' +
              '<span class="pacote__resumo-valor">' +
              esc(r.valor) +
              "</span>" +
              '<span class="pacote__resumo-rotulo">' +
              esc(r.rotulo) +
              "</span>" +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      : "";

    var itens = (pacote.itens || []).length
      ? '<ul class="pacote__itens">' +
        pacote.itens
          .map(function (item) {
            return (
              '<li class="pacote__item' +
              (item.incluso ? "" : " pacote__item--ausente") +
              '">' +
              '<span class="pacote__item-label">' +
              esc(item.label) +
              "</span>" +
              '<span class="pacote__item-valor">' +
              esc(item.incluso ? item.valor || "Sim" : "—") +
              "</span>" +
              "</li>"
            );
          })
          .join("") +
        "</ul>"
      : "";

    return (
      '<article class="pacote' +
      (pacote.destaque ? " pacote--destaque" : "") +
      '">' +
      (pacote.destaque ? '<span class="pacote__selo">Recomendado</span>' : "") +
      '<h3 class="pacote__nome">' +
      esc(pacote.nome) +
      "</h3>" +
      preco +
      resumo +
      itens +
      '<div class="pacote__cta">' +
      '<a class="botao botao--largo ' +
      (pacote.destaque ? "botao--acento" : "botao--primario") +
      '" href="' +
      esc(u.linkWhatsapp(numeroZap(), mensagemPacote(pacote))) +
      '" target="_blank" rel="noopener" data-zap="pacote">' +
      ICONE_ZAP +
      "Quero o " +
      esc(pacote.nome) +
      "</a>" +
      "</div>" +
      "</article>"
    );
  }

  /* --- Chamada final (ESCURO, como o "Obrigado!" do PDF) -------------------- */

  function secaoChamada() {
    var cta = proposta.cta || {};
    var dias = u.diasAte(proposta.dataValidade);
    var validade = "";

    if (dias !== null) {
      if (dias < 0) {
        validade = "Esta proposta venceu em " + u.formatarData(proposta.dataValidade, "extenso") + ".";
      } else if (dias === 0) {
        validade = "Esta proposta é válida até hoje.";
      } else {
        validade =
          "Válida até " +
          u.formatarData(proposta.dataValidade, "extenso") +
          " — faltam " +
          dias +
          (dias === 1 ? " dia." : " dias.");
      }
    }

    return (
      '<section class="secao tema-escuro" id="contato" aria-labelledby="titulo-chamada">' +
      '<div class="envoltorio chamada revelar" data-contato="' +
      esc(proposta.responsavel.telefone || "") +
      '">' +
      '<h2 class="chamada__titulo" id="titulo-chamada">' +
      esc(leitor.vocativo(nomeLeitor, cta.titulo || "vamos começar?")) +
      "</h2>" +
      (cta.texto
        ? '<p class="chamada__texto" data-pers-texto="cta.texto">' + p(cta.texto) + "</p>"
        : "") +
      '<div class="chamada__acoes">' +
      '<a class="botao botao--acento" href="' +
      esc(u.linkWhatsapp(numeroZap(), mensagemGeral())) +
      '" target="_blank" rel="noopener" data-zap="final">' +
      ICONE_ZAP +
      "Falar no WhatsApp</a>" +
      '<button class="botao botao--contorno" type="button" data-acao="pdf">' +
      ICONE_PDF +
      "Salvar em PDF</button>" +
      "</div>" +
      (validade ? '<p class="chamada__validade">' + esc(validade) + "</p>" : "") +
      "</div>" +
      "</section>"
    );
  }

  function rodape() {
    var resp = proposta.responsavel || {};

    return (
      '<footer class="rodape">' +
      '<div class="envoltorio rodape__conteudo">' +
      "<p>© " +
      new Date().getFullYear() +
      "® Temeron — Consultoria de Marca</p>" +
      '<div class="rodape__links">' +
      '<a href="https://instagram.com/temeron.co" target="_blank" rel="noopener">@temeron.co</a>' +
      '<a href="https://instagram.com/oricardocarvalho_" target="_blank" rel="noopener">@oricardocarvalho_</a>' +
      (resp.portfolio
        ? '<a href="https://' +
          esc(resp.portfolio.replace(/^https?:\/\//, "")) +
          '" target="_blank" rel="noopener">' +
          esc(resp.portfolio) +
          "</a>"
        : "") +
      "</div>" +
      "</div>" +
      "</footer>"
    );
  }

  /* ======================================================================
     Montagem — a ordem e as cores espelham o PDF
     ====================================================================== */

  function montar() {
    var faixa = u.estaVencida(proposta.dataValidade)
      ? '<p class="aviso-vencida">Esta proposta expirou em ' +
        esc(u.formatarData(proposta.dataValidade)) +
        ". Fale comigo para revalidar os valores.</p>"
      : "";

    u.$("#raiz").innerHTML =
      faixa +
      secaoCapa() + //                        claro
      divisoria(nomeCliente(), "Proposta para", "divisoria--cliente") + // escuro
      secaoSaudacao() +
      '<main id="conteudo">' +
      secaoDiagnostico() + //                 claro
      secaoObjetivo() + //                    claro
      secaoRange() + //                       ESCURO
      divisoria("Mas... quem somos nós?") + // escuro
      secaoSobre() + //                       claro
      divisoria("Serviços") + //              escuro
      secaoServicos() + //                    claro
      divisoria("Gestão de marca", "Conheça mais sobre o serviço") + // escuro
      secaoMetodo() + //                      claro
      divisoria("Bônus") + //                 escuro
      secaoBonus() + //                       claro
      divisoria("Cases") + //                 escuro
      secaoCases() + //                       claro
      secaoDepoimentos() + //                 claro
      divisoria("Pacotes") + //               escuro
      secaoPacotes() + //                     claro
      secaoChamada() + //                     ESCURO
      "</main>" +
      rodape();

    desenharSaudacao();
    preencherTopo();
    ligarAcoes();
    atualizarMetadados();
    ativarRevelacao();
    ativarProgresso();
  }

  /* --- Atualização após o leitor se identificar ----------------------------
     Em vez de remontar a página inteira (e jogar o leitor de volta ao topo),
     trocamos só os pedaços que dependem do nome.
     ---------------------------------------------------------------------- */

  function atualizarPersonalizacao() {
    var titulo = u.$("#titulo-chamada");
    if (titulo) {
      titulo.textContent = leitor.vocativo(
        nomeLeitor,
        (proposta.cta && proposta.cta.titulo) || "vamos começar?"
      );
    }

    var abertura = u.$('[data-pers="abertura-diagnostico"]');
    if (abertura) {
      abertura.textContent = leitor.vocativo(nomeLeitor, "é assim que eu enxergo hoje");
    }

    var tituloPacotes = u.$("#titulo-pacotes");
    if (tituloPacotes) {
      tituloPacotes.textContent = leitor.vocativo(nomeLeitor, "são três formatos possíveis");
    }

    var tituloBonus = u.$("#titulo-bonus");
    if (tituloBonus) {
      tituloBonus.textContent = leitor.vocativo(nomeLeitor, "isto também vai junto");
    }

    // Textos do painel que podem conter {nome}
    u.$$("[data-pers-lista]").forEach(function (bloco) {
      var lista = caminho(proposta, bloco.dataset.persLista);
      if (Array.isArray(lista)) bloco.innerHTML = paragrafos(lista);
    });

    u.$$("[data-pers-texto]").forEach(function (elemento) {
      var texto = caminho(proposta, elemento.dataset.persTexto);
      elemento.textContent = leitor.personalizar(texto, nomeLeitor);
    });

    // Os links de WhatsApp passam a se apresentar pelo nome
    u.$$('[data-zap="pacote"]').forEach(function (link, indice) {
      var pacote = proposta.pacotes[indice];
      if (pacote) link.href = u.linkWhatsapp(numeroZap(), mensagemPacote(pacote));
    });

    u.$$('[data-zap="final"], [data-zap="topo"], [data-zap="flutuante"]').forEach(function (link) {
      link.href = u.linkWhatsapp(numeroZap(), mensagemGeral());
    });

    var saudacaoTopo = u.$("#topo-cliente");
    if (saudacaoTopo) {
      saudacaoTopo.textContent = nomeLeitor
        ? nomeLeitor + " · " + nomeCliente()
        : nomeCliente();
    }
  }

  function preencherTopo() {
    var topo = u.$("#topo");
    topo.hidden = false;

    u.$("#topo-cliente").textContent = nomeLeitor
      ? nomeLeitor + " · " + nomeCliente()
      : nomeCliente();

    var dias = u.diasAte(proposta.dataValidade);
    var badge = u.$("#topo-validade");

    if (dias === null) {
      badge.textContent = "";
    } else if (dias < 0) {
      badge.textContent = "Proposta expirada";
      badge.setAttribute("data-urgente", "sim");
    } else {
      badge.textContent = "Válida por " + dias + (dias === 1 ? " dia" : " dias");
      if (dias <= 5) badge.setAttribute("data-urgente", "sim");
    }

    u.$("#topo-zap").href = u.linkWhatsapp(numeroZap(), mensagemGeral());
    u.$("#zap-flutuante").href = u.linkWhatsapp(numeroZap(), mensagemGeral());
  }

  function ligarAcoes() {
    // Gerar PDF = imprimir. O navegador oferece "Salvar como PDF" no diálogo,
    // e o CSS de impressão já formata a página para isso.
    u.$$('[data-acao="pdf"]').forEach(function (botao) {
      botao.addEventListener("click", function () {
        global.print();
      });
    });
  }

  function atualizarMetadados() {
    var titulo = nomeCliente() + " × Temeron — " + (proposta.titulo || "Proposta comercial");
    document.title = titulo;

    definirMeta("description", "Proposta comercial preparada para " + nomeCliente() + " pela Temeron.");
    definirMeta("og:title", titulo, "property");
    definirMeta(
      "og:description",
      "Proposta comercial preparada para " + nomeCliente() + " pela Temeron.",
      "property"
    );
  }

  function definirMeta(nome, conteudo, tipoAtributo) {
    var atributo = tipoAtributo || "name";
    var tag = document.head.querySelector("meta[" + atributo + '="' + nome + '"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(atributo, nome);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", conteudo);
  }

  /* ======================================================================
     Comportamentos de scroll
     ====================================================================== */

  function ativarRevelacao() {
    var alvos = u.$$(".revelar");

    if (!("IntersectionObserver" in global)) {
      alvos.forEach(function (el) {
        el.setAttribute("data-visivel", "sim");
      });
      return;
    }

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          entrada.target.setAttribute("data-visivel", "sim");
          observador.unobserve(entrada.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );

    alvos.forEach(function (el) {
      observador.observe(el);
    });
  }

  function ativarProgresso() {
    var topo = u.$("#topo");
    var barra = u.$("#topo-progresso");
    var zap = u.$("#zap-flutuante");
    var pendente = false;

    function atualizar() {
      pendente = false;
      var rolavel = document.documentElement.scrollHeight - global.innerHeight;
      var y = global.scrollY;

      barra.style.setProperty("--progresso", rolavel > 0 ? Math.min(1, y / rolavel) : 0);
      topo.setAttribute("data-rolado", y > 8 ? "sim" : "nao");
      zap.setAttribute("data-visivel", y > global.innerHeight * 0.7 ? "sim" : "nao");
    }

    global.addEventListener(
      "scroll",
      function () {
        if (pendente) return;
        pendente = true;
        global.requestAnimationFrame(atualizar);
      },
      { passive: true }
    );

    atualizar();
  }

  /* ======================================================================
     Estados de tela
     ====================================================================== */

  function mostrarEstado(qual) {
    ["carregando", "erro"].forEach(function (nome) {
      u.$("#estado-" + nome).hidden = nome !== qual;
    });
  }

  function mostrarErro(erro) {
    mostrarEstado("erro");
    u.$("#topo").hidden = true;

    var titulo = "Proposta não encontrada";
    if (erro && erro.codigo === "config") titulo = "Sistema não configurado";
    else if (erro && erro.codigo === "rede") titulo = "Falha de conexão";

    u.$("#erro-titulo").textContent = titulo;
    u.$("#erro-texto").textContent =
      (erro && erro.message) || "Não foi possível carregar a proposta.";

    u.$("#erro-zap").href = u.linkWhatsapp(
      Temeron.config.whatsappPadrao,
      "Olá, Ricardo! Tentei abrir o link da proposta mas não consegui."
    );

    if (console && console.error) console.error(erro);
  }

  /* ======================================================================
     Início
     ====================================================================== */

  function iniciar() {
    var slug = lerSlug();

    if (!slug) {
      mostrarErro(
        new Temeron.dados.ErroDados(
          "O endereço não indica qual proposta abrir. Confira se o link recebido está completo.",
          "nao-encontrada"
        )
      );
      return;
    }

    mostrarEstado("carregando");

    Temeron.dados
      .buscarPublicada(slug)
      .then(function (carregada) {
        proposta = carregada;
        proposta.slug = slug;
        nomeLeitor = leitor.obter(slug);
        mostrarEstado(null);
        montar();
      })
      .catch(mostrarErro);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})(window);
