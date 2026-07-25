"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category, Expense } from "@/lib/supabase/types";
import CalcInput from "./CalcInput";
import { getLocalDateString } from "@/lib/dateUtils";

type Props = {
  categories: Category[];
  expense?: Expense;
  onSuccess?: () => void;
};

export default function ExpenseForm({ categories, expense, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = !!expense;

  const [amount, setAmount] = useState<number>(expense?.amount ?? 0);
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? categories[0]?.id ?? "");
  const [memo, setMemo] = useState(expense?.memo ?? "");
  const [date, setDate] = useState(expense?.date ?? getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const normalCategories = categories.filter((c) => !c.is_leisure);
  const leisureCategories = categories.filter((c) => c.is_leisure);

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
      await supabase.from("expenses").update(payload).eq("id", expense.id);
      router.push("/expenses");
      router.refresh();
    } else {
      await supabase.from("expenses").insert(payload);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/expenses");
        router.refresh();
      }
    }
  }

  async function handleDelete() {
    if (!expense) return;
    if (!confirm("この支出を削除しますか？")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", expense.id);
    router.push("/expenses");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          金額 <span className="text-red-500">*</span>
        </label>
        <CalcInput initialValue={expense?.amount} onChange={setAmount} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
        <div className="space-y-2">
          {normalCategories.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">通常</p>
              <div className="flex flex-wrap gap-2">
                {normalCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      categoryId === c.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {leisureCategories.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">余暇</p>
              <div className="flex flex-wrap gap-2">
                {leisureCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      categoryId === c.id
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-700 border-gray-200"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例：ランチ、コンビニ..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 text-lg"
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
          {deleting ? "削除中..." : "この支出を削除"}
        </button>
      )}
    </form>
  );
}
