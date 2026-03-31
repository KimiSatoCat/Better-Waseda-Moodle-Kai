/**
 * Better Waseda Moodle 改 - スクールバス情報取得 API
 *
 * GET /api/bus-info
 *
 * 早稲田大学の公式バスページから時刻表PDFリンクを取得し構造化して返す。
 * サーバーサイドでfetchすることでCORS問題を回避。
 *
 * 対応キャンパス：
 *   - 所沢キャンパス（小手指駅↔所沢）: 人間科学部・スポーツ科学部共通
 *   - 早稲田↔西早稲田（TWIns連絡バス）
 *
 * データソース（いずれも早稲田大学公式サイト）：
 *   https://www.waseda.jp/fhum/hum/facility/bus-parking/
 *   https://www.waseda.jp/fsps/sps/facility/bus-parking/
 *   https://www.waseda.jp/inst/twins/current/timetable/
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export interface BusEntry {
  title: string;
  url: string;
  date: string;      // 更新日 YYYY.MM.DD
  type: "special" | "regular" | "vacation" | "other";
}

export interface CampusBusInfo {
  campus: string;
  label: string;
  sourceUrl: string;
  updates: BusEntry[];   // 更新情報テーブルの項目（最新3件）
  special: BusEntry[];   // 特別ダイヤ
  regular: BusEntry[];   // 通常ダイヤ
  fetchedAt: string;
}

export interface BusInfoResponse {
  campuses: CampusBusInfo[];
  fetchedAt: string;
}

/**
 * HTMLテキストからPDFリンクをすべて抽出する。
 * <a href="...pdf">テキスト</a> のパターンにマッチ。
 */
function extractLinks(html: string, baseUrl: string): { href: string; text: string }[] {
  const results: { href: string; text: string }[] = [];
  // PDF or external href のリンクを取得
  const re = /<a[^>]+href="([^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].startsWith("http") ? m[1] : new URL(m[1], baseUrl).href;
    const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text && href) results.push({ href, text });
  }
  return results;
}

/**
 * 更新情報テーブルを解析する。
 * <td>日付</td><td><a href="...">タイトル</a></td> パターン
 */
function extractUpdateTable(html: string, baseUrl: string): BusEntry[] {
  const entries: BusEntry[] = [];
  // テーブル行を抽出
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row;
  while ((row = rowRe.exec(html)) !== null) {
    const cells = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
    if (cells.length < 2) continue;
    const dateText = cells[0].replace(/<[^>]+>/g, "").trim();
    const linkMatch = cells[1].match(/href="([^"]*\.pdf)"/);
    const titleMatch = cells[1].match(/>([^<]+)</);
    if (!dateText.match(/^\d{4}\.\d{2}\.\d{2}$/) && !dateText.match(/^\d{4}\/\d{2}\/\d{2}$/)) continue;
    if (!linkMatch) continue;
    const href = linkMatch[1].startsWith("http") ? linkMatch[1] : new URL(linkMatch[1], baseUrl).href;
    const title = titleMatch?.[1]?.trim() ?? href;
    entries.push({
      title,
      url: href,
      date: dateText,
      type: classifyEntry(title),
    });
  }
  return entries;
}

/**
 * タイトルからエントリーの種別を判定する。
 */
function classifyEntry(title: string): BusEntry["type"] {
  const t = title.toLowerCase();
  if (t.includes("特別") || t.includes("special")) return "special";
  if (t.includes("休業") || t.includes("vacation") || t.includes("休暇")) return "vacation";
  if (t.includes("春学期") || t.includes("秋学期") || t.includes("semester") || t.includes("通常")) return "regular";
  return "other";
}

/**
 * 指定URLのページからバス情報を取得・解析する。
 */
async function fetchCampusBusInfo(
  campus: string,
  label: string,
  sourceUrl: string
): Promise<CampusBusInfo> {
  const fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BetterWasedaMoodleKai/1.0)",
        "Accept": "text/html",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // 更新情報テーブルを解析
    const updates = extractUpdateTable(html, sourceUrl).slice(0, 5);

    // 全PDFリンクを取得
    const allLinks = extractLinks(html, sourceUrl);

    // 特別ダイヤと通常ダイヤを分類
    const special: BusEntry[] = [];
    const regular: BusEntry[] = [];

    for (const link of allLinks) {
      const entry: BusEntry = {
        title: link.text,
        url: link.href,
        date: "",
        type: classifyEntry(link.text),
      };
      if (entry.type === "special" || entry.type === "vacation") {
        special.push(entry);
      } else if (entry.type === "regular") {
        regular.push(entry);
      }
    }

    return { campus, label, sourceUrl, updates, special: special.slice(0, 5), regular: regular.slice(0, 3), fetchedAt };
  } catch (e) {
    console.error(`Failed to fetch ${sourceUrl}:`, e);
    return { campus, label, sourceUrl, updates: [], special: [], regular: [], fetchedAt };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();

  // キャッシュヘッダー（6時間）
  res.setHeader("Cache-Control", "public, max-age=21600, stale-while-revalidate=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const [tokorozawaHum, tokorozawaSps] = await Promise.all([
      fetchCampusBusInfo(
        "tokorozawa",
        "🚌 所沢キャンパス（小手指↔所沢）",
        "https://www.waseda.jp/fhum/hum/facility/bus-parking/"
      ),
      fetchCampusBusInfo(
        "tokorozawa_sps",
        "🚌 所沢キャンパス・スポーツ科学部",
        "https://www.waseda.jp/fsps/sps/facility/bus-parking/"
      ),
    ]);

    // 人間科学部とスポーツ科学部の情報をマージ（同じバスなのでupdatesは人間科学部を優先）
    const tokorozawa: CampusBusInfo = {
      campus: "tokorozawa",
      label: "🚌 所沢キャンパス（小手指↔所沢）",
      sourceUrl: "https://www.waseda.jp/fhum/hum/facility/bus-parking/",
      updates: tokorozawaHum.updates.length > 0 ? tokorozawaHum.updates : tokorozawaSps.updates,
      special: [...tokorozawaHum.special, ...tokorozawaSps.special].filter(
        (e, i, arr) => arr.findIndex((x) => x.url === e.url) === i
      ).slice(0, 5),
      regular: [...tokorozawaHum.regular, ...tokorozawaSps.regular].filter(
        (e, i, arr) => arr.findIndex((x) => x.url === e.url) === i
      ).slice(0, 3),
      fetchedAt: tokorozawaHum.fetchedAt,
    };

    const response: BusInfoResponse = {
      campuses: [tokorozawa],
      fetchedAt: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (e) {
    console.error("bus-info error:", e);
    return res.status(500).json({ error: "Failed to fetch bus info" });
  }
}
