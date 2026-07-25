"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { MonthlySettings } from "@/lib/supabase/types";

type Props = {
  yearMonth: string;
  settings: MonthlySettings | null;
  prevSavingsTarget?: number;
  totalFixedBudget: number;
  totalIncome: number;
};

export default function SettingsForm({ yearMonth, settings, prevSavingsTarget, totalFixedBudget, totalIncome }: Props) {
  const router = useRouter();
  const defaultTarget = settings?.savings_target ?? prevSavingsTarget ?? 50000;
  const [savingsTarget, setSavingsTarget] = useState(String(defaultTarget));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const leisureBudget = totalIncome - totalFixedBudget - Number(savingsTarget || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const supabase = createClient();
    const payload = {
      year_month: yearMonth,
      income: totalIncome,
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
      <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">今月の収入合計</p>
          <p className="text-xl font-bold text-emerald-700">¥{totalIncome.toLocaleString()}</p>
        </div>
        <Link
          href="/incomes"
          className="text-sm text-emerald-600 font-medium border border-emerald-200 px-3 py-1.5 rounded-full"
        >
          収入を記録 →
        </Link>
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

      {totalIncome > 0 && (
        <div className={`rounded-xl p-4 ${leisureBudget >= 0 ? "bg-orange-50" : "bg-red-50"}`}>
          <p className="text-xs font-medium text-gray-500 mb-1">今月の余暇予算（自動計算）</p>
          <p className={`text-2xl font-bold ${leisureBudget >= 0 ? "text-orange-600" : "text-red-500"}`}>
            ¥{leisureBudget.toLocaleString()}
          </p>
          <div className="text-xs text-gray-400 mt-2 space-y-0.5">
            <div className="flex justify-between">
              <span>収入合計</span>
              <span>¥{totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>固定費予算合計</span>
              <span>− ¥{totalFixedBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>貯金目標額</span>
              <span>− ¥{Number(savingsTarget).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

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
