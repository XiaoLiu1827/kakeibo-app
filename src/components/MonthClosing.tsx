"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getPreviousYearMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

type ClosingData = {
  income: number;
  savingsTarget: number;
  totalExpense: number;
  latestBasicBalance: number;
  latestSpecialBalance: number;
  alreadyClosed: boolean;
  hasSettings: boolean;
};

export default function MonthClosing() {
  const router = useRouter();
  const prevMonth = getPreviousYearMonth();
  const [data, setData] = useState<ClosingData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    const supabase = createClient();

    const [settingsRes, expensesRes, closingRes, prevSavingsRes] = await Promise.all([
      supabase.from("monthly_settings").select("income, savings_target").eq("year_month", prevMonth).maybeSingle(),
      supabase.from("expenses").select("amount").gte("date", `${prevMonth}-01`).lte("date", `${prevMonth}-31`),
      supabase.from("savings_history").select("id").eq("year_month", prevMonth).maybeSingle(),
      supabase.from("savings_history")
        .select("basic_balance, special_balance")
        .lt("year_month", prevMonth)
        .order("year_month", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const totalExpense = (expensesRes.data ?? []).reduce((s, e) => s + e.amount, 0);

    setData({
      income: settingsRes.data?.income ?? 0,
      savingsTarget: settingsRes.data?.savings_target ?? 50000,
      totalExpense,
      latestBasicBalance: prevSavingsRes.data?.basic_balance ?? 0,
      latestSpecialBalance: prevSavingsRes.data?.special_balance ?? 0,
      alreadyClosed: !!closingRes.data,
      hasSettings: !!settingsRes.data,
    });
    setLoadingData(false);
  }, [prevMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleClose() {
    if (!data) return;
    setLoading(true);
    const supabase = createClient();
    const surplus = data.income - data.totalExpense;
    const basicDelta = data.savingsTarget;
    const specialDelta = surplus - data.savingsTarget;
    await supabase.from("savings_history").upsert({
      year_month: prevMonth,
      surplus,
      basic_delta: basicDelta,
      special_delta: specialDelta,
      basic_balance: data.latestBasicBalance + basicDelta,
      special_balance: data.latestSpecialBalance + specialDelta,
      carryover_balance: data.latestSpecialBalance,
    }, { onConflict: "year_month" });

    setLoading(false);
    setPreview(false);
    router.refresh();
    fetchData();
  }

  const surplus = data ? data.income - data.totalExpense : 0;
  const basicDelta = data?.savingsTarget ?? 0;
  const specialDelta = surplus - basicDelta;
  const newBasicBalance = (data?.latestBasicBalance ?? 0) + basicDelta;
  const newSpecialBalance = (data?.latestSpecialBalance ?? 0) + specialDelta;

  if (loadingData) {
    return <div className="text-sm text-gray-400 py-2">読み込み中...</div>;
  }

  if (!data?.hasSettings) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
        {formatMonthLabel(prevMonth)}の月次設定が未入力のため締め処理できません
      </div>
    );
  }

  if (data.alreadyClosed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
        ✓ {formatMonthLabel(prevMonth)}の締め処理は完了しています
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!preview ? (
        <button
          onClick={() => setPreview(true)}
          className="w-full py-3 bg-gray-800 text-white font-bold rounded-xl text-sm"
        >
          {formatMonthLabel(prevMonth)}の締めを実行
        </button>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">{formatMonthLabel(prevMonth)} 締め処理の確認</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">収入</span>
              <span>¥{data.income.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">支出合計</span>
              <span>¥{data.totalExpense.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1 mt-1">
              <span className="text-gray-500">余剰額</span>
              <span className={surplus < 0 ? "text-red-500" : ""}>¥{surplus.toLocaleString()}</span>
            </div>
          </div>
          <div className="border-t pt-3 space-y-1 text-sm">
            <p className="text-xs text-gray-400 mb-2">振り分け結果</p>
            <div className="flex justify-between">
              <span className="text-blue-600">基本枠</span>
              <span>
                ¥{data.latestBasicBalance.toLocaleString()} → ¥{newBasicBalance.toLocaleString()}
                <span className="text-xs text-gray-400 ml-1">(+¥{basicDelta.toLocaleString()})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">特別枠</span>
              <span>
                ¥{data.latestSpecialBalance.toLocaleString()} → ¥{newSpecialBalance.toLocaleString()}
                <span className={`text-xs ml-1 ${specialDelta < 0 ? "text-red-400" : "text-gray-400"}`}>
                  ({specialDelta >= 0 ? "+" : ""}¥{specialDelta.toLocaleString()})
                </span>
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              ※ 特別枠の内訳: 繰り越し ¥{data.latestSpecialBalance.toLocaleString()} + 当月 {specialDelta >= 0 ? "+" : ""}¥{specialDelta.toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setPreview(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600"
            >
              キャンセル
            </button>
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {loading ? "処理中..." : "確定する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
