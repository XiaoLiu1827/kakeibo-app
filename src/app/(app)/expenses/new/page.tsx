import { createServerClient } from "@/lib/supabase/client";
import ExpenseForm from "@/components/ExpenseForm";

export default async function NewExpensePage() {
  const supabase = createServerClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("is_leisure", { ascending: true })
    .order("name");

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold pt-2 mb-6">支出を追加</h1>
      <ExpenseForm categories={categories ?? []} />
    </div>
  );
}
