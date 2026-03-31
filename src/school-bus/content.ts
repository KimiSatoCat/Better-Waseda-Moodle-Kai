/**
 * スクールバス ナビバー注入モジュール
 *
 * SchoolBusEnabled が true のとき、ナビバーに「🚌 バス」ボタンを追加する。
 * クリックするとフローティングパネルに最新の時刻表PDFリンクを表示する。
 *
 * データは Vercel API (better-waseda-moodlekai.vercel.app/api/bus-info) から取得。
 * キャッシュは localStorage に保存し、毎月10/20/30日に更新する。
 */

import { BUS_API_URL, BUS_INFO_SOURCE_URL, BUS_CACHE_KEY, BusInfoCache, CampusBusInfo, BusEntry, isCacheValid, calcNextRefresh } from "./bus";
import { ConfigKey, getConfig, initConfig } from "@/common/config/config";

export const SCHOOL_BUS_NAV_ID = "bwm-schoolbus-nav";
const PANEL_ID = "bwm-bus-panel";

/** バス情報をAPIから取得しキャッシュに保存する */
async function fetchAndCacheBusInfo(): Promise<CampusBusInfo[]> {
    const res = await fetch(BUS_API_URL);
    if (!res.ok) throw new Error(`bus-info API error: ${res.status}`);
    const json = await res.json();
    const cache: BusInfoCache = {
        data: json.campuses,
        cachedAt: new Date().toISOString(),
        nextRefresh: calcNextRefresh().toISOString(),
    };
    localStorage.setItem(BUS_CACHE_KEY, JSON.stringify(cache));
    return cache.data;
}

/** キャッシュ読み込み or APIフェッチ */
async function getBusInfo(): Promise<CampusBusInfo[]> {
    const cached = localStorage.getItem(BUS_CACHE_KEY);
    if (cached) {
        try {
            const cache: BusInfoCache = JSON.parse(cached);
            if (isCacheValid(cache) && cache.data.length > 0) return cache.data;
        } catch { /* fall through */ }
    }
    return fetchAndCacheBusInfo();
}

/** エントリのバッジ色を返す */
function badgeStyle(type: BusEntry["type"]): string {
    switch (type) {
        case "special": return "background:#e74c3c;color:#fff;";
        case "vacation": return "background:#e67e22;color:#fff;";
        case "regular": return "background:#27ae60;color:#fff;";
        default: return "background:#7f8c8d;color:#fff;";
    }
}

/** エントリのバッジテキスト */
function badgeText(type: BusEntry["type"]): string {
    switch (type) {
        case "special": return "特別";
        case "vacation": return "休業期間";
        case "regular": return "通常";
        default: return "その他";
    }
}

/** パネルのHTMLを生成する */
function buildPanelHTML(campuses: CampusBusInfo[]): string {
    if (campuses.length === 0) return "<p style='padding:12px;color:#666;'>情報を取得できませんでした。</p>";

    let html = "";
    for (const c of campuses) {
        html += `<div style="margin-bottom:16px;">`;
        html += `<div style="font-weight:700;font-size:0.85rem;color:#2c3e50;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #3498db;">${c.label}</div>`;

        // 最新更新情報（最大3件）
        if (c.updates.length > 0) {
            html += `<div style="font-size:0.75rem;color:#666;margin-bottom:6px;">📋 最新更新</div>`;
            for (const u of c.updates.slice(0, 3)) {
                html += `<div style="margin-bottom:4px;">
                    <span style="font-size:0.72rem;color:#999;margin-right:4px;">${u.date}</span>
                    <a href="${u.url}" target="_blank" rel="noopener noreferrer"
                       style="font-size:0.78rem;color:#3498db;text-decoration:none;word-break:break-all;"
                       title="${u.title}">${u.title.length > 50 ? u.title.slice(0, 50) + "…" : u.title}</a>
                </div>`;
            }
        }

        // 特別ダイヤ
        if (c.special.length > 0) {
            html += `<div style="font-size:0.75rem;color:#666;margin:8px 0 4px;">⚠️ 特別ダイヤ・休業期間</div>`;
            for (const s of c.special.slice(0, 3)) {
                html += `<div style="margin-bottom:4px;display:flex;align-items:flex-start;gap:4px;">
                    <span style="font-size:0.68rem;padding:1px 5px;border-radius:3px;white-space:nowrap;flex-shrink:0;${badgeStyle(s.type)}">${badgeText(s.type)}</span>
                    <a href="${s.url}" target="_blank" rel="noopener noreferrer"
                       style="font-size:0.78rem;color:#3498db;text-decoration:none;"
                       title="${s.title}">${s.title.length > 45 ? s.title.slice(0, 45) + "…" : s.title}</a>
                </div>`;
            }
        }

        // 通常ダイヤ
        if (c.regular.length > 0) {
            html += `<div style="font-size:0.75rem;color:#666;margin:8px 0 4px;">📅 通常ダイヤ</div>`;
            for (const r of c.regular) {
                html += `<div style="margin-bottom:4px;display:flex;align-items:flex-start;gap:4px;">
                    <span style="font-size:0.68rem;padding:1px 5px;border-radius:3px;white-space:nowrap;flex-shrink:0;${badgeStyle(r.type)}">${badgeText(r.type)}</span>
                    <a href="${r.url}" target="_blank" rel="noopener noreferrer"
                       style="font-size:0.78rem;color:#3498db;text-decoration:none;"
                       title="${r.title}">${r.title.length > 45 ? r.title.slice(0, 45) + "…" : r.title}</a>
                </div>`;
            }
        }

        html += `<div style="margin-top:8px;text-align:right;">
            <a href="${c.sourceUrl}" target="_blank" rel="noopener noreferrer"
               style="font-size:0.75rem;color:#7f8c8d;text-decoration:none;">🔗 公式ページで確認</a>
        </div>`;
        html += `</div>`;
    }
    return html;
}

