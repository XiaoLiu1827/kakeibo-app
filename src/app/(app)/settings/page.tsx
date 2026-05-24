export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/client";
import SettingsForm from "@/components/SettingsForm";
import CategoryManager from "@/components/CategoryManager";
import CategoryBudgetManager from "@/components/CategoryBudgetManager";
import MonthClosing from "@/components/MonthClosing";

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function SettingsPage() {
  const yearMonth = getCurrentYearMonth();
  const supabase = createServerClient();

  const [settingsRes, prevSettingsRes, categoriesRes, budgetsRes] =
    await Promise.all([
      supabase.from("monthly_settings").select("*").eq("year_month", yearMonth).maybeSingle(),
      supabase.from("monthly_settings").select("year_month, savings_target").order("year_month", { ascending: false }).limit(2),
      supabase.from("categories").select("*").order("is_leisure").order("name"),
      supabase.from("category_budgets").select("*"),
    ]);

  const prevSettings = prevSettingsRes.data?.find((s) => s.year_month !== yearMonth);
  const totalFixedBudget = (budgetsRes.data ?? []).reduce((sum, b) => sum + b.budget, 0);

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
