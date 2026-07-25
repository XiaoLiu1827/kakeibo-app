export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";
import ExpenseModal from "@/components/ExpenseModal";
import LeisureCategoryList from "@/components/LeisureCategoryList";
import MonthPicker from "@/components/MonthPicker";
import { getCurrentYearMonth, getPreviousYearMonth, getNextMonthStart } from "@/lib/dateUtils";

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

function TwoToneBar({ value, max, color = "bg-blue-500", bgColor = "bg-blue-100" }: { value: number; max: number; color?: string; bgColor?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className={`w-full ${bgColor} rounded-full h-3 overflow-hidden`}>
      <div
        className={`h-3 rounded-full transition-all ${over ? "bg-red-400" : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

type Props = { searchParams: Promise<{ month?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const currentYearMonth = getCurrentYearMonth();
  const yearMonth = month ?? currentYearMonth;
  const isCurrentMonth = yearMonth === currentYearMonth;
  const prevMonth = getPreviousYearMonth();
  const supabase = createServerClient();

  const [settingsRes, expensesRes, incomesRes, savingsRes, categoriesRes, budgetsRes, prevSettingsRes, prevClosingRes, allExpenseCatsRes, recurringRes, recurringAppliedRes] = await Promise.all([
    supabase.from("monthly_settings").select("*").eq("year_month", yearMonth).maybeSingle(),
    supabase.from("expenses").select("id, amount, date, memo, category:categories(id, name, is_leisure)")
      .gte("date", `${yearMonth}-01`).lt("date", getNextMonthStart(yearMonth)).order("date", { ascending: false }),
    supabase.from("incomes").select("amount")
      .gte("date", `${yearMonth}-01`).lt("date", getNextMonthStart(yearMonth)),
    supabase.from("savings_history").select("basic_balance, special_balance, year_month")
      .order("year_month", { ascending: false }).limit(30),
    supabase.from("categories").select("*").order("is_leisure", { ascending: true }).order("name"),
    supabase.from("category_budgets").select("*"),
    supabase.from("monthly_settings").select("id").eq("year_month", prevMonth).maybeSingle(),
    supabase.from("savings_history").select("id").eq("year_month", prevMonth).maybeSingle(),
    supabase.from("expenses").select("category_id"),
    supabase.from("recurring_expenses").select("*").order("created_at"),
    supabase.from("recurring_applications").select("id").eq("year_month", currentYearMonth).maybeSingle(),
  ]);

  // 毎月1日かつ未適用の場合のみ自動挿入
  const jstDayOfMonth = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDate();
  if (!recurringAppliedRes.data && jstDayOfMonth === 1 && (recurringRes.data ?? []).length > 0) {
    const firstOfMonth = `${currentYearMonth}-01`;
    const { error } = await supabase.from("expenses").insert(
      (recurringRes.data ?? []).map((t) => ({
        amount: t.amount,
        category_id: t.category_id,
        memo: t.memo,
        date: firstOfMonth,
      }))
    );
    if (!error) {
      await supabase.from("recurring_applications").insert({ year_month: currentYearMonth });
    }
  }

  const settings = settingsRes.data;
  const prevMonthUnclosed = !!prevSettingsRes.data && !prevClosingRes.data;
  const expenses = expensesRes.data ?? [];
  const budgets = budgetsRes.data ?? [];
  const allCategories = categoriesRes.data ?? [];
  const income = (incomesRes.data ?? []).reduce((s, i) => s + i.amount, 0);
  const normalCategories = allCategories.filter((c) => !c.is_leisure);

  // 全期間の使用頻度でカテゴリをソート
  const usageCount: Record<string, number> = {};
  for (const e of allExpenseCatsRes.data ?? []) {
    if (e.category_id) usageCount[e.category_id] = (usageCount[e.category_id] ?? 0) + 1;
  }
  const sortedCategories = [...allCategories].sort((a, b) => {
    const diff = (usageCount[b.id] ?? 0) - (usageCount[a.id] ?? 0);
    return diff !== 0 ? diff : a.name.localeCompare(b.name, "ja");
  });

  type Cat = { id: string; name: string; is_leisure: boolean };

  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category_id, b.budget]));
  const totalFixedBudget = normalCategories.reduce((sum, c) => sum + (budgetMap[c.id] ?? 0), 0);

  const savingsTarget = settings?.savings_target ?? 50000;

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const fixedExpenseByCategory: Record<string, number> = {};
  let leisureExpense = 0;
  type ExpenseRecord = { id: string; date: string; amount: number; memo: string | null };
  const leisureByCategory: Record<string, { id: string; name: string; amount: number; records: ExpenseRecord[] }> = {};

  for (const e of expenses) {
    const cat = e.category as unknown as Cat | null;
    if (!cat) continue;
    if (cat.is_leisure) {
      leisureExpense += e.amount;
      if (!leisureByCategory[cat.id]) leisureByCategory[cat.id] = { id: cat.id, name: cat.name, amount: 0, records: [] };
      leisureByCategory[cat.id]!.amount += e.amount;
      leisureByCategory[cat.id]!.records.push({ id: e.id, date: e.date, amount: e.amount, memo: e.memo ?? null });
    } else {
      fixedExpenseByCategory[cat.id] = (fixedExpenseByCategory[cat.id] ?? 0) + e.amount;
    }
  }

  const totalFixedExpense = Object.values(fixedExpenseByCategory).reduce((s, v) => s + v, 0);
  const fixedOverspend = Math.max(0, totalFixedExpense - totalFixedBudget);
  const leisureBudgetThisMonth = income - totalFixedBudget - savingsTarget - fixedOverspend;

  // 最新の貯金残高を取得
  // 同月に締めと手動が両方ある場合は残高合計が大きい方を採用
  // （締め後に手動追加→手動が大 / 手動後に締め→締めが大、と自然に判定できる）
  const savingsAll = savingsRes.data ?? [];
  const latestClose = savingsAll.find((h) => !h.year_month.includes("manual"));
  const latestEntry = savingsAll[0]; // 降順なので先頭が最新
  const activeSavings = (() => {
    if (!latestClose) return latestEntry;
    if (!latestEntry) return latestClose;
    const em = latestEntry.year_month.slice(0, 7);
    const cm = latestClose.year_month.slice(0, 7);
    if (em > cm) return latestEntry;
    if (em < cm) return latestClose;
    // 同月: 残高合計が大きい方を採用
    return (latestEntry.basic_balance + latestEntry.special_balance) >
           (latestClose.basic_balance + latestClose.special_balance)
      ? latestEntry : latestClose;
  })();
  const basicBalance = activeSavings?.basic_balance ?? 0;
  const specialBalance = activeSavings?.special_balance ?? 0;

  const leisureTotal = leisureBudgetThisMonth;
  const leisureRemaining = leisureTotal - leisureExpense;

  const leisureAllSorted = Object.values(leisureByCategory)
    .sort((a, b) => b.amount - a.amount);

  // JSTで現在日付を取得（月末予測はカレント月のみ使用）
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const jstNow = new Date(Date.now() + JST_OFFSET_MS);
  const dayOfMonth = jstNow.getUTCDate();
  const [ymYear, ymMonth] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(ymYear!, ymMonth!, 0).getDate();

  // 2パス外れ値検出: 外れ値は日割りせずそのまま加算、通常支出のみ日割り予測する
  const leisureAmounts = Object.values(leisureByCategory).flatMap((cat) => cat.records.map((r) => r.amount));
  let normalLeiSum = leisureExpense;
  let outlierLeiSum = 0;
  if (leisureAmounts.length >= 3) {
    const mean1 = leisureExpense / leisureAmounts.length;
    const std1 = Math.sqrt(leisureAmounts.reduce((s, v) => s + (v - mean1) ** 2, 0) / (leisureAmounts.length - 1));
    const pass1Normal = leisureAmounts.filter((v) => v <= mean1 + 2 * std1);
    if (pass1Normal.length > 0) {
      const mean2 = pass1Normal.reduce((s, v) => s + v, 0) / pass1Normal.length;
      const std2 = pass1Normal.length > 1
        ? Math.sqrt(pass1Normal.reduce((s, v) => s + (v - mean2) ** 2, 0) / (pass1Normal.length - 1))
        : 0;
      const threshold = mean2 + 2 * std2;
      outlierLeiSum = leisureAmounts.filter((v) => v > threshold).reduce((s, v) => s + v, 0);
      normalLeiSum = leisureExpense - outlierLeiSum;
    }
  }

  const projectedLeisure = isCurrentMonth && leisureExpense > 0 && dayOfMonth > 0
    ? Math.round((normalLeiSum / dayOfMonth) * daysInMonth) + outlierLeiSum
    : 0;

  const monthLabel = formatMonthLabel(yearMonth);
  const surplus = income - totalExpense;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <MonthPicker current={yearMonth} basePath="/dashboard" />
          <ExpenseModal categories={sortedCategories} />
        </div>

        {!settings && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
            {monthLabel}の設定がまだです。
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
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{monthLabel}の収支</p>
          <div className="grid grid-cols-3 text-center divide-x divide-gray-100">
            <Link href={`/incomes?month=${yearMonth}`} className="px-2 active:bg-gray-50 rounded-l-xl">
              <p className="text-xs text-gray-400 mb-1">収入</p>
              <p className="text-base font-bold text-emerald-700 whitespace-nowrap">¥{income.toLocaleString()}</p>
              {income === 0 && <p className="text-[9px] text-gray-300 mt-0.5">タップして記録</p>}
            </Link>
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

          {/* 残り: 左寄せ横並び */}
          <div className="flex items-baseline gap-2">
            <p className="text-xs text-gray-400">残り</p>
            <p className={`text-3xl font-bold ${leisureRemaining < 0 ? "text-red-500" : "text-gray-900"}`}>
              ¥{leisureRemaining.toLocaleString()}
            </p>
          </div>

          <TwoToneBar value={leisureExpense} max={leisureTotal} color="bg-amber-400" bgColor="bg-amber-100" />

          <div className="flex justify-between text-sm text-gray-500">
            <span>支出 <span className="font-semibold text-gray-700">¥{leisureExpense.toLocaleString()}</span></span>
            <span>合計 <span className="font-medium">¥{leisureTotal.toLocaleString()}</span></span>
          </div>

          {projectedLeisure > 0 && (
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs text-gray-500">月末予測</span>
                <span className="text-xs text-gray-400">（{dayOfMonth}日時点）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${projectedLeisure > leisureTotal && leisureTotal > 0 ? "text-red-500" : "text-gray-800"}`}>
                  ¥{projectedLeisure.toLocaleString()}
                </span>
                {leisureTotal > 0 && projectedLeisure > leisureTotal ? (
                  <span className="text-xs font-medium text-red-400 bg-red-50 px-1.5 py-0.5 rounded-full">
                    +¥{(projectedLeisure - leisureTotal).toLocaleString()}
                  </span>
                ) : leisureTotal > 0 ? (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    予算内
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {leisureAllSorted.length > 0 && (
            <LeisureCategoryList items={leisureAllSorted} />
          )}
        </div>

        {/* 生活費 */}
        {normalCategories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">生活費</p>

            {/* 残り: 左寄せ横並び */}
            <div className="flex items-baseline gap-2">
              <p className="text-xs text-gray-400">残り</p>
              <p className={`text-3xl font-bold ${totalFixedExpense > totalFixedBudget ? "text-red-500" : "text-gray-900"}`}>
                ¥{(totalFixedBudget - totalFixedExpense).toLocaleString()}
              </p>
            </div>

            <TwoToneBar value={totalFixedExpense} max={totalFixedBudget || totalFixedExpense} color="bg-blue-500" bgColor="bg-blue-100" />

            <div className="flex justify-between text-sm text-gray-500">
              <span>支出 <span className="font-semibold text-gray-700">¥{totalFixedExpense.toLocaleString()}</span></span>
              <span>予算 <span className="font-medium">¥{totalFixedBudget.toLocaleString()}</span></span>
            </div>

            <div className="space-y-2 pt-1 border-t border-gray-50">
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
                      {budget > 0 && <TwoToneBar value={used} max={budget} color="bg-blue-400" bgColor="bg-blue-100" />}
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
