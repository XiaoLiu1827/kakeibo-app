import Link from "next/link";
export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/client";

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ExpensesPage() {
  const yearMonth = getCurrentYearMonth();
  const supabase = createServerClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, category:categories(name, is_leisure)")
    .gte("date", `${yearMonth}-01`)
    .lte("date", `${yearMonth}-31`)
    .order("date", { ascending: false });

  const grouped = (expenses ?? []).reduce<Record<string, typeof expenses>>(
    (acc, expense) => {
      const date = expense.date;
      if (!acc[date]) acc[date] = [];
      acc[date]!.push(expense);
      return acc;
    },
    {}
  );

  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold">{monthLabel}の支出</h1>
        <Link
          href="/expenses/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full"
        >
          ＋ 追加
        </Link>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>まだ支出がありません</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs text-gray-400 font-medium px-1 mb-2">
              {new Date(date).toLocaleDateString("ja-JP", {
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
                      (expense.category as unknown as { is_leisure: boolean } | null)
                        ?.is_leisure
                        ? "bg-orange-400"
                        : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(expense.category as unknown as { name: string } | null)?.name ??
                        "未分類"}
                    </p>
                    {expense.memo && (
                      <p className="text-xs text-gray-400 truncate">{expense.memo}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold shrink-0">
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
