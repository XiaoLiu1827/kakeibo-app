// JST = UTC+9
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** サーバーサイド用: JST の現在年月を "YYYY-MM" で返す */
export function getCurrentYearMonth(): string {
  const jst = new Date(Date.now() + JST_OFFSET_MS);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** サーバーサイド用: JST の前月を "YYYY-MM" で返す */
export function getPreviousYearMonth(): string {
  return shiftMonth(getCurrentYearMonth(), -1);
}

/** "YYYY-MM" を delta ヶ月ずらして返す */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y!, m! - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 月クエリの上限として使う「翌月1日 YYYY-MM-DD」を返す。
 * .lte("date", "${ym}-31") の代わりに .lt("date", getNextMonthStart(ym)) を使う。
 */
export function getNextMonthStart(ym: string): string {
  const next = shiftMonth(ym, 1);
  return `${next}-01`;
}

/** クライアントサイド用: ブラウザのローカル日付 "YYYY-MM-DD" を返す */
export function getLocalDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
