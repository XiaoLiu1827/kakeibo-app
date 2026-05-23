-- カテゴリ
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_leisure boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz default now()
);

-- 支出
create table expenses (
  id uuid primary key default gen_random_uuid(),
  amount integer not null,
  category_id uuid references categories(id) on delete set null,
  memo text,
  date date not null,
  created_at timestamptz default now()
);

-- 月次設定（収入・余暇予算）
create table monthly_settings (
  id uuid primary key default gen_random_uuid(),
  year_month text not null unique,
  income integer not null,
  leisure_budget integer not null,
  created_at timestamptz default now()
);

-- 貯金履歴
create table savings_history (
  id uuid primary key default gen_random_uuid(),
  year_month text not null unique,
  surplus integer not null,
  basic_delta integer not null,
  special_delta integer not null,
  basic_balance integer not null,
  special_balance integer not null,
  created_at timestamptz default now()
);

-- デフォルトカテゴリ
insert into categories (name, is_leisure, is_default) values
  ('家賃',       false, true),
  ('食費',       false, true),
  ('通信費',     false, true),
  ('光熱費',     false, true),
  ('日用品',     false, true),
  ('外食',       true,  true),
  ('カフェ',     true,  true),
  ('ショッピング', true, true),
  ('趣味',       true,  true);
