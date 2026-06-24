-- Colette dashboard: run this once in Supabase > SQL Editor.

create table if not exists public.prebookings (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation', 'paid', 'cancelled')),
  client_name text not null,
  client_email text not null,
  client_tel text,
  adresse text,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  slot_label text,
  total integer not null check (total >= 0),
  commentaire text,
  configuration jsonb not null default '{}'::jsonb,
  stripe_checkout_session_id text unique,
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists prebookings_status_created_at_idx
  on public.prebookings (status, created_at desc);

-- If the table already exists, run this migration once as well.
alter table public.prebookings drop constraint if exists prebookings_status_check;
alter table public.prebookings add constraint prebookings_status_check
  check (status in ('pending_confirmation', 'paid', 'cancelled'));

alter table public.prebookings enable row level security;

-- There is no public signup in the dashboard. Any manually created,
-- authenticated Colette user may read the dashboard.
create policy "Authenticated Colette users can read prebookings"
  on public.prebookings
  for select
  to authenticated
  using (true);
