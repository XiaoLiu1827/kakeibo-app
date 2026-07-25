"use client";

import { useRouter } from "next/navigation";
import { getLocalDateString } from "@/lib/dateUtils";

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y!, m! - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

type Props = {
  current: string;
  basePath: string;
};

export default function MonthPicker({ current, basePath }: Props) {
  const router = useRouter();
  const todayYM = getLocalDateString().slice(0, 7);
  const isCurrentMonth = current === todayYM;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => router.push(`${basePath}?month=${shiftMonth(current, -1)}`)}
        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 active:bg-gray-100 transition-colors"
        aria-label="前の月"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-base font-bold text-gray-800 min-w-[96px] text-center">
        {formatLabel(current)}
      </span>

      <button
        onClick={() => router.push(`${basePath}?month=${shiftMonth(current, 1)}`)}
        disabled={isCurrentMonth}
        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 active:bg-gray-100 transition-colors disabled:opacity-30"
        aria-label="次の月"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
