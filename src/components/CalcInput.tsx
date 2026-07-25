"use client";

import { useState } from "react";

type Op = "+" | "-" | "×" | "÷";

type Props = {
  initialValue?: number;
  onChange: (value: number) => void;
};

function compute(left: number, op: Op, right: number): number {
  switch (op) {
    case "+": return Math.round(left + right);
    case "-": return Math.round(left - right);
    case "×": return Math.round(left * right);
    case "÷": return right !== 0 ? Math.round(left / right) : left;
  }
}

export default function CalcInput({ initialValue, onChange }: Props) {
  const [display, setDisplay] = useState(initialValue && initialValue > 0 ? String(initialValue) : "0");
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const [freshEntry, setFreshEntry] = useState(false);

  function notify(disp: string, pVal: number | null, pOp: Op | null, isFresh: boolean) {
    const cur = parseFloat(disp) || 0;
    if (pVal !== null && pOp !== null && !isFresh) {
      onChange(Math.max(0, compute(pVal, pOp, cur)));
    } else if (isFresh && pVal !== null) {
      onChange(Math.max(0, pVal));
    } else {
      onChange(Math.max(0, cur));
    }
  }

  function pressDigit(d: string) {
    let next: string;
    if (freshEntry) {
      next = d === "." ? "0." : d;
      setFreshEntry(false);
      setDisplay(next);
      notify(next, pendingValue, pendingOp, false);
    } else {
      if (d === "." && display.includes(".")) return;
      next = display === "0" && d !== "." ? d : display + d;
      setDisplay(next);
      notify(next, pendingValue, pendingOp, false);
    }
  }

  function pressOp(op: Op) {
    const cur = parseFloat(display) || 0;
    let left = cur;
    if (pendingValue !== null && pendingOp !== null && !freshEntry) {
      left = compute(pendingValue, pendingOp, cur);
      setDisplay(String(left));
    }
    setPendingValue(left);
    setPendingOp(op);
    setFreshEntry(true);
    onChange(Math.max(0, left));
  }

  function pressEquals() {
    if (pendingValue === null || pendingOp === null) return;
    const cur = parseFloat(display) || 0;
    const result = Math.max(0, compute(pendingValue, pendingOp, cur));
    setDisplay(String(result));
    setPendingValue(null);
    setPendingOp(null);
    setFreshEntry(true);
    onChange(result);
  }

  function pressBackspace() {
    if (freshEntry && pendingValue !== null) {
      setDisplay(String(pendingValue));
      setPendingOp(null);
      setPendingValue(null);
      setFreshEntry(false);
      onChange(Math.max(0, pendingValue));
      return;
    }
    if (display.length <= 1) {
      setDisplay("0");
      onChange(0);
    } else {
      const next = display.slice(0, -1);
      setDisplay(next);
      notify(next, pendingValue, pendingOp, false);
    }
  }

  function pressClear() {
    setDisplay("0");
    setPendingOp(null);
    setPendingValue(null);
    setFreshEntry(false);
    onChange(0);
  }

  const displayNum = parseFloat(display);
  const expr = pendingValue !== null && pendingOp !== null
    ? `${pendingValue.toLocaleString()} ${pendingOp}`
    : "";

  return (
    <div className="space-y-3">
      {/* Display */}
      <div className="bg-gray-50 rounded-2xl px-5 py-4 text-right min-h-[76px] flex flex-col justify-end">
        {expr && <p className="text-sm text-gray-400 mb-1">{expr}</p>}
        <p className="text-4xl font-bold text-gray-800 tabular-nums">
          ¥{isNaN(displayNum) ? "0" : displayNum.toLocaleString()}
        </p>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-2">
        <Btn label="7" onClick={() => pressDigit("7")} />
        <Btn label="8" onClick={() => pressDigit("8")} />
        <Btn label="9" onClick={() => pressDigit("9")} />
        <Btn label="⌫" onClick={pressBackspace} variant="secondary" />

        <Btn label="4" onClick={() => pressDigit("4")} />
        <Btn label="5" onClick={() => pressDigit("5")} />
        <Btn label="6" onClick={() => pressDigit("6")} />
        <Btn label="+" onClick={() => pressOp("+")} variant="op" active={pendingOp === "+"} />

        <Btn label="1" onClick={() => pressDigit("1")} />
        <Btn label="2" onClick={() => pressDigit("2")} />
        <Btn label="3" onClick={() => pressDigit("3")} />
        <Btn label="−" onClick={() => pressOp("-")} variant="op" active={pendingOp === "-"} />

        <Btn label="." onClick={() => pressDigit(".")} />
        <Btn label="0" onClick={() => pressDigit("0")} />
        <Btn label="×" onClick={() => pressOp("×")} variant="op" active={pendingOp === "×"} />
        <Btn label="÷" onClick={() => pressOp("÷")} variant="op" active={pendingOp === "÷"} />

        <button
          type="button"
          onClick={pressClear}
          className="col-span-2 py-4 bg-gray-100 text-gray-600 font-semibold rounded-xl text-lg active:scale-95 transition-transform select-none"
        >
          C
        </button>
        <button
          type="button"
          onClick={pressEquals}
          className="col-span-2 py-4 bg-blue-600 text-white font-bold rounded-xl text-lg active:scale-95 transition-transform select-none"
        >
          =
        </button>
      </div>
    </div>
  );
}

type BtnProps = {
  label: string;
  onClick: () => void;
  variant?: "default" | "op" | "secondary";
  active?: boolean;
};

function Btn({ label, onClick, variant = "default", active = false }: BtnProps) {
  const base = "py-4 text-xl font-semibold rounded-xl active:scale-95 transition-transform select-none";
  const cls =
    variant === "op"
      ? active
        ? "bg-blue-600 text-white"
        : "bg-blue-50 text-blue-600 border border-blue-100"
      : variant === "secondary"
      ? "bg-gray-100 text-gray-600"
      : "bg-white border border-gray-200 text-gray-800";
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      {label}
    </button>
  );
}
