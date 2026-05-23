"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  basicBalance: number;
  specialBalance: number;
};

export default function SavingsManualAdd({ basicBalance, specialBalance }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"basic" | "special">("basic");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!num) return;
    setLoading(true);

    const supabase = createClient();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-manual-${Date.now()}`;

    const newBasic = target === "basic" ? basicBalance + num : basicBalance;
    const newSpecial = target === "special" ? specialBalance + num : specialBalance;

    await supabase.from("savings_history").insert({
      year_month: yearMonth,
      surplus: 0,
      basic_delta: target === "basic" ? num : 0,
      special_delta: target === "special" ? num : 0,
      basic_balance: newBasic,
      special_balance: newSpecial,
    });

    setAmount("");
    setMemo("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium"
      >
        ＋ 手動で残高を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 space-y-4">
      <p className="text-sm font-medium text-gray-700">残高を手動追加</p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTarget("basic")}
          className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
            target === "basic"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          基本枠
        </button>
        <button
          type="button"
          onClick={() => setTarget("special")}
          className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
            target === "special"
              ? "bg-green-600 text-white border-green-600"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          特別枠
        </button>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="追加金額（マイナス可）"
          className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 bg-white"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading || !amount}
          className="flex-1 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-bold disabled:opacity-50"
        >
          {loading ? "追加中..." : "追加する"}
        </button>
      </div>
    </form>
  );
}
