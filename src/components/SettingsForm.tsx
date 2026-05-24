"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MonthlySettings } from "@/lib/supabase/types";

type Props = {
  yearMonth: string;
  settings: MonthlySettings | null;
  prevSavingsTarget?: number;
};

export default function SettingsForm({ yearMonth, settings, prevSavingsTarget }: Props) {
  const router = useRouter();
  const defaultTarget = settings?.savings_target ?? prevSavingsTarget ?? 50000;
  const [income, setIncome] = useState(String(settings?.income ?? ""));
  const [savingsTarget, setSavingsTarget] = useState(String(defaultTarget));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const supabase = createClient();
    const payload = {
      year_month: yearMonth,
      income: Number(income),
      savings_target: Number(savingsTarget),
      leisure_budget: 0,
    };

    if (settings) {
      await supabase.from("monthly_settings").update(payload).eq("year_month", yearMonth);
    } else {
      await supabase.from("monthly_settings").insert(payload);
    }

    setSaved(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          今月の手取り収入
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
          <input
            type="number"
            inputMode="numeric"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="例: 280000"
            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          今月の貯金目標額
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
          <input
            type="number"
            inputMode="numeric"
            value={savingsTarget}
            onChange={(e) => setSavingsTarget(e.target.value)}
            placeholder="例: 50000"
            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">前月の値を引き継ぎます</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50"
      >
        {loading ? "保存中..." : saved ? "保存しました ✓" : "保存する"}
      </button>
    </form>
  );
}
