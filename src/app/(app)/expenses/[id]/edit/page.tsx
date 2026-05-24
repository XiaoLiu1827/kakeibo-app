import { createServerClient } from "@/lib/supabase/client";
import ExpenseForm from "@/components/ExpenseForm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditExpensePage(props: PageProps<"/expenses/[id]/edit">) {
  const { id } = await props.params;
  const supabase = createServerClient();

  const [expenseRes, categoriesRes] = await Promise.all([
    supabase.from("expenses").select("*").eq("id", id).single(),
    supabase.from("categories").select("*").order("is_leisure").order("name"),
  ]);

  if (!expenseRes.data) notFound();

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-2 mb-6">
        <Link href="/expenses" className="text-gray-400 text-sm">← 戻る</Link>
        <h1 className="text-xl font-bold">支出を編集</h1>
      </div>
      <ExpenseForm
        categories={categoriesRes.data ?? []}
        expense={expenseRes.data}
      />
    </div>
  );
}
