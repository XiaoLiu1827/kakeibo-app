export const dynamic = "force-dynamic";
import { createServerClient } from "@/lib/supabase/client";
import IncomeForm from "@/components/IncomeForm";
import Link from "next/link";

export default async function NewIncomePage() {
  const supabase = createServerClient();
  const { data: categories } = await supabase
    .from("income_categories")
    .select("*")
    .order("created_at");

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-2 mb-6">
        <Link href="/incomes" className="text-gray-400 text-sm">← 戻る</Link>
        <h1 className="text-xl font-bold">収入を追加</h1>
      </div>
      <IncomeForm categories={categories ?? []} />
    </div>
  );
}
