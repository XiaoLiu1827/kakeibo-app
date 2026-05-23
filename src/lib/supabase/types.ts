export type Category = {
  id: string
  name: string
  is_leisure: boolean
  is_default: boolean
  created_at: string
}

export type Expense = {
  id: string
  amount: number
  category_id: string | null
  memo: string | null
  date: string
  created_at: string
  category?: Category
}

export type MonthlySettings = {
  id: string
  year_month: string
  income: number
  leisure_budget: number
  created_at: string
}

export type SavingsHistory = {
  id: string
  year_month: string
  surplus: number
  basic_delta: number
  special_delta: number
  basic_balance: number
  special_balance: number
  created_at: string
}
