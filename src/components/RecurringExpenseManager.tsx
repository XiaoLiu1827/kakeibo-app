"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category, RecurringExpense } from "@/lib/supabase/types";

type Props = {
  categories: Category[];
  templates: RecurringExpense[];
};

export default function RecurringExpenseManager({ categories, templates }: Props) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);

    const supabase = createClient();
    const payload = {
      category_id: categoryId || null,
      amount: Number(amount),
      memo: memo || null,
    };

    await supabase.from("recurring_expenses").insert(payload);

    setAmount("");
    setMemo("");
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("recurring_expenses").delete().eq("id", id);
    router.refresh();
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">テンプレートがありません</p>
      ) : (
        <div className="space-y-1">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-gray-50">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-700">
                  {t.category_id ? (categoryMap[t.category_id] ?? "不明") : "未分類"}
                </span>
                {t.memo && (
                  <span className="text-xs text-gray-400 ml-2">{t.memo}</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-bold text-gray-800">¥{t.amount.toLocaleString()}</span>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-3 pt-1">
        <p className="text-xs font-medium text-gray-500">テンプレートを追加</p>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="金額"
            className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="メモ（任意）"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={loading || !amount || Number(amount) <= 0}
          className="w-full py-2.5 bg-gray-800 text-white text-sm font-medium rounded-xl disabled:opacity-40"
        >
          追加
        </button>
      </form>
    </div>
  );
}