/** フローティングパネルを作成・更新する */
function showPanel(navBtn: HTMLElement, campuses: CampusBusInfo[]): void {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
        panel = document.createElement("div");
        panel.id = PANEL_ID;
        panel.style.cssText = `
            position:fixed;z-index:99998;
            background:#fff;border:1px solid #ddd;border-radius:10px;
            box-shadow:0 8px 32px rgba(0,0,0,0.18);
            padding:16px;width:360px;max-height:480px;overflow-y:auto;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        `;
        document.body.appendChild(panel);
    }

    // 位置調整（ナビバーの下に表示）
    const rect = navBtn.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.left = `${Math.min(rect.left, window.innerWidth - 380)}px`;
    panel.style.display = "block";

    // ヘッダー
    const cachedAt = (() => {
        const c = localStorage.getItem(BUS_CACHE_KEY);
        if (!c) return "";
        try { return new Date(JSON.parse(c).cachedAt).toLocaleDateString("ja-JP"); } catch { return ""; }
    })();

    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span style="font-weight:700;font-size:0.95rem;">🚌 スクールバス時刻表</span>
            <button id="${PANEL_ID}-close" style="border:none;background:none;cursor:pointer;font-size:1.1rem;padding:0 4px;color:#666;">✕</button>
        </div>
        <div style="font-size:0.72rem;color:#aaa;margin-bottom:10px;">
            ※早稲田大学公式サイトの情報を表示しています${cachedAt ? `（取得日: ${cachedAt}）` : ""}
        </div>
        <div id="${PANEL_ID}-content">
            ${buildPanelHTML(campuses)}
        </div>
    `;

    document.getElementById(`${PANEL_ID}-close`)?.addEventListener("click", () => {
        panel!.style.display = "none";
    });
}

/** パネルを閉じる */
function closePanel(): void {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.display = "none";
}

/** ナビバーにバスボタンを注入する（dark-mode/content.ts から呼ばれる） */
export async function injectBusNavItem(
    navList: HTMLUListElement,
    makeNavItemFn: (id: string, html: string) => HTMLLIElement
): Promise<void> {
    if (document.getElementById(SCHOOL_BUS_NAV_ID)) return;

    await initConfig();
    if (!getConfig(ConfigKey.SchoolBusEnabled)) return;

    const busLi = makeNavItemFn(SCHOOL_BUS_NAV_ID, `<span>🚌 バス</span>`);
    const busA = busLi.querySelector("a")!;
    busA.title = "スクールバス時刻表";

    let panelOpen = false;
    let busData: CampusBusInfo[] = [];

    // ローディング状態でパネルを開き、データ取得後に更新
    busA.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (panelOpen) {
            closePanel();
            panelOpen = false;
            return;
        }

        panelOpen = true;
        // まず空パネルを表示
        showPanel(busA, []);
        const contentEl = document.getElementById(`${PANEL_ID}-content`);
        if (contentEl) contentEl.innerHTML = `<p style="text-align:center;padding:20px;color:#666;">🔄 最新情報を取得中...</p>`;

        try {
            busData = await getBusInfo();
            const contentEl2 = document.getElementById(`${PANEL_ID}-content`);
            if (contentEl2) contentEl2.innerHTML = buildPanelHTML(busData);
        } catch {
            const contentEl2 = document.getElementById(`${PANEL_ID}-content`);
            if (contentEl2) contentEl2.innerHTML = `
                <p style="color:#e74c3c;padding:12px;font-size:0.85rem;">
                    情報の取得に失敗しました。
                    <a href="${BUS_INFO_SOURCE_URL}" target="_blank" rel="noopener noreferrer"
                       style="color:#3498db;">公式ページを開く</a>
                </p>`;
        }
    });

    // パネル外クリックで閉じる
    document.addEventListener("click", (e) => {
        const panel = document.getElementById(PANEL_ID);
        if (panel && !panel.contains(e.target as Node) && e.target !== busA) {
            panel.style.display = "none";
            panelOpen = false;
        }
    });

    navList.appendChild(busLi);
}
