import { createClient } from "@/lib/supabase/client";
import SavingsChart from "@/components/SavingsChart";
import SavingsManualAdd from "@/components/SavingsManualAdd";

export default async function SavingsPage() {
  const supabase = createClient();
  const { data: history } = await supabase
    .from("savings_history")
    .select("*")
    .order("year_month", { ascending: true })
    .limit(12);

  const latest = history?.at(-1);
  const basicBalance = latest?.basic_balance ?? 0;
  const specialBalance = latest?.special_balance ?? 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold pt-2">貯金管理</h1>

      <div className="flex gap-4">
        <div className="flex-1 bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-500 font-medium">基本枠</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            ¥{basicBalance.toLocaleString()}
          </p>
        </div>
        <div className="flex-1 bg-green-50 rounded-xl p-4">
          <p className="text-xs text-green-500 font-medium">特別枠</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            ¥{specialBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <p className="text-sm font-medium text-gray-500 mb-1">総貯金額</p>
        <p className="text-3xl font-bold">
          ¥{(basicBalance + specialBalance).toLocaleString()}
        </p>
      </div>

      <SavingsManualAdd basicBalance={basicBalance} specialBalance={specialBalance} />

      {history && history.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm font-medium text-gray-500 mb-4">残高推移</p>
          <SavingsChart data={history} />
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>月末締め後にグラフが表示されます</p>
        </div>
      )}
    </div>
  );
}
