"use client";

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

export default function SavingsChart({ data }: { data: SavingsHistory[] }) {
  const chartData = data.map((d) => ({
    month: d.year_month.slice(5) + "月",
    基本枠: d.basic_balance,
    特別枠: d.special_balance,
    合計: d.basic_balance + d.special_balance,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
        />
        <Tooltip
          formatter={(value) => `¥${Number(value).toLocaleString()}`}
        />
        <Legend />
        <Line type="monotone" dataKey="基本枠" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="特別枠" stroke="#22c55e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="合計" stroke="#8b5cf6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
