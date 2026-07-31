/* ==========================================================================
   Temeron — Identificação do leitor
   --------------------------------------------------------------------------
   A proposta pergunta o nome de quem está lendo e passa a usá-lo ao longo da
   página, inclusive na mensagem que sai para o WhatsApp.

   Por que localStorage e não IP:

   O caso difícil é justamente o de dois sócios lendo a mesma proposta. Eles
   quase sempre estão no mesmo escritório, atrás do mesmo roteador — ou seja,
   com o MESMO IP público. Guardar por IP faria o segundo sócio ser chamado
   pelo nome do primeiro, que é exatamente o erro que queremos evitar.

   O localStorage é preso ao navegador de cada aparelho. Dois sócios = dois
   celulares = dois nomes independentes, sem esforço. E funciona offline, sem
   servidor e sem guardar dado pessoal em lugar nenhum além do aparelho da
   própria pessoa.

   Limite honesto: se a mesma pessoa abrir no celular e depois no computador,
   ela vai ser perguntada de novo. É o preço de não manter um cadastro.
   ========================================================================== */

(function (global) {
  "use strict";

  var Temeron = (global.Temeron = global.Temeron || {});

  var PREFIXO = "temeron-leitor:";

  function chave(slug) {
    return PREFIXO + (slug || "geral");
  }

  function obter(slug) {
    try {
      var bruto = global.localStorage.getItem(chave(slug));
      if (!bruto) return "";
      var dados = JSON.parse(bruto);
      return (dados && dados.nome) || "";
    } catch (e) {
      return "";
    }
  }

  function definir(slug, nome) {
    var limpo = limparNome(nome);
    if (!limpo) return "";

    try {
      global.localStorage.setItem(
        chave(slug),
        JSON.stringify({ nome: limpo, em: new Date().toISOString() })
      );
    } catch (e) {
      // Janela anônima ou armazenamento cheio: segue sem persistir
    }
    return limpo;
  }

  function esquecer(slug) {
    try {
      global.localStorage.removeItem(chave(slug));
    } catch (e) {
      /* sem problema */
    }
  }

  /* --- Tratamento do nome --------------------------------------------------
     Guardamos só o primeiro nome: é como a conversa vai acontecer de fato, e
     evita "Olá, Mauro Ricardo dos Santos Silva".
     ---------------------------------------------------------------------- */

  function limparNome(bruto) {
    var texto = String(bruto || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!texto) return "";

    var primeiro = texto.split(" ")[0];
    if (primeiro.length < 2 || primeiro.length > 24) return "";
    // Precisa parecer um nome, não um emoji ou um teste de teclado
    if (!/^[\p{L}][\p{L}'-]*$/u.test(primeiro)) return "";

    return primeiro.charAt(0).toLocaleUpperCase("pt-BR") + primeiro.slice(1);
  }

  /* --- Aplicação do nome nos textos ----------------------------------------
     Nos campos do painel dá para escrever {nome}. Se o leitor não se
     identificou, o marcador some e a frase continua correta:

       "{nome}, essa proposta resolve X"  ->  "Essa proposta resolve X"
     ---------------------------------------------------------------------- */

  function personalizar(texto, nome) {
    var original = String(texto || "");
    if (!original) return "";

    if (nome) return original.replace(/\{nome\}/g, nome);

    return original
      .replace(/\{nome\}\s*[,:—-]\s*/g, "") // "{nome}, " no início da frase
      .replace(/\s*\{nome\}/g, "") // sobras no meio
      .replace(/^\s*([a-zà-ú])/, function (_todo, letra) {
        return letra.toLocaleUpperCase("pt-BR"); // recapitaliza a frase
      })
      .trim();
  }

  // "Mauro, vamos começar?" / "Vamos começar?"
  function vocativo(nome, frase) {
    if (!nome) return frase.charAt(0).toLocaleUpperCase("pt-BR") + frase.slice(1);
    return nome + ", " + frase.charAt(0).toLocaleLowerCase("pt-BR") + frase.slice(1);
  }

  Temeron.leitor = {
    obter: obter,
    definir: definir,
    esquecer: esquecer,
    limparNome: limparNome,
    personalizar: personalizar,
    vocativo: vocativo,
  };
})(window);
