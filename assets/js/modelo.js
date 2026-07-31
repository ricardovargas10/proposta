/* ==========================================================================
   Temeron — Modelo de dados da proposta
   --------------------------------------------------------------------------
   Uma proposta é um único objeto JSON. Este arquivo define:
     1. o formato canônico (criarPropostaVazia)
     2. os conteúdos institucionais que se repetem em toda proposta
     3. a normalização — garante que uma proposta salva numa versão antiga
        do sistema continue renderizando sem quebrar
   Scripts clássicos (sem módulos ES) para funcionar também via file://.
   ========================================================================== */

(function (global) {
  "use strict";

  var Temeron = (global.Temeron = global.Temeron || {});

  /* --- Conteúdo institucional -------------------------------------------
     Não muda de cliente para cliente. O admin carrega isso como ponto de
     partida e o Ricardo ajusta só se quiser.
     -------------------------------------------------------------------- */

  var SOBRE_PADRAO = {
    titulo: "Olá, somos a Temeron®",
    paragrafos: [
      "Somos um escritório de branding, especializado em estratégia de marca, definindo o posicionamento por meio de comunicação visual e verbal.",
      "Vivemos num mercado caótico; o estoicismo nos ensinou a usar a adversidade como ponto de partida. Temeron, termo de origem grega e estóica, resume essa prática: colocamos um método sobre a incerteza e projetamos marcas como ativos estratégicos, mensuráveis e duradouros.",
    ],
    manifesto: {
      titulo: "Nós transformamos empresas em marcas",
      paragrafos: [
        "Ajudamos na definição de marca, alinhando as necessidades do consumidor com o seu modelo de negócio; impulsionando o crescimento e solidificando uma audiência.",
        "Nossa missão é simples: ajudar empreendedores e organizações a comunicarem seus propósitos e criar experiências que sua audiência possa se conectar.",
      ],
    },
    historia:
      "Fundada em 2021 pelo Diretor Criativo Ricardo Carvalho, a Temeron passou de um estúdio de design gráfico para uma consultoria especializada em estratégia de marca. O que a permitiu trabalhar com empresas de todo mundo e diversos setores.",
  };

  var SERVICOS_PADRAO = [
    {
      grupo: "Estratégia",
      itens: ["Diagnóstico & Pesquisa", "Estratégia de Marca", "Arquitetura de Marca"],
    },
    {
      grupo: "Identidade",
      itens: ["Naming", "Posicionamento", "Identidade Visual", "Identidade Verbal", "Brand Guide"],
    },
    {
      grupo: "Gestão",
      itens: ["Gestão estratégica de marca em todos os canais de comunicação"],
    },
    {
      grupo: "Colaterais",
      itens: ["Apresentações", "Editorial", "Embalagem", "Webdesign", "Templates"],
    },
  ];

  var METODO_PADRAO = {
    titulo: "Método Âncora",
    descricao:
      "Três etapas encadeadas: uma fundamenta a próxima. É assim que a marca deixa de depender de inspiração e passa a depender de processo.",
    etapas: [
      {
        numero: "1",
        nome: "Fundação",
        texto:
          "Imersão na sua esteira de serviços, nos cases e no discurso comercial. O resultado é um documento estratégico que guia toda a comunicação.",
      },
      {
        numero: "2",
        nome: "Haste",
        texto:
          "Eu assumo o pensamento: temas, abordagens e conteúdos. Vocês só validam e gravam quando necessário.",
      },
      {
        numero: "3",
        nome: "Corrente",
        texto:
          "Monitoramento contínuo para a marca não parar de postar, incluindo a rotina de relacionamento com os clientes.",
      },
    ],
  };

  var BONUS_PADRAO = [
    {
      titulo: "Sistema completo no Notion",
      texto: "",
      itens: [
        "Documento de estratégia",
        "Painel de Aprovação",
        "Calendário Editorial",
        "Diversos canais integrados",
        "Estudo de Personas",
      ],
    },
    {
      titulo: "Grupo eterno no WhatsApp",
      texto:
        "Após fechar um projeto, costumo criar um grupo de WhatsApp que nunca será excluído, onde poderão contar com meu apoio para qualquer projeto que venha a surgir.",
      itens: [],
    },
    {
      titulo: "Treinamento sobre IAs no dia a dia",
      texto:
        "Graças à estratégia desenvolvida, será possível treinar uma IA para gerar textos do seu dia a dia com a tonalidade correta da marca, seguindo todos os parâmetros já definidos.",
      itens: [],
    },
  ];

  var EXPANSOES_PADRAO = {
    titulo: "Possíveis expansões de projeto",
    itens: ["Website?", "Estratégia de Marca?", "Canal no YouTube?", "Plataforma de Ensino?"],
    fecho: "Conte comigo!",
  };

  var DEPOIMENTOS_PADRAO = [
    {
      texto:
        "Cheguei até a TEMERON por indicação e logo no primeiro contato senti a diferença: profissionalismo, ideias consistentes e empatia com os objetivos da nossa empresa. Durante todo o processo, a equipe conseguiu captar nossa essência e traduzir em uma marca moderna, clara e única, em sintonia com a alma do nosso negócio. O resultado final foi além das expectativas e hoje recebemos constantes elogios pela nova identidade.",
      nome: "Jefferson Rocha",
      cargo: "CEO da AIT Holding",
      empresa: "Arrivo",
      foto: "",
    },
    {
      texto:
        "Quando procurei a TEMERON, queria muito mais do que um logo: eu buscava uma identidade que representasse a mia anima e a passione pelo ensino da língua e cultura italiana. A equipe conseguiu traduzir cada detalhe da minha essência em um universo visual moderno, elegante e cheio de significado. Hoje, cada material que uso em aula transmite profissionalismo e autenticidade.",
      nome: "Andressa Maia",
      cargo: "Founder",
      empresa: "Digitaliano",
      foto: "",
    },
    {
      texto:
        "A TEMERON reúne duas competências que considero raras no mercado de branding: análise profunda e visão estratégica. Cada entrega é embasada, coerente e construída com clareza de objetivos. A consistência entre estratégia e estética faz da TEMERON uma consultoria diferenciada, com muito potencial de impacto para as marcas com que trabalha.",
      nome: "Raphael Moroz",
      cargo: "Professor, Mentor, Autor & Diretor",
      empresa: "RMOROZ",
      foto: "",
    },
  ];

  var CASES_PADRAO = [
    {
      nome: "Arrivo",
      contexto:
        "Arrivo é uma empresa sediada em Lucca, na região da Toscana, especializada em processos de cidadania italiana para brasileiros diretamente na Itália.",
      servicos: [
        "Estratégia de Marca",
        "Identidade Verbal",
        "Identidade Visual",
        "Guia de Marca",
        "Webdesign",
        "Gestão de Marca",
      ],
      antes:
        "A Arrivo in Italia tinha uma identidade feita no Canva, com as cores da bandeira italiana e sem posicionamento claro. A marca soava amadora, desconectada da personalidade carismática do fundador, e competia apenas por preço.",
      depois:
        "A Arrivo deixou de ser uma marca amadora e se tornou uma holding com quatro empresas ativas — cidadania italiana, podcast, eventos e consultoria de carreira — expandindo sua atuação para mais de 9 países. Hoje é percebida como referência no setor.",
      imagem: "/assets/img/cases/arrivo-capa.jpg",
      numeros: [
        { valor: "+9", rotulo: "países de atuação" },
        { valor: "+340", rotulo: "variações da marca" },
        { valor: "4", rotulo: "empresas na holding" },
      ],
    },
  ];

  /* --- Catálogo de itens de pacote ---------------------------------------
     A lista mestre de linhas da tabela comparativa. O admin marca o valor
     de cada linha por pacote ("2x", "Sim", "—"...).
     -------------------------------------------------------------------- */

  var ITENS_PACOTE_CATALOGO = [
    "Post (1 card)",
    "Carrossel (até 10 cards)",
    "Story*",
    "Cortes de vídeos (Reels/TikTok)",
    "Edição simples até 30s (Reels/TikTok)",
    "Edição simples até 1min (Reels/TikTok)",
    "Edição simples até 3min (Reels/TikTok)",
    "Criação de conteúdo",
    "Construção da estratégia",
    "Acompanhamento de métricas (básico)",
    "Compartilhamento de relatórios",
  ];

  /* --- Redes sociais disponíveis ------------------------------------------ */

  var REDES_CATALOGO = [
    { id: "instagram", nome: "Instagram" },
    { id: "linkedin", nome: "LinkedIn" },
    { id: "tiktok", nome: "TikTok" },
    { id: "youtube", nome: "YouTube" },
    { id: "facebook", nome: "Facebook" },
    { id: "x", nome: "X / Twitter" },
    { id: "pinterest", nome: "Pinterest" },
    { id: "threads", nome: "Threads" },
    { id: "kwai", nome: "Kwai" },
    { id: "newsletter", nome: "Newsletter" },
  ];

  /* --- Formato canônico --------------------------------------------------- */

  function criarPropostaVazia() {
    return {
      /* Identificação -------------------------------------------------- */
      slug: "",
      status: "rascunho", // rascunho | publicada | arquivada

      /* Cabeçalho da proposta ------------------------------------------ */
      cliente: {
        nome: "",
        // Artigo usado nas frases montadas: "Quem é [a] Easyfoot?".
        // Vazio para nomes que dispensam artigo ("Quem é Nike?").
        artigo: "a",
        segmento: "",
        logo: "",
      },
      titulo: "Proposta comercial com foco em gestão de marca",
      dataEnvio: "",
      dataValidade: "",

      responsavel: {
        nome: "Ricardo Carvalho",
        cargo: "Founder & Diretor Criativo",
        telefone: "+55 (51) 2165-3538",
        portfolio: "be.net/oricardocarvalho",
      },

      /* Conteúdo específico do cliente ---------------------------------
         O título do diagnóstico é montado na hora com o nome do cliente
         ("Quem é a Easyfoot?"). Em branco = usa o automático. */
      diagnostico: {
        titulo: "",
        paragrafos: [""],
      },
      objetivo: {
        titulo: "Então qual o objetivo desta proposta?",
        paragrafos: [""],
      },

      redes: [],

      /* Comercial -------------------------------------------------------
         O range abre a parte comercial. Com min e max vazios, ele é
         calculado sozinho a partir dos preços dos pacotes. */
      range: {
        min: null,
        max: null,
        nota: "Valores mensais. O detalhamento de cada pacote está logo abaixo.",
      },
      pacotes: [],
      observacoes: [],

      /* Institucional (pré-preenchido, editável) ------------------------ */
      sobre: SOBRE_PADRAO,
      servicos: SERVICOS_PADRAO,
      metodo: METODO_PADRAO,
      bonus: BONUS_PADRAO,
      expansoes: EXPANSOES_PADRAO,
      cases: CASES_PADRAO,
      depoimentos: DEPOIMENTOS_PADRAO,

      /* Chamada para ação ----------------------------------------------- */
      cta: {
        whatsapp: "5551216535 38".replace(/\s/g, ""),
        titulo: "Vamos começar?",
        texto:
          "Se fez sentido, me chama no WhatsApp. Respondo pessoalmente e a gente ajusta o que for preciso.",
      },
    };
  }

  /* --- Pacote em branco ---------------------------------------------------- */

  function criarPacoteVazio(nome) {
    return {
      nome: nome || "",
      preco: null,
      periodo: "/mensal",
      destaque: false,
      resumo: [], // [{ valor: "8x", rotulo: "postagens mensais" }]
      // itens: [{ label, incluso: true, valor: "4x" }]
      // incluso = false deixa a linha acinzentada, mostrando o que falta
      itens: [], // [{ label: "Post (1 card)", valor: "4x" }]
    };
  }

  /* --- Normalização --------------------------------------------------------
     Preenche o que faltar sem sobrescrever o que existe. Assim, uma proposta
     salva antes de um campo novo existir continua abrindo normalmente.
     ---------------------------------------------------------------------- */

  function ehObjeto(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function mesclarProfundo(base, dados) {
    var saida = Array.isArray(base) ? base.slice() : Object.assign({}, base);

    if (!ehObjeto(dados)) return saida;

    Object.keys(dados).forEach(function (chave) {
      var valor = dados[chave];
      if (valor === undefined) return;

      if (ehObjeto(valor) && ehObjeto(saida[chave])) {
        saida[chave] = mesclarProfundo(saida[chave], valor);
      } else {
        saida[chave] = valor;
      }
    });

    return saida;
  }

  function normalizar(dados) {
    var proposta = mesclarProfundo(criarPropostaVazia(), dados || {});

    // Campos que precisam ser array mesmo se vierem nulos do banco
    ["redes", "pacotes", "observacoes", "servicos", "bonus", "cases", "depoimentos"].forEach(
      function (chave) {
        if (!Array.isArray(proposta[chave])) proposta[chave] = [];
      }
    );

    ["diagnostico", "objetivo"].forEach(function (chave) {
      if (!Array.isArray(proposta[chave].paragrafos)) {
        proposta[chave].paragrafos = [];
      }
      // Descarta parágrafos vazios que sobram do formulário
      proposta[chave].paragrafos = proposta[chave].paragrafos.filter(function (p) {
        return String(p || "").trim() !== "";
      });
    });

    proposta.pacotes = proposta.pacotes.map(function (p) {
      var pacote = mesclarProfundo(criarPacoteVazio(), p);
      if (!Array.isArray(pacote.resumo)) pacote.resumo = [];
      if (!Array.isArray(pacote.itens)) pacote.itens = [];

      pacote.itens = pacote.itens.map(function (item) {
        var valor = String(item.valor === null || item.valor === undefined ? "" : item.valor).trim();

        // Propostas antigas guardavam só o valor, usando "—" para ausente.
        // Aqui esse formato vira o par incluso + valor.
        var incluso =
          typeof item.incluso === "boolean"
            ? item.incluso
            : valor !== "" && valor !== "—" && valor !== "-" && valor !== "---";

        return {
          label: String(item.label || ""),
          incluso: incluso,
          valor: incluso ? valor || "Sim" : "",
        };
      });

      return pacote;
    });

    // Só um pacote pode ser o destaque
    var jaTemDestaque = false;
    proposta.pacotes.forEach(function (p) {
      if (p.destaque && jaTemDestaque) p.destaque = false;
      if (p.destaque) jaTemDestaque = true;
    });

    // Range vazio = calculado a partir dos pacotes na hora de exibir
    ["min", "max"].forEach(function (extremo) {
      var valor = Number(proposta.range[extremo]);
      proposta.range[extremo] = isFinite(valor) && valor > 0 ? valor : null;
    });

    proposta.cta.whatsapp = String(proposta.cta.whatsapp || "").replace(/\D/g, "");

    return proposta;
  }

  /* --- Exportação ---------------------------------------------------------- */

  Temeron.modelo = {
    criarPropostaVazia: criarPropostaVazia,
    criarPacoteVazio: criarPacoteVazio,
    normalizar: normalizar,
    mesclarProfundo: mesclarProfundo,
    ITENS_PACOTE_CATALOGO: ITENS_PACOTE_CATALOGO,
    REDES_CATALOGO: REDES_CATALOGO,
  };
})(window);
