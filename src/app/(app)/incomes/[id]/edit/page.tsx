import { createServerClient } from "@/lib/supabase/client";
import IncomeForm from "@/components/IncomeForm";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export default async function EditIncomePage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient();

  const [incomeRes, categoriesRes] = await Promise.all([
    supabase.from("incomes").select("*").eq("id", id).single(),
    supabase.from("income_categories").select("*").order("created_at"),
  ]);

  if (!incomeRes.data) notFound();

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-2 mb-6">
        <Link href="/incomes" className="text-gray-400 text-sm">← 戻る</Link>
        <h1 className="text-xl font-bold">収入を編集</h1>
      </div>
      <IncomeForm categories={categoriesRes.data ?? []} income={incomeRes.data} />
    </div>
  );
}
