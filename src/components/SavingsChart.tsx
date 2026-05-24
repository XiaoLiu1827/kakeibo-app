"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
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

function buildMonthly(data: SavingsHistory[]): ChartPoint[] {
  return data.map((d) => {
    const [y, m] = d.year_month.split("-");
    const yearShort = y!.slice(2);
    return {
      label: `${yearShort}/${m}`,
      基本枠: d.basic_balance,
      特別枠: d.special_balance,
      合計: d.basic_balance + d.special_balance,
    };
  });
}

function buildHalfYear(data: SavingsHistory[]): ChartPoint[] {
  const map = new Map<string, SavingsHistory>();
  for (const d of data) {
    const [y, m] = d.year_month.split("-");
    const half = Number(m) <= 6 ? "上" : "下";
    const key = `${y}${half}`;
    map.set(key, d);
  }
  return Array.from(map.entries()).map(([key, d]) => ({
    label: key,
    基本枠: d.basic_balance,
    特別枠: d.special_balance,
    合計: d.basic_balance + d.special_balance,
  }));
}

function buildYearly(data: SavingsHistory[]): ChartPoint[] {
  const map = new Map<string, SavingsHistory>();
  for (const d of data) {
    const y = d.year_month.slice(0, 4);
    map.set(y, d);
  }
  return Array.from(map.entries()).map(([y, d]) => ({
    label: `${y}年`,
    基本枠: d.basic_balance,
    特別枠: d.special_balance,
    合計: d.basic_balance + d.special_balance,
  }));
}

const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: "monthly", label: "月ごと" },
  { key: "halfyear", label: "半年ごと" },
  { key: "yearly", label: "年ごと" },
];

export default function SavingsChart({ data }: { data: SavingsHistory[] }) {
  const [period, setPeriod] = useState<Period>("monthly");

  const chartData =
    period === "monthly"
      ? buildMonthly(data)
      : period === "halfyear"
      ? buildHalfYear(data)
      : buildYearly(data);

  return (
    <div className="space-y-4">
      {/* 期間切り替え */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {PERIOD_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              period === key
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
            width={36}
          />
          <Tooltip
            formatter={(value) => `¥${Number(value).toLocaleString()}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="基本枠" stroke="#3b82f6" strokeWidth={2} dot={chartData.length <= 24} />
          <Line type="monotone" dataKey="特別枠" stroke="#22c55e" strokeWidth={2} dot={chartData.length <= 24} />
          <Line type="monotone" dataKey="合計" stroke="#8b5cf6" strokeWidth={2} dot={chartData.length <= 24} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
