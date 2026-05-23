import { createClient } from "@/lib/supabase/client";
import SettingsForm from "@/components/SettingsForm";
import CategoryManager from "@/components/CategoryManager";
import MonthClosing from "@/components/MonthClosing";

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function SettingsPage() {
  const yearMonth = getCurrentYearMonth();
  const supabase = createClient();

  const [settingsRes, categoriesRes, expensesRes, savingsRes, closingRes] =
    await Promise.all([
      supabase
        .from("monthly_settings")
        .select("*")
        .eq("year_month", yearMonth)
        .maybeSingle(),
      supabase.from("categories").select("*").order("is_leisure").order("name"),
      supabase
        .from("expenses")
        .select("amount")
        .gte("date", `${yearMonth}-01`)
        .lte("date", `${yearMonth}-31`),
      supabase
        .from("savings_history")
        .select("basic_balance, special_balance")
        .order("year_month", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("savings_history")
        .select("id")
        .eq("year_month", yearMonth)
        .maybeSingle(),
    ]);

  const totalExpense = (expensesRes.data ?? []).reduce(
    (sum, e) => sum + e.amount,
    0
  );

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold pt-2">設定</h1>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">今月の設定</h2>
        <SettingsForm yearMonth={yearMonth} settings={settingsRes.data} />
      </div>

      {settingsRes.data && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-4">月末締め処理</h2>
          <MonthClosing
            yearMonth={yearMonth}
            income={settingsRes.data.income}
            totalExpense={totalExpense}
            latestBasicBalance={savingsRes.data?.basic_balance ?? 0}
            latestSpecialBalance={savingsRes.data?.special_balance ?? 0}
            alreadyClosed={!!closingRes.data}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">カテゴリ管理</h2>
        <CategoryManager categories={categoriesRes.data ?? []} />
      </div>
    </div>
  );
}
