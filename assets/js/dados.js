/* ==========================================================================
   Temeron — Camada de dados
   --------------------------------------------------------------------------
   Todo acesso a dados passa por aqui. O resto da aplicação nunca fala com o
   Supabase diretamente — assim, trocar de backend um dia significa reescrever
   só este arquivo.

   Dois modos, escolhidos automaticamente:

     • "supabase" — config.js preenchido. Modo real: propostas no banco,
       login por e-mail e senha, link publicado funciona para o cliente.

     • "local" — config.js vazio. Modo demonstração: tudo fica no
       localStorage deste navegador, sem login. Serve para experimentar o
       painel antes de criar a conta. NÃO use com cliente de verdade: os
       dados somem se você limpar o navegador e o link não abre em outro
       aparelho.
   ========================================================================== */

(function (global) {
  "use strict";

  var Temeron = (global.Temeron = global.Temeron || {});
  var config = Temeron.config;
  var modelo = Temeron.modelo;

  var TABELA = "propostas";
  var CHAVE_LOCAL = "temeron-propostas-demo";
  var cliente = null;

  /* --- Erro de domínio -----------------------------------------------------
     Diferencia "não achei" de "deu ruim", para a interface reagir certo.
     ---------------------------------------------------------------------- */

  function ErroDados(mensagem, codigo, causa) {
    this.name = "ErroDados";
    this.message = mensagem;
    this.codigo = codigo || "desconhecido"; // nao-encontrada | sem-permissao | rede | config
    this.causa = causa || null;
  }
  ErroDados.prototype = Object.create(Error.prototype);
  ErroDados.prototype.constructor = ErroDados;

  function modo() {
    return config.temSupabase() ? "supabase" : "local";
  }

  /* ======================================================================
     Tradução banco <-> aplicação
     Colunas soltas (slug, status, datas) existem para listar e filtrar sem
     abrir o JSON inteiro. O documento completo mora em "conteudo".
     ====================================================================== */

  function paraAplicacao(linha) {
    if (!linha) return null;
    var proposta = modelo.normalizar(linha.conteudo || {});
    proposta.id = linha.id;
    proposta.slug = linha.slug;
    proposta.status = linha.status;
    proposta.criadoEm = linha.criado_em;
    proposta.atualizadoEm = linha.atualizado_em;
    return proposta;
  }

  function paraBanco(proposta) {
    var conteudo = Temeron.utils.clonar(proposta);
    // Metadados vivem nas colunas, não dentro do JSON
    delete conteudo.id;
    delete conteudo.criadoEm;
    delete conteudo.atualizadoEm;

    return {
      slug: proposta.slug,
      status: proposta.status || "rascunho",
      cliente_nome: (proposta.cliente && proposta.cliente.nome) || "",
      data_envio: proposta.dataEnvio || null,
      data_validade: proposta.dataValidade || null,
      conteudo: conteudo,
    };
  }

  /* ======================================================================
     BACKEND A — Supabase
     ====================================================================== */

  function obterCliente() {
    if (cliente) return cliente;

    if (!global.supabase || typeof global.supabase.createClient !== "function") {
      throw new ErroDados("A biblioteca do Supabase não carregou. Verifique sua conexão.", "rede");
    }

    cliente = global.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "temeron-propostas-auth",
      },
    });

    return cliente;
  }

  function traduzirErro(erro, contexto) {
    if (!erro) return null;
    var codigo = "desconhecido";
    var mensagem = erro.message || "Erro inesperado.";

    if (erro.code === "PGRST116") {
      codigo = "nao-encontrada";
      mensagem = "Proposta não encontrada.";
    } else if (erro.code === "42501" || /row-level security|permission/i.test(mensagem)) {
      codigo = "sem-permissao";
      mensagem =
        "Sem permissão para esta operação. Confirme se o seu e-mail está na tabela " +
        "administradores do Supabase.";
    } else if (erro.code === "23505") {
      codigo = "slug-duplicado";
      mensagem = "Já existe uma proposta com esse endereço. Clique em “Gerar” para criar outro.";
    } else if (/fetch|network/i.test(mensagem)) {
      codigo = "rede";
      mensagem = "Não foi possível conectar. Verifique sua internet.";
    }

    return new ErroDados(mensagem, codigo, { contexto: contexto, original: erro });
  }

  var supa = {
    buscarPublicada: function (slug) {
      return obterCliente()
        .from(TABELA)
        .select("id, slug, status, conteudo, criado_em, atualizado_em")
        .eq("slug", slug)
        .eq("status", "publicada")
        .maybeSingle()
        .then(function (r) {
          if (r.error) throw traduzirErro(r.error, "buscarPublicada");
          if (!r.data) {
            throw new ErroDados(
              "Esta proposta não existe ou ainda não foi publicada.",
              "nao-encontrada"
            );
          }
          return paraAplicacao(r.data);
        });
    },

    listar: function (filtros) {
      var consulta = obterCliente()
        .from(TABELA)
        .select("id, slug, status, cliente_nome, data_envio, data_validade, atualizado_em")
        .order("atualizado_em", { ascending: false });

      if (filtros.status && filtros.status !== "todas") {
        consulta = consulta.eq("status", filtros.status);
      }
      if (filtros.busca) {
        consulta = consulta.ilike("cliente_nome", "%" + filtros.busca + "%");
      }

      return consulta.then(function (r) {
        if (r.error) throw traduzirErro(r.error, "listar");
        return r.data || [];
      });
    },

    obter: function (id) {
      return obterCliente()
        .from(TABELA)
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .then(function (r) {
          if (r.error) throw traduzirErro(r.error, "obter");
          if (!r.data) throw new ErroDados("Proposta não encontrada.", "nao-encontrada");
          return paraAplicacao(r.data);
        });
    },

    criar: function (proposta) {
      return obterCliente()
        .from(TABELA)
        .insert(paraBanco(proposta))
        .select()
        .single()
        .then(function (r) {
          if (r.error) throw traduzirErro(r.error, "criar");
          return paraAplicacao(r.data);
        });
    },

    atualizar: function (id, proposta) {
      return obterCliente()
        .from(TABELA)
        .update(paraBanco(proposta))
        .eq("id", id)
        .select()
        .single()
        .then(function (r) {
          if (r.error) throw traduzirErro(r.error, "atualizar");
          return paraAplicacao(r.data);
        });
    },

    excluir: function (id) {
      return obterCliente()
        .from(TABELA)
        .delete()
        .eq("id", id)
        .then(function (r) {
          if (r.error) throw traduzirErro(r.error, "excluir");
          return true;
        });
    },

    entrar: function (email, senha) {
      return obterCliente()
        .auth.signInWithPassword({ email: email, password: senha })
        .then(function (r) {
          if (r.error) throw new ErroDados("E-mail ou senha incorretos.", "sem-permissao", r.error);
          return r.data.user;
        });
    },

    sair: function () {
      return obterCliente()
        .auth.signOut()
        .then(function () {
          return true;
        });
    },

    sessaoAtual: function () {
      return obterCliente()
        .auth.getSession()
        .then(function (r) {
          return (r.data && r.data.session) || null;
        });
    },
  };

  /* ======================================================================
     BACKEND B — localStorage (modo demonstração)
     ====================================================================== */

  function lerArmazenamento() {
    try {
      var bruto = global.localStorage.getItem(CHAVE_LOCAL);
      var lista = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  }

  function gravarArmazenamento(lista) {
    try {
      global.localStorage.setItem(CHAVE_LOCAL, JSON.stringify(lista));
    } catch (e) {
      throw new ErroDados(
        "O navegador não deixou salvar (armazenamento cheio ou janela anônima).",
        "rede",
        e
      );
    }
  }

  function idAleatorio() {
    return "demo-" + Date.now().toString(36) + "-" + Temeron.utils.sufixoAleatorio(4);
  }

  var local = {
    buscarPublicada: function (slug) {
      // 1) Propostas criadas no painel em modo demonstração
      var salva = lerArmazenamento().filter(function (l) {
        return l.slug === slug && l.status === "publicada";
      })[0];

      if (salva) return Promise.resolve(paraAplicacao(salva));

      // 2) Arquivos JSON versionados em /dados/propostas
      var caminho = Temeron.caminhoBase() + config.pastaDadosLocais + "/" + slug + ".json";

      return fetch(caminho, { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) {
            throw new ErroDados(
              "Esta proposta não existe ou ainda não foi publicada.",
              "nao-encontrada"
            );
          }
          return r.json();
        })
        .then(function (json) {
          var proposta = modelo.normalizar(json);
          proposta.slug = slug;
          proposta.status = "publicada";
          return proposta;
        })
        .catch(function (e) {
          if (e instanceof ErroDados) throw e;
          throw new ErroDados(
            "Não consegui ler a proposta. Se você abriu o arquivo com duplo clique, o navegador " +
              "bloqueia a leitura por segurança — use o servidor local ou publique no Netlify.",
            "rede",
            e
          );
        });
    },

    listar: function (filtros) {
      var lista = lerArmazenamento();

      if (filtros.status && filtros.status !== "todas") {
        lista = lista.filter(function (l) {
          return l.status === filtros.status;
        });
      }
      if (filtros.busca) {
        var termo = filtros.busca.toLowerCase();
        lista = lista.filter(function (l) {
          return String(l.cliente_nome || "").toLowerCase().indexOf(termo) !== -1;
        });
      }

      lista.sort(function (a, b) {
        return String(b.atualizado_em).localeCompare(String(a.atualizado_em));
      });

      return Promise.resolve(lista);
    },

    obter: function (id) {
      var linha = lerArmazenamento().filter(function (l) {
        return l.id === id;
      })[0];

      if (!linha) {
        return Promise.reject(new ErroDados("Proposta não encontrada.", "nao-encontrada"));
      }
      return Promise.resolve(paraAplicacao(linha));
    },

    criar: function (proposta) {
      var lista = lerArmazenamento();

      if (
        lista.some(function (l) {
          return l.slug === proposta.slug;
        })
      ) {
        return Promise.reject(
          new ErroDados("Já existe uma proposta com esse endereço.", "slug-duplicado")
        );
      }

      var linha = paraBanco(proposta);
      linha.id = idAleatorio();
      linha.criado_em = new Date().toISOString();
      linha.atualizado_em = linha.criado_em;

      lista.push(linha);
      gravarArmazenamento(lista);

      return Promise.resolve(paraAplicacao(linha));
    },

    atualizar: function (id, proposta) {
      var lista = lerArmazenamento();
      var posicao = -1;

      lista.forEach(function (l, i) {
        if (l.id === id) posicao = i;
      });

      if (posicao === -1) {
        return Promise.reject(new ErroDados("Proposta não encontrada.", "nao-encontrada"));
      }

      var linha = paraBanco(proposta);
      linha.id = id;
      linha.criado_em = lista[posicao].criado_em;
      linha.atualizado_em = new Date().toISOString();

      lista[posicao] = linha;
      gravarArmazenamento(lista);

      return Promise.resolve(paraAplicacao(linha));
    },

    excluir: function (id) {
      gravarArmazenamento(
        lerArmazenamento().filter(function (l) {
          return l.id !== id;
        })
      );
      return Promise.resolve(true);
    },

    entrar: function () {
      return Promise.resolve({ email: "demonstracao" });
    },

    sair: function () {
      return Promise.resolve(true);
    },

    // Em modo demonstração não há login: a sessão é sempre válida
    sessaoAtual: function () {
      return Promise.resolve({ demonstracao: true });
    },
  };

  /* ======================================================================
     Despacho
     ====================================================================== */

  function backend() {
    return modo() === "supabase" ? supa : local;
  }

  function buscarPublicada(slug) {
    if (!slug) {
      return Promise.reject(new ErroDados("Endereço da proposta ausente.", "nao-encontrada"));
    }
    return backend().buscarPublicada(slug);
  }

  function listar(filtros) {
    return backend().listar(filtros || {});
  }

  function obter(id) {
    return backend().obter(id);
  }

  function salvar(proposta) {
    return proposta.id
      ? backend().atualizar(proposta.id, proposta)
      : backend().criar(proposta);
  }

  function excluir(id) {
    return backend().excluir(id);
  }

  function duplicar(id) {
    return obter(id).then(function (original) {
      var copia = Temeron.utils.clonar(original);
      delete copia.id;
      copia.status = "rascunho";
      copia.cliente.nome = original.cliente.nome + " (cópia)";
      copia.slug = Temeron.utils.gerarSlug(original.cliente.nome);
      return backend().criar(copia);
    });
  }

  function entrar(email, senha) {
    return backend().entrar(email, senha);
  }

  function sair() {
    return backend().sair();
  }

  function sessaoAtual() {
    return backend().sessaoAtual();
  }

  Temeron.dados = {
    ErroDados: ErroDados,
    modo: modo,
    buscarPublicada: buscarPublicada,
    listar: listar,
    obter: obter,
    salvar: salvar,
    duplicar: duplicar,
    excluir: excluir,
    entrar: entrar,
    sair: sair,
    sessaoAtual: sessaoAtual,
  };
})(window);
