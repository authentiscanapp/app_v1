-- ════════════════════════════════════════════════════════════════
-- AuthentiScan Pro — Public API key store & usage log
-- Run this once in the Supabase SQL editor.
-- Keys are stored as SHA-256 hashes (never plaintext).
-- Both tables are accessed only via the service role (server-side);
-- RLS is enabled with no public policies, so they are locked to clients.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  key_hash    text not null unique,          -- sha256(api_key)
  key_prefix  text not null,                 -- e.g. "ask_test_a-BUfAO" (display only)
  label       text,                          -- who the key belongs to
  plan        text not null default 'test',  -- test | starter | pro | enterprise
  daily_limit int  not null default 100,     -- 0 or null = unlimited
  active      boolean not null default true,
  total_requests bigint not null default 0,
  last_used_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.api_requests (
  id          bigint generated always as identity primary key,
  api_key_id  uuid not null references public.api_keys(id) on delete cascade,
  mode        text,        -- url | text | audio
  risk_level  text,        -- low | medium | high | critical
  score       int,
  created_at  timestamptz not null default now()
);

create index if not exists api_requests_key_day_idx
  on public.api_requests (api_key_id, created_at);

alter table public.api_keys    enable row level security;
alter table public.api_requests enable row level security;

-- ── Seed the tester's sandbox key ─────────────────────────────────
-- Plaintext key lives only in API_KEYS.txt (gitignored). Only the hash is stored.
insert into public.api_keys (key_hash, key_prefix, label, plan, daily_limit, active)
values (
  'c15511b02c86f9be80e62cfca92ce02ff68ed329c191e333548c433bac968091',
  'ask_test_a-BUfAO',
  'Sandbox tester',
  'test',
  100,
  true
)
on conflict (key_hash) do update
  set active = true, daily_limit = excluded.daily_limit, label = excluded.label;

-- ── (Optional) Production key — uncomment to enable ───────────────
-- Plaintext key lives only in API_KEYS.txt (gitignored).
-- insert into public.api_keys (key_hash, key_prefix, label, plan, daily_limit, active)
-- values (
--   '5c63a1912c41301011feaed1c93eb760fe161b836b875cc9318cd1f82ed9c0e3',
--   'authentiscan_sk_live_eDrRhrq',
--   'Production',
--   'pro',
--   5000,
--   true
-- ) on conflict (key_hash) do nothing;
