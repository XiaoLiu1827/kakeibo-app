"use client";

import { useState } from "react";

type ExpenseRecord = { id: string; date: string; amount: number; memo: string | null };
type Item = { id: string; name: string; amount: number; records: ExpenseRecord[] };

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export default function LeisureCategoryList({ items }: { items: Item[] }) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);

  const hasMore = items.length > 5;
  const displayed = showAll ? items : items.slice(0, 5);

  function close() {
    setSelected(null);
  }

  return (
    <>
      <div className="pt-1 space-y-2 border-t border-gray-50">
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-400 font-medium">カテゴリ別</p>
          {hasMore && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-blue-500 font-medium"
            >
              {showAll ? "閉じる" : `詳細（全${items.length}件）`}
            </button>
          )}
        </div>
        {displayed.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setSelected(item)}
            className="w-full flex items-center gap-2 active:opacity-70 transition-opacity"
          >
            <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}</span>
            <span className="text-sm text-gray-700 flex-1 text-left">{item.name}</span>
            <span className="text-sm font-semibold text-gray-800">¥{item.amount.toLocaleString()}</span>
            <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      {/* バックドロップ */}
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          selected ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ボトムシート */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out max-h-[75vh] ${
          selected ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">余暇カテゴリ</p>
            <h2 className="text-base font-bold text-gray-800">{selected?.name}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">今月合計</p>
            <p className="text-base font-bold text-amber-600">¥{selected?.amount.toLocaleString()}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 pb-24">
          {!selected || selected.records.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">支出記録がありません</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {selected.records.map((r) => (
                <div key={r.id} className="flex items-center px-5 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">{formatDate(r.date)}</p>
                    {r.memo && <p className="text-xs text-gray-400 truncate mt-0.5">{r.memo}</p>}
                  </div>
                  <p className="text-sm font-bold text-gray-800 shrink-0">¥{r.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
