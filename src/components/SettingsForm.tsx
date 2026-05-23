"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MonthlySettings } from "@/lib/supabase/types";

type Props = {
  yearMonth: string;
  settings: MonthlySettings | null;
};

export default function SettingsForm({ yearMonth, settings }: Props) {
  const router = useRouter();
  const [income, setIncome] = useState(String(settings?.income ?? ""));
  const [leisureBudget, setLeisureBudget] = useState(
    String(settings?.leisure_budget ?? "")
  );
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
      leisure_budget: Number(leisureBudget),
    };

    if (settings) {
      await supabase
        .from("monthly_settings")
        .update(payload)
        .eq("year_month", yearMonth);
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
          余暇予算
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
          <input
            type="number"
            inputMode="numeric"
            value={leisureBudget}
            onChange={(e) => setLeisureBudget(e.target.value)}
            placeholder="例: 30000"
            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
