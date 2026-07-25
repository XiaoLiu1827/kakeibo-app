"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export type MonthlyPoint = {
  label: string;
  収入: number;
  支出: number;
};

export type PiePoint = {
  name: string;
  value: number;
};

const PIE_COLORS = [
  "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316",
];

export function MonthlyBalanceChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
          width={36}
        />
        <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="収入" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="支出" fill="#f87171" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExpenseDonutChart({ data }: { data: PiePoint[] }) {
  const filled = data.filter((d) => d.value > 0);
  if (filled.length === 0) return null;
  const total = filled.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-2">
      <div className="shrink-0">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={filled}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={62}
              paddingAngle={2}
              dataKey="value"
            >
              {filled.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {filled.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="text-gray-600 truncate">{d.name}</span>
            <span className="ml-auto text-gray-700 font-medium shrink-0">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
