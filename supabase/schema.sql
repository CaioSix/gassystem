-- Execute este SQL no "SQL Editor" do seu painel no Supabase (https://supabase.com)

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  address_number text not null,
  neighborhood text not null,
  reference text default '',
  payment_method text not null,
  change_for text default '',
  items jsonb not null default '[]'::jsonb,
  total numeric(10, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'delivering', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilita Row Level Security (RLS) com políticas abertas para o MVP
alter table public.orders enable row level security;

create policy "Permitir insercao publica de pedidos"
  on public.orders for insert
  with check (true);

create policy "Permitir leitura de pedidos"
  on public.orders for select
  using (true);

create policy "Permitir atualizacao de status dos pedidos"
  on public.orders for update
  using (true);

create policy "Permitir exclusao de pedidos"
  on public.orders for delete
  using (true);

-- Habilita Realtime para a tabela orders (atualização instantânea na tela do cliente e do dono)
alter publication supabase_realtime add table public.orders;
