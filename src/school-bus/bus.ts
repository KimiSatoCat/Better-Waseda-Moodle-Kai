/**
 * スクールバス情報モジュール（共有定数・型・キャッシュ管理）
 *
 * 情報ソース：早稲田大学公式サイト（waseda.jp）
 *   https://www.waseda.jp/fhum/hum/facility/bus-parking/
 *   https://www.waseda.jp/fsps/sps/facility/bus-parking/
 *
 * VercelバックエンドAPIがサーバーサイドでwaseda.jpを取得・解析し、
 * 構造化されたJSONを返す。
 */

export const BUS_API_URL = "https://better-waseda-moodlekai.vercel.app/api/bus-info";
export const BUS_INFO_SOURCE_URL = "https://www.waseda.jp/fhum/hum/facility/bus-parking/";
export const BUS_CACHE_KEY = "bwm_bus_cache";

/** 毎月10日・20日・30日にキャッシュを更新する日 */
export const REFRESH_DAYS = [10, 20, 30];

export interface BusEntry {
  title: string;
  url: string;
  date: string;
  type: "special" | "regular" | "vacation" | "other";
}

export interface CampusBusInfo {
  campus: string;
  label: string;
  sourceUrl: string;
  updates: BusEntry[];
  special: BusEntry[];
  regular: BusEntry[];
  fetchedAt: string;
}

export interface BusInfoCache {
  data: CampusBusInfo[];
  cachedAt: string;
  nextRefresh: string;
}

/** キャッシュが有効かどうかを判定する（当日が更新日より前なら有効） */
export function isCacheValid(cache: BusInfoCache): boolean {
  const now = new Date();
  const next = new Date(cache.nextRefresh);
  return now < next;
}

/** 次回更新日時を計算する（今月or翌月の10/20/30日） */
export function calcNextRefresh(): Date {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth();

  for (const d of REFRESH_DAYS) {
    if (day < d) {
      const next = new Date(year, month, d, 0, 0, 0);
      return next;
    }
  }
  // 今月の全更新日を過ぎたら来月10日
  return new Date(year, month + 1, 10, 0, 0, 0);
}
