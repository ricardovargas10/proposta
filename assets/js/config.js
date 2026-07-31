/* ==========================================================================
   Temeron — Configuração
   --------------------------------------------------------------------------
   PREENCHA OS DOIS CAMPOS ABAIXO com os dados do seu projeto Supabase.
   Onde achar: painel do Supabase > Project Settings > Data API.

   A "anon key" é PÚBLICA por natureza — ela pode ficar aqui no código sem
   risco. Quem protege os dados é o Row Level Security (RLS) configurado em
   supabase/schema.sql, não o segredo da chave. Nunca coloque aqui a
   "service_role key": essa sim ignora o RLS e daria acesso total.
   ========================================================================== */

(function (global) {
  "use strict";

  var Temeron = (global.Temeron = global.Temeron || {});

  Temeron.config = {
    /* --- Supabase ------------------------------------------------------ */
    supabaseUrl: "https://lgzwjqpnngwiblnjnttu.supabase.co",

    // FALTA PREENCHER. Não é uma URL: é uma chave longa que começa com "eyJ".
    // Supabase > Project Settings > API Keys > "anon public" > botão de copiar.
    supabaseAnonKey: "",

    /* --- Contato ------------------------------------------------------- */
    // Somente dígitos, com código do país. 55 = Brasil, 51 = Porto Alegre.
    whatsappPadrao: "555121653538",

    /* --- Marca --------------------------------------------------------- */
    nomeEstudio: "Temeron",
    siteEstudio: "https://temeron.co",

    /* --- Comportamento ------------------------------------------------- */
    // Sem Supabase configurado, a proposta cai para os arquivos em /dados.
    // Útil para testar o layout antes de criar a conta.
    pastaDadosLocais: "dados/propostas",
    slugDemonstracao: "demo",
  };

  Temeron.config.temSupabase = function () {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey);
  };
})(window);