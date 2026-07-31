-- ============================================================================
-- Temeron — Banco de propostas
-- ----------------------------------------------------------------------------
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em RUN.
-- Pode rodar mais de uma vez sem problema: tudo é idempotente.
--
-- IMPORTANTE, antes de usar em produção:
--   Authentication > Providers > Email  ->  desligue "Enable sign ups".
--   Sem isso, qualquer pessoa poderia criar uma conta. Mesmo assim, a
--   tabela "administradores" abaixo já barra quem não estiver na lista.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. Quem pode administrar
-- ----------------------------------------------------------------------------
-- Só os e-mails desta tabela conseguem criar, editar ou apagar propostas.
-- Ela é gerenciada aqui pelo SQL Editor — não fica exposta na API.
-- ============================================================================

create table if not exists public.administradores (
  email      text primary key,
  criado_em  timestamptz not null default now()
);

alter table public.administradores enable row level security;

-- Nenhuma política de leitura = ninguém acessa pela API pública.
-- A função eh_admin() abaixo consulta a tabela com SECURITY DEFINER.

-- E-mails que administram o painel. Cada um só funciona de verdade se houver
-- um usuário correspondente em Authentication > Users.
-- Para revogar um acesso: delete from public.administradores where email = '...';
insert into public.administradores (email)
values
  ('rfcvargas00@gmail.com'),
  ('ricardo@temeron.com.br')
on conflict (email) do nothing;


-- ============================================================================
-- 2. Função de verificação
-- ============================================================================

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.administradores a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to authenticated;


-- ============================================================================
-- 3. Tabela de propostas
-- ----------------------------------------------------------------------------
-- O documento inteiro mora em "conteudo" (jsonb). As colunas soltas existem
-- para listar, filtrar e ordenar sem precisar abrir o JSON.
-- ============================================================================

create table if not exists public.propostas (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  status         text not null default 'rascunho'
                 check (status in ('rascunho', 'publicada', 'arquivada')),
  cliente_nome   text not null default '',
  data_envio     date,
  data_validade  date,
  conteudo       jsonb not null default '{}'::jsonb,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index if not exists propostas_status_idx on public.propostas (status);
create index if not exists propostas_atualizado_idx on public.propostas (atualizado_em desc);
create index if not exists propostas_cliente_idx on public.propostas (lower(cliente_nome));


-- ============================================================================
-- 4. Carimbo automático de atualização
-- ============================================================================

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists propostas_atualizado_em on public.propostas;

create trigger propostas_atualizado_em
  before update on public.propostas
  for each row
  execute function public.tocar_atualizado_em();


-- ============================================================================
-- 5. Segurança de linha (RLS)
-- ----------------------------------------------------------------------------
-- É isto que protege os dados — não o segredo da chave anon, que é pública
-- por design e fica visível no código do site.
-- ============================================================================

alter table public.propostas enable row level security;

drop policy if exists "publicadas sao visiveis" on public.propostas;
drop policy if exists "admin le tudo"          on public.propostas;
drop policy if exists "admin insere"           on public.propostas;
drop policy if exists "admin atualiza"         on public.propostas;
drop policy if exists "admin exclui"           on public.propostas;

-- Visitante anônimo (o cliente com o link): só enxerga o que foi publicado.
-- Rascunhos e arquivadas ficam invisíveis, mesmo que alguém saiba o endereço.
create policy "publicadas sao visiveis"
  on public.propostas
  for select
  to anon, authenticated
  using (status = 'publicada');

-- Administrador: acesso completo.
create policy "admin le tudo"
  on public.propostas
  for select
  to authenticated
  using (public.eh_admin());

create policy "admin insere"
  on public.propostas
  for insert
  to authenticated
  with check (public.eh_admin());

create policy "admin atualiza"
  on public.propostas
  for update
  to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

create policy "admin exclui"
  on public.propostas
  for delete
  to authenticated
  using (public.eh_admin());


-- ============================================================================
-- 6. Conferência rápida
-- ----------------------------------------------------------------------------
-- Depois de rodar, isto deve devolver "true" para o seu e-mail.
-- (Só funciona quando executado por um usuário logado; no SQL Editor
--  provavelmente retorna false, o que é esperado.)
-- ============================================================================

-- select public.eh_admin();
-- select id, slug, status, cliente_nome from public.propostas order by atualizado_em desc;
