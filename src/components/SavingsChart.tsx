"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SavingsHistory } from "@/lib/supabase/types";

type Period = "monthly" | "halfyear" | "yearly";

type ChartPoint = {
  label: string;
  基本枠: number;
  特別枠: number;
  合計: number;
};

// dedupeByMonth と toPoint を丸ごと削除して、これに置き換える

function buildCumulativeByMonth(data: SavingsHistory[]) {
  // 同じ月のdeltaを合算
  const monthlyDelta = new Map<string, { basic: number; special: number }>();
  for (const d of data) {
    const key = d.year_month.slice(0, 7);
    const cur = monthlyDelta.get(key) ?? { basic: 0, special: 0 };
    cur.basic += d.basic_delta;
    cur.special += d.special_delta;
    monthlyDelta.set(key, cur);
  }

  // 月順に並べて累積
  const months = Array.from(monthlyDelta.keys()).sort(); // "YYYY-MM"同士なので通常の文字列sortでOK
  let runningBasic = 0;
  let runningSpecial = 0;
  return months.map((ym) => {
    const delta = monthlyDelta.get(ym)!;
    runningBasic += delta.basic;
    runningSpecial += delta.special;
    return { year_month: ym, basic: runningBasic, special: runningSpecial };
  });
}

function buildMonthly(data: SavingsHistory[]): ChartPoint[] {
  return buildCumulativeByMonth(data).map(({ year_month, basic, special }) => {
    const [y, m] = year_month.split("-");
    return { label: `${y!.slice(2)}/${m}`, 基本枠: basic, 特別枠: special, 合計: basic + special };
  });
}

function buildHalfYear(data: SavingsHistory[]): ChartPoint[] {
  const cum = buildCumulativeByMonth(data);
  const map = new Map<string, ChartPoint>();
  for (const { year_month, basic, special } of cum) {
    const [y, m] = year_month.split("-");
    const half = Number(m) <= 6 ? "上" : "下";
    map.set(`${y}${half}`, { label: `${y}${half}`, 基本枠: basic, 特別枠: special, 合計: basic + special });
  }
  return Array.from(map.values());
}

function buildYearly(data: SavingsHistory[]): ChartPoint[] {
  const cum = buildCumulativeByMonth(data);
  const map = new Map<string, ChartPoint>();
  for (const { year_month, basic, special } of cum) {
    const y = year_month.slice(0, 4);
    map.set(y, { label: `${y}年`, 基本枠: basic, 特別枠: special, 合計: basic + special });
  }
  return Array.from(map.values());
}

const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: "monthly", label: "月ごと" },
  { key: "halfyear", label: "半年ごと" },
  { key: "yearly", label: "年ごと" },
];

export default function SavingsChart({ data }: { data: SavingsHistory[] }) {
  const [period, setPeriod] = useState<Period>("monthly");

  const chartData =
    period === "monthly" ? buildMonthly(data) :
    period === "halfyear" ? buildHalfYear(data) :
    buildYearly(data);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {PERIOD_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              period === key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          月末締め後にグラフが表示されます
        </p>
      ) : chartData.length === 1 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
              width={36}
            />
            <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="基本枠" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="特別枠" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="合計" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
              width={36}
            />
            <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="基本枠" stroke="#3b82f6" strokeWidth={2} dot={chartData.length <= 24} />
            <Line type="monotone" dataKey="特別枠" stroke="#22c55e" strokeWidth={2} dot={chartData.length <= 24} />
            <Line type="monotone" dataKey="合計" stroke="#8b5cf6" strokeWidth={2} dot={chartData.length <= 24} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
