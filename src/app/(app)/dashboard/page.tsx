export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousYearMonth() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

function ProgressBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${over ? "bg-red-500" : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default async function DashboardPage() {
  const yearMonth = getCurrentYearMonth();
  const prevMonth = getPreviousYearMonth();
  const supabase = createServerClient();

  const [settingsRes, expensesRes, savingsRes, categoriesRes, budgetsRes, prevSettingsRes, prevClosingRes] = await Promise.all([
    supabase.from("monthly_settings").select("*").eq("year_month", yearMonth).maybeSingle(),
    supabase.from("expenses").select("amount, category:categories(id, name, is_leisure)")
      .gte("date", `${yearMonth}-01`).lte("date", `${yearMonth}-31`),
    supabase.from("savings_history").select("basic_balance, special_balance")
      .order("year_month", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("categories").select("*").eq("is_leisure", false),
    supabase.from("category_budgets").select("*"),
    supabase.from("monthly_settings").select("id").eq("year_month", prevMonth).maybeSingle(),
    supabase.from("savings_history").select("id").eq("year_month", prevMonth).maybeSingle(),
  ]);

  const settings = settingsRes.data;
  const prevMonthUnclosed = !!prevSettingsRes.data && !prevClosingRes.data;
  const expenses = expensesRes.data ?? [];
  const budgets = budgetsRes.data ?? [];
  const normalCategories = categoriesRes.data ?? [];

  type Cat = { id: string; name: string; is_leisure: boolean };

  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category_id, b.budget]));
  const totalFixedBudget = normalCategories.reduce((sum, c) => sum + (budgetMap[c.id] ?? 0), 0);

  const savingsTarget = settings?.savings_target ?? 50000;
  const income = settings?.income ?? 0;

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const fixedExpenseByCategory: Record<string, number> = {};
  let leisureExpense = 0;
  const leisureByCategory: Record<string, { name: string; amount: number }> = {};

  for (const e of expenses) {
    const cat = e.category as unknown as Cat | null;
    if (!cat) continue;
    if (cat.is_leisure) {
      leisureExpense += e.amount;
      if (!leisureByCategory[cat.id]) leisureByCategory[cat.id] = { name: cat.name, amount: 0 };
      leisureByCategory[cat.id]!.amount += e.amount;
    } else {
      fixedExpenseByCategory[cat.id] = (fixedExpenseByCategory[cat.id] ?? 0) + e.amount;
    }
  }

  const totalFixedExpense = Object.values(fixedExpenseByCategory).reduce((s, v) => s + v, 0);
  const fixedOverspend = Math.max(0, totalFixedExpense - totalFixedBudget);
  const leisureBudgetThisMonth = income - totalFixedBudget - savingsTarget - fixedOverspend;

  const basicBalance = savingsRes.data?.basic_balance ?? 0;
  const specialBalance = savingsRes.data?.special_balance ?? 0;

  const leisureTotal = leisureBudgetThisMonth;
  const leisureRemaining = leisureTotal - leisureExpense;

  const leisureTop5 = Object.values(leisureByCategory)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  const surplus = income - totalExpense;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">{monthLabel}</h1>
          <Link
            href="/expenses/new"
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm"
          >
            ＋ 支出追加
          </Link>
        </div>

        {!settings && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
            今月の設定がまだです。
            <Link href="/settings" className="ml-1 underline font-semibold">設定する →</Link>
          </div>
        )}
        {prevMonthUnclosed && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {formatMonthLabel(prevMonth)}の月末締めが完了していません。
            <Link href="/settings" className="ml-1 underline font-semibold">締めを実行する →</Link>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* 収支サマリー */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">今月の収支</p>
          <div className="grid grid-cols-3 text-center divide-x divide-gray-100">
            <div className="px-2">
              <p className="text-xs text-gray-400 mb-1">収入</p>
              <p className="text-base font-bold text-gray-800 whitespace-nowrap">¥{income.toLocaleString()}</p>
            </div>
            <div className="px-2">
              <p className="text-xs text-gray-400 mb-1">支出</p>
              <p className="text-base font-bold text-gray-800 whitespace-nowrap">¥{totalExpense.toLocaleString()}</p>
            </div>
            <div className="px-2">
              <p className="text-xs text-gray-400 mb-1">収支</p>
              <p className={`text-base font-bold whitespace-nowrap ${surplus >= 0 ? "text-blue-600" : "text-red-500"}`}>
                {surplus >= 0 ? `+¥${surplus.toLocaleString()}` : `-¥${Math.abs(surplus).toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>

        {/* 余暇予算 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">余暇予算</p>
            {fixedOverspend > 0 && (
              <span className="text-xs text-red-500 font-medium">生活費超過 −¥{fixedOverspend.toLocaleString()}</span>
            )}
          </div>

          {/* 残高（メイン）: 残りラベルと金額を横並び */}
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-gray-400">残り</p>
            <p className={`text-3xl font-bold ${leisureRemaining < 0 ? "text-red-500" : "text-gray-900"}`}>
              ¥{leisureRemaining.toLocaleString()}
            </p>
          </div>

          {/* 2トーンのプログレスバー */}
          <div className="w-full bg-amber-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${leisureExpense > leisureTotal ? "bg-red-400" : "bg-amber-400"}`}
              style={{ width: `${leisureTotal > 0 ? Math.min((leisureExpense / leisureTotal) * 100, 100) : 0}%` }}
            />
          </div>

          {/* 支出 / 合計 */}
          <div className="flex justify-between text-sm text-gray-500">
            <span>支出 <span className="font-semibold text-gray-700">¥{leisureExpense.toLocaleString()}</span></span>
            <span>合計 <span className="font-medium">¥{leisureTotal.toLocaleString()}</span></span>
          </div>


          {leisureTop5.length > 0 && (
            <div className="pt-1 space-y-2 border-t border-gray-50">
              <p className="text-xs text-gray-400 font-medium pt-1">カテゴリ別 TOP5</p>
              {leisureTop5.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                  <span className="text-sm font-semibold text-gray-800">¥{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 生活費 */}
        {normalCategories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">生活費</p>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">¥{totalFixedExpense.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">使用額</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p className={totalFixedExpense > totalFixedBudget ? "text-red-500 font-semibold" : ""}>
                  予算 ¥{totalFixedBudget.toLocaleString()}
                </p>
              </div>
            </div>

            <ProgressBar value={totalFixedExpense} max={totalFixedBudget || totalFixedExpense} color="bg-blue-500" />

            <div className="space-y-2 pt-1">
              {normalCategories
                .filter((c) => budgetMap[c.id] || fixedExpenseByCategory[c.id])
                .map((c) => {
                  const budget = budgetMap[c.id] ?? 0;
                  const used = fixedExpenseByCategory[c.id] ?? 0;
                  const over = budget > 0 && used > budget;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={`font-medium ${over ? "text-red-600" : "text-gray-700"}`}>{c.name}</span>
                        <span className={over ? "text-red-500 font-semibold" : "text-gray-500"}>
                          ¥{used.toLocaleString()}
                          {budget > 0 && ` / ¥${budget.toLocaleString()}`}
                          {over && " ⚠"}
                        </span>
                      </div>
                      {budget > 0 && <ProgressBar value={used} max={budget} color="bg-blue-400" />}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 貯金残高 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">貯金残高</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-500 font-medium">基本枠</p>
              <p className="text-xl font-bold text-blue-700 mt-1">¥{basicBalance.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs text-emerald-500 font-medium">特別枠</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">¥{specialBalance.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-50">
            <p className="text-sm text-gray-500">総貯金額</p>
            <p className="text-lg font-bold text-gray-800">¥{(basicBalance + specialBalance).toLocaleString()}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
