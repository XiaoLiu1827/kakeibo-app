export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";
import MonthPicker from "@/components/MonthPicker";
import { getCurrentYearMonth, getNextMonthStart } from "@/lib/dateUtils";

type Props = { searchParams: Promise<{ month?: string }> };

export default async function IncomesPage(props: Props) {
  const { month } = await props.searchParams;
  const yearMonth = month ?? getCurrentYearMonth();

  const supabase = createServerClient();
  const { data: incomes } = await supabase
    .from("incomes")
    .select("*, income_category:income_categories(name)")
    .gte("date", `${yearMonth}-01`)
    .lt("date", getNextMonthStart(yearMonth))
    .order("date", { ascending: false });

  const grouped = (incomes ?? []).reduce<Record<string, typeof incomes>>(
    (acc, income) => {
      if (!acc[income.date]) acc[income.date] = [];
      acc[income.date]!.push(income);
      return acc;
    },
    {}
  );

  const total = (incomes ?? []).reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <MonthPicker current={yearMonth} basePath="/incomes" />
        <Link
          href="/incomes/new"
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-full"
        >
          ＋ 追加
        </Link>
      </div>

      {(incomes ?? []).length > 0 && (
        <div className="bg-white rounded-xl px-4 py-3 flex justify-between items-center shadow-sm border border-gray-100">
          <span className="text-sm text-gray-500">合計収入</span>
          <span className="text-lg font-bold text-emerald-700">¥{total.toLocaleString()}</span>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💰</p>
          <p>収入がありません</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs text-gray-400 font-medium px-1 mb-2">
              {new Date(date + "T00:00:00").toLocaleDateString("ja-JP", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </p>
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-50">
              {items!.map((income) => (
                <Link
                  key={income.id}
                  href={`/incomes/${income.id}/edit`}
                  className="flex items-center px-4 py-3 gap-3 active:bg-gray-50"
                >
                  <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {(income.income_category as unknown as { name: string } | null)?.name ?? "未分類"}
                    </p>
                    {income.memo && (
                      <p className="text-xs text-gray-400 truncate">{income.memo}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-emerald-700 shrink-0">
                    +¥{income.amount.toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
