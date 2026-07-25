"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { IncomeCategory, Income } from "@/lib/supabase/types";
import CalcInput from "./CalcInput";
import { getLocalDateString } from "@/lib/dateUtils";

type Props = {
  categories: IncomeCategory[];
  income?: Income;
};

export default function IncomeForm({ categories, income }: Props) {
  const router = useRouter();
  const isEdit = !!income;

  const [amount, setAmount] = useState<number>(income?.amount ?? 0);
  const [categoryId, setCategoryId] = useState(income?.category_id ?? categories[0]?.id ?? "");
  const [memo, setMemo] = useState(income?.memo ?? "");
  const [date, setDate] = useState(income?.date ?? getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError("金額を入力してください");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const payload = {
      amount,
      category_id: categoryId || null,
      memo: memo || null,
      date,
    };

    if (isEdit) {
      await supabase.from("incomes").update(payload).eq("id", income.id);
    } else {
      await supabase.from("incomes").insert(payload);
    }
    router.push("/incomes");
    router.refresh();
  }

  async function handleDelete() {
    if (!income) return;
    if (!confirm("この収入を削除しますか？")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("incomes").delete().eq("id", income.id);
    router.push("/incomes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          金額 <span className="text-red-500">*</span>
        </label>
        <CalcInput initialValue={income?.amount} onChange={setAmount} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                categoryId === c.id
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例：6月分給与、夏季賞与..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 text-lg"
      >
        {loading ? "保存中..." : "保存する"}
      </button>

      {isEdit && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 text-red-500 border border-red-200 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {deleting ? "削除中..." : "この収入を削除"}
        </button>
      )}
    </form>
  );
}
