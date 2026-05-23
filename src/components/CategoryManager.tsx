"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/supabase/types";

export default function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLeisure, setIsLeisure] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const supabase = createClient();
    await supabase.from("categories").insert({
      name: name.trim(),
      is_leisure: isLeisure,
      is_default: false,
    });

    setName("");
    setIsLeisure(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", id);
    router.refresh();
  }

  const normal = categories.filter((c) => !c.is_leisure);
  const leisure = categories.filter((c) => c.is_leisure);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs text-gray-400 font-medium">通常カテゴリ</p>
        {normal.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm">{c.name}</span>
            {!c.is_default && (
              <button
                onClick={() => handleDelete(c.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                削除
              </button>
            )}
          </div>
        ))}
        <p className="text-xs text-gray-400 font-medium pt-2">余暇カテゴリ</p>
        {leisure.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm">{c.name}</span>
            {!c.is_default && (
              <button
                onClick={() => handleDelete(c.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                削除
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="space-y-3 pt-2">
        <p className="text-xs font-medium text-gray-500">新しいカテゴリを追加</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="カテゴリ名"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLeisure(false)}
            className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
              !isLeisure ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            通常
          </button>
          <button
            type="button"
            onClick={() => setIsLeisure(true)}
            className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
              isLeisure ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            余暇
          </button>
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-2.5 bg-gray-800 text-white text-sm font-medium rounded-xl disabled:opacity-40"
        >
          追加
        </button>
      </form>
    </div>
  );
}
