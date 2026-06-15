-- ============================================================
-- FitForge — Initial schema with Row Level Security
-- All user data is scoped to auth.uid()
-- (This script was applied to Supabase via migration fitforge_init_schema)
-- ============================================================

-- ─── Profiles (mirrors auth.users) ──────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  gender text not null default 'male',
  age integer,
  weight numeric,
  height numeric,
  goal text default 'get_fit',
  subscription text not null default 'trial',
  trial_start_date timestamptz default now(),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ─── Legacy workouts ────────────────────────────────────────
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  duration integer not null default 0,
  calories integer not null default 0,
  date timestamptz not null default now(),
  notes text,
  category text,
  created_at timestamptz not null default now()
);
create index if not exists workouts_user_id_idx on public.workouts(user_id);

-- ─── Workout sessions (builder) ─────────────────────────────
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_name text not null default '',
  category text not null default 'strength',
  exercise_logs jsonb not null default '[]'::jsonb,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  duration integer not null default 0,
  total_calories integer not null default 0,
  new_prs jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists workout_sessions_user_id_idx on public.workout_sessions(user_id);

-- ─── Personal records ───────────────────────────────────────
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  exercise_name text not null,
  type text not null,
  value numeric not null,
  unit text not null,
  date timestamptz not null default now(),
  workout_id text
);
create index if not exists personal_records_user_id_idx on public.personal_records(user_id);

-- ─── Body measurements ──────────────────────────────────────
create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null default now(),
  weight numeric,
  body_fat numeric,
  chest numeric,
  waist numeric,
  hips numeric,
  arms numeric,
  legs numeric
);
create index if not exists body_measurements_user_id_idx on public.body_measurements(user_id);

-- ─── Subscriptions ──────────────────────────────────────────
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null,
  start_date timestamptz not null default now(),
  status text not null default 'active',
  updated_at timestamptz not null default now()
);

-- ─── Calorie entries ────────────────────────────────────────
create table if not exists public.calorie_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  name text not null,
  calories integer not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric,
  sodium numeric,
  meal_type text not null default 'breakfast',
  time text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists calorie_entries_user_date_idx on public.calorie_entries(user_id, date_key);

-- ─── Water intake (per day) ─────────────────────────────────
create table if not exists public.water_intake (
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  cups integer not null default 0,
  primary key (user_id, date_key)
);

-- ─── AI usage (per day, for freemium limits) ────────────────
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  count integer not null default 0,
  primary key (user_id, date_key)
);

-- ============================================================
-- Enable Row Level Security + policies
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.personal_records  enable row level security;
alter table public.body_measurements enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.calorie_entries   enable row level security;
alter table public.water_intake      enable row level security;
alter table public.ai_usage          enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

create policy "workouts_all_own" on public.workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_all_own" on public.workout_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prs_all_own" on public.personal_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "measurements_all_own" on public.body_measurements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_all_own" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "calories_all_own" on public.calorie_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "water_all_own" on public.water_intake for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_usage_all_own" on public.ai_usage for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create a profile row when a new auth user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, gender, goal, subscription, trial_start_date, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'gender', 'male'),
    coalesce(new.raw_user_meta_data->>'goal', 'get_fit'),
    'trial',
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
