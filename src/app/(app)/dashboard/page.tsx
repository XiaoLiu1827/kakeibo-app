export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const yearMonth = getCurrentYearMonth();
  const supabase = createServerClient();

  const [settingsRes, expensesRes, savingsRes, categoriesRes, budgetsRes] = await Promise.all([
    supabase.from("monthly_settings").select("*").eq("year_month", yearMonth).maybeSingle(),
    supabase.from("expenses").select("amount, category:categories(id, name, is_leisure)")
      .gte("date", `${yearMonth}-01`).lte("date", `${yearMonth}-31`),
    supabase.from("savings_history").select("basic_balance, special_balance, carryover_balance")
      .order("year_month", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("categories").select("*").eq("is_leisure", false),
    supabase.from("category_budgets").select("*"),
  ]);

  const settings = settingsRes.data;
  const expenses = expensesRes.data ?? [];
  const budgets = budgetsRes.data ?? [];

  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category_id, b.budget]));
  const normalCategories = categoriesRes.data ?? [];
  const totalFixedBudget = normalCategories.reduce((sum, c) => sum + (budgetMap[c.id] ?? 0), 0);

  const savingsTarget = settings?.savings_target ?? 50000;
  const income = settings?.income ?? 0;
  const leisureBudgetThisMonth = income - totalFixedBudget - savingsTarget;

  const basicBalance = savingsRes.data?.basic_balance ?? 0;
  const specialBalance = savingsRes.data?.special_balance ?? 0;
  const carryoverBalance = savingsRes.data?.carryover_balance ?? specialBalance;

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  type Cat = { id: string; name: string; is_leisure: boolean };
  const leisureExpense = expenses
    .filter((e) => (e.category as unknown as Cat | null)?.is_leisure)
    .reduce((sum, e) => sum + e.amount, 0);

  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category as unknown as Cat | null;
    if (cat && !cat.is_leisure) {
      expenseByCategory[cat.id] = (expenseByCategory[cat.id] ?? 0) + e.amount;
    }
  }

  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold">{monthLabel}</h1>
        <Link href="/expenses/new" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full">
          ＋ 支出を追加
        </Link>
      </div>

      {!settings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          今月の設定がまだです。
          <Link href="/settings" className="ml-1 underline font-medium">設定する →</Link>
        </div>
      )}

      {/* 余暇予算 */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-medium text-gray-500">余暇予算</h2>
        <div className="flex gap-3">
          <div className="flex-1 bg-orange-50 rounded-xl p-3">
            <p className="text-xs text-orange-500 font-medium">今月分</p>
            <p className="text-lg font-bold text-orange-700">¥{leisureBudgetThisMonth.toLocaleString()}</p>
          </div>
          <div className="flex-1 bg-yellow-50 rounded-xl p-3">
            <p className="text-xs text-yellow-600 font-medium">繰り越し</p>
            <p className="text-lg font-bold text-yellow-700">¥{carryoverBalance.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">
              ¥{(leisureBudgetThisMonth + carryoverBalance - leisureExpense).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">残り（使用 ¥{leisureExpense.toLocaleString()}）</p>
          </div>
          <p className="text-sm text-gray-400">
            合計 ¥{(leisureBudgetThisMonth + carryoverBalance).toLocaleString()}
          </p>
        </div>
        {leisureBudgetThisMonth + carryoverBalance > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${leisureExpense > leisureBudgetThisMonth + carryoverBalance ? "bg-red-500" : "bg-orange-400"}`}
              style={{ width: `${Math.min((leisureExpense / (leisureBudgetThisMonth + carryoverBalance)) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 固定費カテゴリ別 */}
      {normalCategories.length > 0 && totalFixedBudget > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-500">固定費</h2>
          {normalCategories
            .filter((c) => budgetMap[c.id])
            .map((c) => {
              const budget = budgetMap[c.id] ?? 0;
              const used = expenseByCategory[c.id] ?? 0;
              const pct = budget > 0 ? Math.min((used / budget) * 100, 100) : 0;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">{c.name}</span>
                    <span className={used > budget ? "text-red-500 font-medium" : "text-gray-500"}>
                      ¥{used.toLocaleString()} / ¥{budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${used > budget ? "bg-red-400" : "bg-blue-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* 今月の支出合計 */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-1">
        <h2 className="text-sm font-medium text-gray-500">今月の支出合計</h2>
        <p className="text-3xl font-bold">¥{totalExpense.toLocaleString()}</p>
        {settings && (
          <p className="text-sm text-gray-500">
            収入 ¥{income.toLocaleString()} → 余剰 ¥{(income - totalExpense).toLocaleString()}
          </p>
        )}
      </div>

      {/* 貯金残高 */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-medium text-gray-500">貯金残高</h2>
        <div className="flex gap-4">
          <div className="flex-1 bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-500 font-medium">基本枠</p>
            <p className="text-xl font-bold text-blue-700 mt-1">¥{basicBalance.toLocaleString()}</p>
          </div>
          <div className="flex-1 bg-green-50 rounded-xl p-3">
            <p className="text-xs text-green-500 font-medium">特別枠</p>
            <p className="text-xl font-bold text-green-700 mt-1">¥{specialBalance.toLocaleString()}</p>
            <p className="text-xs text-green-400 mt-0.5">繰り越し ¥{carryoverBalance.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 text-right">合計 ¥{(basicBalance + specialBalance).toLocaleString()}</p>
      </div>
    </div>
  );
}
