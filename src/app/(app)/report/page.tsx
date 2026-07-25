export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/client";
import MonthPicker from "@/components/MonthPicker";
import { MonthlyBalanceChart, ExpenseDonutChart } from "@/components/ReportCharts";
import type { MonthlyPoint, PiePoint } from "@/components/ReportCharts";
import { getCurrentYearMonth, shiftMonth, getNextMonthStart } from "@/lib/dateUtils";

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-gray-400">±0</span>;
  const isUp = delta > 0;
  return (
    <span className={`text-xs font-semibold ${isUp ? "text-red-500" : "text-emerald-600"}`}>
      {isUp ? "+" : ""}¥{delta.toLocaleString()}
    </span>
  );
}

type Props = { searchParams: Promise<{ month?: string }> };

export default async function ReportPage(props: Props) {
  const { month } = await props.searchParams;
  const yearMonth = month ?? getCurrentYearMonth();
  const prevMonth = shiftMonth(yearMonth, -1);
  const sixMonthsAgo = shiftMonth(yearMonth, -5);

  const supabase = createServerClient();

  const [currRes, prevRes, categoriesRes, sixMonthExpensesRes, sixMonthIncomesRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount, category_id, category:categories(id, name, is_leisure)")
      .gte("date", `${yearMonth}-01`)
      .lt("date", getNextMonthStart(yearMonth)),
    supabase
      .from("expenses")
      .select("amount, category_id, category:categories(id, name, is_leisure)")
      .gte("date", `${prevMonth}-01`)
      .lt("date", getNextMonthStart(prevMonth)),
    supabase.from("categories").select("*").order("is_leisure").order("name"),
    supabase
      .from("expenses")
      .select("amount, date")
      .gte("date", `${sixMonthsAgo}-01`)
      .lt("date", getNextMonthStart(yearMonth)),
    supabase
      .from("incomes")
      .select("amount, date")
      .gte("date", `${sixMonthsAgo}-01`)
      .lt("date", getNextMonthStart(yearMonth)),
  ]);

  type Cat = { id: string; name: string; is_leisure: boolean };

  const currExpenses = currRes.data ?? [];
  const prevExpenses = prevRes.data ?? [];
  const categories = categoriesRes.data ?? [];

  // カテゴリ別集計（当月・前月）
  const currByCategory: Record<string, number> = {};
  const prevByCategory: Record<string, number> = {};
  for (const e of currExpenses) {
    if (e.category_id) currByCategory[e.category_id] = (currByCategory[e.category_id] ?? 0) + e.amount;
  }
  for (const e of prevExpenses) {
    if (e.category_id) prevByCategory[e.category_id] = (prevByCategory[e.category_id] ?? 0) + e.amount;
  }

  const currTotal = currExpenses.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);

  const normalCats = categories.filter((c) => !c.is_leisure);
  const leisureCats = categories.filter((c) => c.is_leisure);

  const currLeisure = leisureCats.reduce((s, c) => s + (currByCategory[c.id] ?? 0), 0);
  const prevLeisure = leisureCats.reduce((s, c) => s + (prevByCategory[c.id] ?? 0), 0);
  const currNormal = normalCats.reduce((s, c) => s + (currByCategory[c.id] ?? 0), 0);
  const prevNormal = normalCats.reduce((s, c) => s + (prevByCategory[c.id] ?? 0), 0);

  const activeCats = categories.filter(
    (c) => (currByCategory[c.id] ?? 0) > 0 || (prevByCategory[c.id] ?? 0) > 0
  );
  const activeNormal = activeCats.filter((c) => !c.is_leisure);
  const activeLeisure = activeCats.filter((c) => c.is_leisure);

  // 月次収支グラフ用データ（過去6ヶ月）
  const expenseByMonth: Record<string, number> = {};
  for (const e of sixMonthExpensesRes.data ?? []) {
    const ym = e.date.slice(0, 7);
    expenseByMonth[ym] = (expenseByMonth[ym] ?? 0) + e.amount;
  }
  const incomeByMonth: Record<string, number> = {};
  for (const i of sixMonthIncomesRes.data ?? []) {
    const ym = i.date.slice(0, 7);
    incomeByMonth[ym] = (incomeByMonth[ym] ?? 0) + i.amount;
  }

  const monthlyChartData: MonthlyPoint[] = [];
  for (let i = -5; i <= 0; i++) {
    const ym = shiftMonth(yearMonth, i);
    const [y, m] = ym.split("-");
    monthlyChartData.push({
      label: `${y!.slice(2)}/${m}`,
      収入: incomeByMonth[ym] ?? 0,
      支出: expenseByMonth[ym] ?? 0,
    });
  }

  // ドーナツチャート用データ（当月カテゴリ別支出）
  const pieData: PiePoint[] = categories
    .map((c) => ({ name: c.name, value: currByCategory[c.id] ?? 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const hasMonthlyData = monthlyChartData.some((d) => d.収入 > 0 || d.支出 > 0);

  const [ym_y, ym_m] = yearMonth.split("-");
  const [pm_y, pm_m] = prevMonth.split("-");
  const currLabel = `${ym_y}年${Number(ym_m)}月`;
  const prevLabel = `${pm_y}年${Number(pm_m)}月`;

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="pt-2">
        <MonthPicker current={yearMonth} basePath="/report" />
      </div>

      {/* 支出サマリー */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">支出合計</p>
        <div className="flex items-end gap-3">
          <p className="text-3xl font-bold text-gray-800">¥{currTotal.toLocaleString()}</p>
          <DeltaBadge delta={currTotal - prevTotal} />
        </div>
        <p className="text-xs text-gray-400">{prevLabel}: ¥{prevTotal.toLocaleString()}</p>
      </div>

      {/* 生活費 vs 余暇 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">生活費</p>
          <p className="text-xl font-bold text-gray-800">¥{currNormal.toLocaleString()}</p>
          <DeltaBadge delta={currNormal - prevNormal} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">余暇</p>
          <p className="text-xl font-bold text-gray-800">¥{currLeisure.toLocaleString()}</p>
          <DeltaBadge delta={currLeisure - prevLeisure} />
        </div>
      </div>

      {/* 月次収支グラフ */}
      {hasMonthlyData && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">月次収支（過去6ヶ月）</p>
          <MonthlyBalanceChart data={monthlyChartData} />
        </div>
      )}

      {/* 支出内訳ドーナツ */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{currLabel} 支出内訳</p>
          <ExpenseDonutChart data={pieData} />
        </div>
      )}

      {/* カテゴリ別比較（生活費） */}
      {activeNormal.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">生活費 カテゴリ別</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">カテゴリ</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">{currLabel}</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">前月比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeNormal.map((c) => {
                const curr = currByCategory[c.id] ?? 0;
                const prev = prevByCategory[c.id] ?? 0;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-gray-700 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {curr > 0 ? `¥${curr.toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeltaBadge delta={curr - prev} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* カテゴリ別比較（余暇） */}
      {activeLeisure.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">余暇 カテゴリ別</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">カテゴリ</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">{currLabel}</th>
                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">前月比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeLeisure.map((c) => {
                const curr = currByCategory[c.id] ?? 0;
                const prev = prevByCategory[c.id] ?? 0;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-gray-700 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {curr > 0 ? `¥${curr.toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeltaBadge delta={curr - prev} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeCats.length === 0 && !hasMonthlyData && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>支出データがありません</p>
        </div>
      )}
    </div>
  );
}
