"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RecurringExpense } from "@/lib/supabase/types";
import { getLocalDateString } from "@/lib/dateUtils";

type Props = {
  templates: RecurringExpense[];
  yearMonth: string;
};

export default function ApplyRecurringButton({ templates, yearMonth }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // yearMonthが変わったらdoneをリセット
  const [lastMonth, setLastMonth] = useState(yearMonth);
  if (yearMonth !== lastMonth) {
    setLastMonth(yearMonth);
    setDone(false);
  }

  if (templates.length === 0) return null;

  async function handleApply() {
    if (!confirm(`固定支出テンプレート ${templates.length}件 を今日の日付で追加しますか？`)) return;
    setLoading(true);

    const supabase = createClient();
    const today = getLocalDateString();

    await supabase.from("expenses").insert(
      templates.map((t) => ({
        amount: t.amount,
        category_id: t.category_id,
        memo: t.memo,
        date: today,
      }))
    );

    setLoading(false);
    setDone(true);
    router.refresh();
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-blue-800">固定支出テンプレート</p>
        <p className="text-xs text-blue-500 mt-0.5">{templates.length}件 登録済み</p>
      </div>
      {done ? (
        <span className="text-sm font-medium text-emerald-600">追加しました ✓</span>
      ) : (
        <button
          onClick={handleApply}
          disabled={loading}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full disabled:opacity-50"
        >
          {loading ? "追加中..." : "今月分を追加"}
        </button>
      )}
    </div>
  );
}
