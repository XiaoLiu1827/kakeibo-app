-- 通常カテゴリごとの予算テーブル
create table if not exists category_budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade unique not null,
  budget integer not null default 0,
  updated_at timestamptz default now()
);

alter table category_budgets enable row level security;
create policy "public_all" on category_budgets for all to anon using (true) with check (true);

-- monthly_settings に貯金目標額を追加（デフォルト5万）
alter table monthly_settings add column if not exists savings_target integer not null default 50000;

-- savings_history に繰り越し残高を追加
alter table savings_history add column if not exists carryover_balance integer not null default 0;
