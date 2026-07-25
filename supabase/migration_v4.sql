-- 固定支出テンプレートテーブル
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  amount integer not null default 0,
  memo text,
  created_at timestamptz default now()
);

alter table recurring_expenses enable row level security;
create policy "public_all" on recurring_expenses for all to anon using (true) with check (true);
