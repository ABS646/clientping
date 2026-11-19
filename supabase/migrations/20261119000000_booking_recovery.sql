-- DueNudge booking and revenue-recovery MVP.
-- Apply this migration to the Supabase project before deploying the new app code.
-- Existing clients/reminders/profiles tables are intentionally left unchanged.

create extension if not exists pgcrypto;

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  industry text not null default 'salon',
  timezone text not null default 'Africa/Lagos',
  currency text not null default 'NGN',
  deposit_terms text,
  reminder_hours integer not null default 24 check (reminder_hours between 1 and 168),
  winback_days integer not null default 30 check (winback_days between 7 and 365),
  paystack_subaccount_code text unique,
  paystack_account_name text,
  paystack_settlement_bank text,
  paystack_connected_at timestamptz,
  paystack_status text not null default 'not_connected' check (paystack_status in ('not_connected','connecting','connected','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_settings(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 1440),
  price numeric(12,2) not null default 0 check (price >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0 and deposit_amount <= price),
  currency text not null default 'NGN',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_settings(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  marketing_opt_in boolean not null default false,
  marketing_unsubscribe_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  last_visit_at timestamptz,
  winback_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists customers_business_email_unique
  on public.customers (business_id, lower(email));

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_settings(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_name text not null,
  booking_type text not null default 'appointment' check (booking_type in ('appointment','order')),
  starts_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested','pending_payment','awaiting_confirmation','confirmed','completed','no_show','cancelled')),
  service_price numeric(12,2) not null default 0 check (service_price >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  deposit_status text not null default 'not_required' check (deposit_status in ('not_required','pending','paid','failed')),
  deposit_terms_snapshot text,
  deposit_terms_accepted_at timestamptz,
  paystack_reference text unique,
  customer_note text,
  reminder_sent_at timestamptz,
  no_show_recovery_sent_at timestamptz,
  winback_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bookings_business_starts_at_idx
  on public.bookings (business_id, starts_at desc);
create index if not exists bookings_reminder_due_idx
  on public.bookings (starts_at, status, reminder_sent_at);
create index if not exists customers_winback_due_idx
  on public.customers (business_id, last_visit_at, marketing_opt_in, winback_sent_at);

create table if not exists public.message_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_settings(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  kind text not null check (kind in ('booking_confirmation','appointment_reminder','winback')),
  recipient text not null,
  subject text not null,
  sent_at timestamptz not null default now(),
  provider_id text
);

alter table public.business_settings enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.message_log enable row level security;

-- Dashboard access is limited to the authenticated owner. Public booking writes and
-- payment webhooks run through server routes that validate input and use service role.
drop policy if exists business_settings_owner_all on public.business_settings;
create policy business_settings_owner_all on public.business_settings
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists services_owner_all on public.services;
create policy services_owner_all on public.services
  for all to authenticated using (
    exists (select 1 from public.business_settings b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.business_settings b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists customers_owner_all on public.customers;
create policy customers_owner_all on public.customers
  for all to authenticated using (
    exists (select 1 from public.business_settings b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.business_settings b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists bookings_owner_all on public.bookings;
create policy bookings_owner_all on public.bookings
  for all to authenticated using (
    exists (select 1 from public.business_settings b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.business_settings b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists message_log_owner_select on public.message_log;
create policy message_log_owner_select on public.message_log
  for select to authenticated using (
    exists (select 1 from public.business_settings b where b.id = business_id and b.owner_id = auth.uid())
  );
