create table if not exists public.trades (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  symbol text not null,
  entry_price numeric not null,
  quantity integer not null,
  platform text not null,
  entry_fees numeric not null default 0,
  entry_date date not null,
  stop_loss numeric,
  target_price numeric,
  setup text,
  conviction integer,
  notes text,
  exit_price numeric,
  exit_fees numeric default 0,
  exit_date date,
  outcome_tag text,
  exit_notes text,
  created_at timestamptz not null default now()
);

alter table public.trades enable row level security;

create policy "Users can view own trades"
on public.trades
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can insert own trades"
on public.trades
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can update own trades"
on public.trades
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can delete own trades"
on public.trades
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create index if not exists trades_user_id_idx on public.trades (user_id);
