-- 固定支出の月次適用履歴（二重適用防止）
create table if not exists recurring_applications (
  id uuid primary key default gen_random_uuid(),
  year_month text not null unique,
  applied_at timestamptz default now()
);

alter table recurring_applications enable row level security;
create policy "public_all" on recurring_applications for all to anon using (true) with check (true);
