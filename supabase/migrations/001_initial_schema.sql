-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  track_primary text,
  interests text[] default '{}',
  skill_level int not null default 1 check (skill_level between 1 and 5),
  daily_target_minutes int not null default 5 check (daily_target_minutes in (2, 5, 10)),
  onboarding_completed bool not null default false
);

create table scenarios (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  difficulty int not null check (difficulty between 1 and 5),
  prompt text not null check (char_length(prompt) <= 500),
  options jsonb not null,
  correct_option char(1) not null,
  answer_defensibility int not null check (answer_defensibility between 1 and 100),
  reveal_summary text not null check (char_length(reveal_summary) <= 280),
  reveal_detail text not null,
  tags text[] default '{}',
  source_title text,
  source_url text,
  nudge_framework text,
  nudge_text text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  scenario_id uuid not null references scenarios(id) on delete cascade,
  chosen_option char(1) not null,
  confidence int not null check (confidence between 50 and 95),
  is_correct bool not null,
  response_time_ms int not null,
  session_id uuid not null,
  created_at timestamptz not null default now()
);

create table user_stats (
  user_id uuid primary key references users(id) on delete cascade,
  total_attempts int not null default 0,
  total_correct int not null default 0,
  avg_confidence numeric(5,2) not null default 0,
  avg_accuracy numeric(5,4) not null default 0,
  brier_score numeric(5,4) not null default 0,
  overconfidence_index numeric(5,4) not null default 0,
  streak_current int not null default 0,
  streak_best int not null default 0,
  updated_at timestamptz not null default now()
);

create table scenario_stats (
  scenario_id uuid primary key references scenarios(id) on delete cascade,
  total_attempts int not null default 0,
  accuracy_rate numeric(5,4) not null default 0,
  avg_confidence numeric(5,2) not null default 0,
  option_distribution jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table user_saved_frameworks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  framework_name text not null,
  nudge_text text not null,
  scenario_id uuid not null references scenarios(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_attempts_user on attempts(user_id);
create index idx_attempts_scenario on attempts(scenario_id);
create index idx_attempts_session on attempts(session_id);
create index idx_attempts_created on attempts(user_id, created_at desc);
create index idx_scenarios_status on scenarios(status);
create index idx_scenarios_domain on scenarios(domain);
create index idx_scenarios_difficulty on scenarios(difficulty);
create index idx_saved_frameworks_user on user_saved_frameworks(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table scenarios enable row level security;
alter table attempts enable row level security;
alter table user_stats enable row level security;
alter table scenario_stats enable row level security;
alter table user_saved_frameworks enable row level security;

-- Users: can read/update own row, insert own row
create policy "users_select_own" on users for select using (auth.uid() = id);
create policy "users_insert_own" on users for insert with check (auth.uid() = id);
create policy "users_update_own" on users for update using (auth.uid() = id);

-- Scenarios: anyone authenticated can read published
create policy "scenarios_select_published" on scenarios for select
  using (status = 'published');

-- Attempts: users manage own
create policy "attempts_select_own" on attempts for select using (auth.uid() = user_id);
create policy "attempts_insert_own" on attempts for insert with check (auth.uid() = user_id);

-- User stats: own only
create policy "user_stats_select_own" on user_stats for select using (auth.uid() = user_id);
create policy "user_stats_insert_own" on user_stats for insert with check (auth.uid() = user_id);
create policy "user_stats_update_own" on user_stats for update using (auth.uid() = user_id);

-- Scenario stats: anyone authenticated can read
create policy "scenario_stats_select" on scenario_stats for select using (true);

-- Saved frameworks: own only
create policy "saved_frameworks_select_own" on user_saved_frameworks for select using (auth.uid() = user_id);
create policy "saved_frameworks_insert_own" on user_saved_frameworks for insert with check (auth.uid() = user_id);
create policy "saved_frameworks_delete_own" on user_saved_frameworks for delete using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

create or replace function recompute_user_stats(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total int;
  v_correct int;
  v_avg_conf numeric;
  v_avg_acc numeric;
  v_brier numeric;
  v_overconf numeric;
  v_streak_current int := 0;
  v_streak_best int := 0;
  v_run int := 0;
  rec record;
begin
  select
    count(*),
    count(*) filter (where is_correct),
    coalesce(avg(confidence), 0),
    case when count(*) > 0 then count(*) filter (where is_correct)::numeric / count(*) else 0 end
  into v_total, v_correct, v_avg_conf, v_avg_acc
  from attempts
  where user_id = p_user_id;

  -- Brier score: avg( (confidence/100 - is_correct)^2 )
  select coalesce(avg(power(confidence::numeric / 100.0 - (case when is_correct then 1 else 0 end), 2)), 0)
  into v_brier
  from attempts
  where user_id = p_user_id;

  -- Overconfidence index: avg(confidence/100) - accuracy
  v_overconf := coalesce(v_avg_conf / 100.0 - v_avg_acc, 0);

  -- Streaks
  for rec in
    select is_correct from attempts where user_id = p_user_id order by created_at desc
  loop
    if rec.is_correct then
      v_run := v_run + 1;
    else
      exit;
    end if;
  end loop;
  v_streak_current := v_run;

  -- Best streak
  v_run := 0;
  for rec in
    select is_correct from attempts where user_id = p_user_id order by created_at asc
  loop
    if rec.is_correct then
      v_run := v_run + 1;
      if v_run > v_streak_best then v_streak_best := v_run; end if;
    else
      v_run := 0;
    end if;
  end loop;

  insert into user_stats (user_id, total_attempts, total_correct, avg_confidence, avg_accuracy, brier_score, overconfidence_index, streak_current, streak_best, updated_at)
  values (p_user_id, v_total, v_correct, v_avg_conf, v_avg_acc, v_brier, v_overconf, v_streak_current, v_streak_best, now())
  on conflict (user_id) do update set
    total_attempts = excluded.total_attempts,
    total_correct = excluded.total_correct,
    avg_confidence = excluded.avg_confidence,
    avg_accuracy = excluded.avg_accuracy,
    brier_score = excluded.brier_score,
    overconfidence_index = excluded.overconfidence_index,
    streak_current = excluded.streak_current,
    streak_best = excluded.streak_best,
    updated_at = now();
end;
$$;

create or replace function recompute_scenario_stats(p_scenario_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total int;
  v_acc numeric;
  v_conf numeric;
  v_dist jsonb;
begin
  select
    count(*),
    case when count(*) > 0 then count(*) filter (where is_correct)::numeric / count(*) else 0 end,
    coalesce(avg(confidence), 0)
  into v_total, v_acc, v_conf
  from attempts
  where scenario_id = p_scenario_id;

  select coalesce(jsonb_object_agg(chosen_option, cnt), '{}')
  into v_dist
  from (
    select chosen_option, count(*) as cnt
    from attempts
    where scenario_id = p_scenario_id
    group by chosen_option
  ) sub;

  insert into scenario_stats (scenario_id, total_attempts, accuracy_rate, avg_confidence, option_distribution, updated_at)
  values (p_scenario_id, v_total, v_acc, v_conf, v_dist, now())
  on conflict (scenario_id) do update set
    total_attempts = excluded.total_attempts,
    accuracy_rate = excluded.accuracy_rate,
    avg_confidence = excluded.avg_confidence,
    option_distribution = excluded.option_distribution,
    updated_at = now();
end;
$$;
