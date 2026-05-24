"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  yearMonth: string;
  income: number;
  savingsTarget: number;
  totalExpense: number;
  latestBasicBalance: number;
  latestSpecialBalance: number;
  alreadyClosed: boolean;
};

export default function MonthClosing({
  yearMonth,
  income,
  savingsTarget,
  totalExpense,
  latestBasicBalance,
  latestSpecialBalance,
  alreadyClosed,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const surplus = income - totalExpense;
  const basicDelta = savingsTarget;
  const specialDelta = surplus - savingsTarget;
  const newBasicBalance = latestBasicBalance + basicDelta;
  const newSpecialBalance = latestSpecialBalance + specialDelta;

  async function handleClose() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("savings_history").upsert({
      year_month: yearMonth,
      surplus,
      basic_delta: basicDelta,
      special_delta: specialDelta,
      basic_balance: newBasicBalance,
      special_balance: newSpecialBalance,
      carryover_balance: latestSpecialBalance,
    }, { onConflict: "year_month" });

    setLoading(false);
    setPreview(false);
    router.refresh();
  }

  if (alreadyClosed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
        ✓ 今月の締め処理は完了しています
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
          月末締めを実行
        </button>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">締め処理の確認</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">収入</span>
              <span>¥{income.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">支出合計</span>
              <span>¥{totalExpense.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1 mt-1">
              <span className="text-gray-500">余剰額</span>
              <span className={surplus < 0 ? "text-red-500" : ""}>
                ¥{surplus.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="border-t pt-3 space-y-1 text-sm">
            <p className="text-xs text-gray-400 mb-2">振り分け結果</p>
            <div className="flex justify-between">
              <span className="text-blue-600">基本枠</span>
              <span>
                ¥{latestBasicBalance.toLocaleString()} → ¥{newBasicBalance.toLocaleString()}
                <span className="text-xs text-gray-400 ml-1">(+¥{basicDelta.toLocaleString()})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">特別枠</span>
              <span>
                ¥{latestSpecialBalance.toLocaleString()} → ¥{newSpecialBalance.toLocaleString()}
                <span className={`text-xs ml-1 ${specialDelta < 0 ? "text-red-400" : "text-gray-400"}`}>
                  ({specialDelta >= 0 ? "+" : ""}¥{specialDelta.toLocaleString()})
                </span>
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              ※ 特別枠の内訳: 繰り越し ¥{latestSpecialBalance.toLocaleString()} + 当月 {specialDelta >= 0 ? "+" : ""}¥{specialDelta.toLocaleString()}
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
