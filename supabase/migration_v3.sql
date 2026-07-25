-- 収入カテゴリテーブル
create table if not exists income_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz default now()
);

-- 収入テーブル
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  amount integer not null,
  category_id uuid references income_categories(id) on delete set null,
  memo text,
  date date not null,
  created_at timestamptz default now()
);

alter table income_categories enable row level security;
create policy "public_all" on income_categories for all to anon using (true) with check (true);

alter table incomes enable row level security;
create policy "public_all" on incomes for all to anon using (true) with check (true);

-- デフォルト収入カテゴリ
insert into income_categories (name, is_default) values
  ('給与',     true),
  ('賞与',     true),
  ('一時所得', true),
  ('還付金',   true),
  ('ポイント', true);
