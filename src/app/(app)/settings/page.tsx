export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/client";
import SettingsForm from "@/components/SettingsForm";
import CategoryManager from "@/components/CategoryManager";
import CategoryBudgetManager from "@/components/CategoryBudgetManager";
import MonthClosing from "@/components/MonthClosing";
import RecurringExpenseManager from "@/components/RecurringExpenseManager";
import { getCurrentYearMonth, getNextMonthStart } from "@/lib/dateUtils";

export default async function SettingsPage() {
  const yearMonth = getCurrentYearMonth();
  const supabase = createServerClient();

  const [settingsRes, prevSettingsRes, categoriesRes, budgetsRes, incomesRes, recurringRes] =
    await Promise.all([
      supabase.from("monthly_settings").select("*").eq("year_month", yearMonth).maybeSingle(),
      supabase.from("monthly_settings").select("year_month, savings_target").order("year_month", { ascending: false }).limit(2),
      supabase.from("categories").select("*").order("is_leisure").order("name"),
      supabase.from("category_budgets").select("*"),
      supabase.from("incomes").select("amount")
        .gte("date", `${yearMonth}-01`)
        .lt("date", getNextMonthStart(yearMonth)),
      supabase.from("recurring_expenses").select("*").order("created_at"),
    ]);

  const prevSettings = prevSettingsRes.data?.find((s) => s.year_month !== yearMonth);
  const totalFixedBudget = (budgetsRes.data ?? []).reduce((sum, b) => sum + b.budget, 0);
  const totalIncome = (incomesRes.data ?? []).reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold pt-2">設定</h1>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">今月の設定</h2>
        <SettingsForm
          yearMonth={yearMonth}
          settings={settingsRes.data}
          prevSavingsTarget={prevSettings?.savings_target}
          totalFixedBudget={totalFixedBudget}
          totalIncome={totalIncome}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-500">生活費予算</h2>
          {totalFixedBudget > 0 && (
            <span className="text-sm font-bold text-gray-700">合計 ¥{totalFixedBudget.toLocaleString()}</span>
          )}
        </div>
        <CategoryBudgetManager
          categories={categoriesRes.data ?? []}
          budgets={budgetsRes.data ?? []}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">固定支出テンプレート</h2>
        <RecurringExpenseManager
          categories={categoriesRes.data ?? []}
          templates={recurringRes.data ?? []}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">月末締め処理</h2>
        <MonthClosing />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">カテゴリ管理</h2>
        <CategoryManager categories={categoriesRes.data ?? []} />
      </div>
    </div>
  );
}
