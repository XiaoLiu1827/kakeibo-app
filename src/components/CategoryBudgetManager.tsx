"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category, CategoryBudget } from "@/lib/supabase/types";

type Props = {
  categories: Category[];
  budgets: CategoryBudget[];
};

export default function CategoryBudgetManager({ categories, budgets }: Props) {
  const router = useRouter();
  const normalCategories = categories.filter((c) => !c.is_leisure);

  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category_id, b.budget]));
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(normalCategories.map((c) => [c.id, String(budgetMap[c.id] ?? "")]))
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    const supabase = createClient();

    await Promise.all(
      normalCategories.map((c) =>
        supabase.from("category_budgets").upsert(
          { category_id: c.id, budget: Number(values[c.id] ?? 0), updated_at: new Date().toISOString() },
          { onConflict: "category_id" }
        )
      )
    );

    setSaved(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">通常カテゴリの月次予算を設定します</p>
      {normalCategories.map((c) => (
        <div key={c.id} className="flex items-center gap-3">
          <span className="text-sm w-20 shrink-0 text-gray-700">{c.name}</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
            <input
              type="number"
              inputMode="numeric"
              value={values[c.id] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [c.id]: e.target.value }))}
              placeholder="0"
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 mt-2"
      >
        {loading ? "保存中..." : saved ? "保存しました ✓" : "保存する"}
      </button>
    </div>
  );
}
