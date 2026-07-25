export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";
import MonthPicker from "@/components/MonthPicker";
import { getCurrentYearMonth, getNextMonthStart } from "@/lib/dateUtils";

type Props = { searchParams: Promise<{ month?: string; filter?: string }> };

export default async function ExpensesPage(props: Props) {
  const { month, filter } = await props.searchParams;
  const yearMonth = month ?? getCurrentYearMonth();

  const supabase = createServerClient();

  let query = supabase
    .from("expenses")
    .select("*, category:categories(name, is_leisure)")
    .gte("date", `${yearMonth}-01`)
    .lt("date", getNextMonthStart(yearMonth))
    .order("date", { ascending: false });

  if (filter === "normal") {
    query = query.eq("categories.is_leisure", false);
  } else if (filter === "leisure") {
    query = query.eq("categories.is_leisure", true);
  }

  const { data: expenses } = await query;

  // フィルターがある場合はカテゴリが一致するものだけ残す（joinフィルターがnullになるため）
  const filtered = (expenses ?? []).filter((e) => {
    const cat = e.category as unknown as { is_leisure: boolean } | null;
    if (filter === "normal") return cat !== null && !cat.is_leisure;
    if (filter === "leisure") return cat !== null && cat.is_leisure;
    return true;
  });

  const grouped = filtered.reduce<Record<string, typeof filtered>>(
    (acc, expense) => {
      if (!acc[expense.date]) acc[expense.date] = [];
      acc[expense.date]!.push(expense);
      return acc;
    },
    {}
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  function filterHref(f?: string) {
    const params = new URLSearchParams();
    params.set("month", yearMonth);
    if (f) params.set("filter", f);
    return `/expenses?${params.toString()}`;
  }

  const filterOptions = [
    { key: undefined, label: "すべて" },
    { key: "normal", label: "生活費" },
    { key: "leisure", label: "余暇" },
  ] as const;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <MonthPicker current={yearMonth} basePath="/expenses" />
        <Link
          href="/expenses/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full"
        >
          ＋ 追加
        </Link>
      </div>

      {/* フィルターチップ */}
      <div className="flex gap-2">
        {filterOptions.map(({ key, label }) => {
          const active = filter === key;
          return (
            <Link
              key={label}
              href={filterHref(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {filtered.length > 0 && (
        <div className="bg-white rounded-xl px-4 py-3 flex justify-between items-center shadow-sm border border-gray-100">
          <span className="text-sm text-gray-500">合計支出</span>
          <span className="text-lg font-bold text-gray-800">¥{total.toLocaleString()}</span>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>支出がありません</p>
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
              {items!.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}/edit`}
                  className="flex items-center px-4 py-3 gap-3 active:bg-gray-50"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      (expense.category as unknown as { is_leisure: boolean } | null)?.is_leisure
                        ? "bg-orange-400"
                        : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {(expense.category as unknown as { name: string } | null)?.name ?? "未分類"}
                    </p>
                    {expense.memo && (
                      <p className="text-xs text-gray-400 truncate">{expense.memo}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-800 shrink-0">
                    ¥{expense.amount.toLocaleString()}
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
