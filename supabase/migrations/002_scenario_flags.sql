create table scenario_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references scenarios(id) on delete cascade,
  reason text not null check (reason in ('answer_wrong', 'question_unclear', 'multiple_valid', 'other')),
  explanation text,
  created_at timestamptz not null default now(),
  unique (user_id, scenario_id)
);

alter table scenario_flags enable row level security;

create policy "flags_select_own" on scenario_flags for select using (auth.uid() = user_id);
create policy "flags_insert_own" on scenario_flags for insert with check (auth.uid() = user_id);
