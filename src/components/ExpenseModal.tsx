"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ExpenseForm from "./ExpenseForm";
import type { Category } from "@/lib/supabase/types";

type Props = {
  categories: Category[];
};

export default function ExpenseModal({ categories }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setIsOpen(true), 80);
    return () => clearTimeout(t);
  }, []);

  const open = useCallback(() => {
    setFormKey((k) => k + 1);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  function handleSuccess() {
    close();
    router.refresh();
  }

  return (
    <>
      {/* ＋ 支出追加 ボタン */}
      <button
        onClick={open}
        className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        支出追加
      </button>

      {/* バックドロップ */}
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ボトムシート */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out max-h-[92vh] ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800">支出を追加</h2>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* フォームエリア（スクロール可） */}
        <div className="overflow-y-auto px-5 pb-12 flex-1">
          <ExpenseForm key={formKey} categories={categories} onSuccess={handleSuccess} />
        </div>
      </div>
    </>
  );
}
