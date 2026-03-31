import { BUS_API_URL, BUS_INFO_SOURCE_URL, BUS_CACHE_KEY, BusInfoCache, CampusBusInfo, BusEntry, isCacheValid, calcNextRefresh } from "./bus";
import { ConfigKey, getConfig, initConfig } from "@/common/config/config";

export const SCHOOL_BUS_NAV_ID = "bwm-schoolbus-nav";
const PANEL_ID = "bwm-bus-panel";

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

function badgeStyle(type: BusEntry["type"]): string {
    switch (type) {
        case "special":  return "background:#e74c3c;color:#fff;";
        case "vacation": return "background:#e67e22;color:#fff;";
        case "regular":  return "background:#27ae60;color:#fff;";
        default:         return "background:#7f8c8d;color:#fff;";
    }
}

function badgeText(type: BusEntry["type"]): string {
    switch (type) {
        case "special":  return "特別";
        case "vacation": return "休業期間";
        case "regular":  return "通常";
        default:         return "その他";
    }
}

/** ダークモード判定 */
function isDark(): boolean {
    return document.documentElement.classList.contains("bwm-dark-mode");
}

/** ダークモード対応カラーを返す */
function colors() {
    const dark = isDark();
    return {
        panelBg:    dark ? "#1e1e2e" : "#ffffff",
        panelBorder:dark ? "#3a3a5c" : "#e0e0e0",
        headerBg:   dark ? "#252540" : "#f4f6fa",
        headingText:dark ? "#a0c4ff" : "#1a3a6b",
        sectionText:dark ? "#c0d0f0" : "#2c3e50",
        bodyText:   dark ? "#d0daf0" : "#333333",
        linkColor:  dark ? "#7eb8ff" : "#2980b9",
        mutedText:  dark ? "#8899bb" : "#888888",
        divider:    dark ? "#3a3a5c" : "#e0e8f8",
        footerText: dark ? "#6677aa" : "#aaaaaa",
        shadow:     dark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.14)",
    };
}

/** 1セクション分のHTML（見やすい大きめ太字レイアウト） */
function buildSection(
    icon: string,
    label: string,
    items: BusEntry[],
    c: ReturnType<typeof colors>
): string {
    if (items.length === 0) return "";

    let html = `
        <div style="margin-bottom:20px;">
            <div style="
                font-size:1rem;font-weight:800;
                color:${c.sectionText};
                padding:8px 12px;margin-bottom:10px;
                border-left:4px solid ${c.headingText};
                background:${c.headerBg};
                border-radius:0 6px 6px 0;
            ">${icon} ${label}</div>`;

    for (const item of items) {
        const badge = `<span style="
            display:inline-block;
            font-size:0.72rem;font-weight:700;
            padding:2px 7px;border-radius:4px;
            white-space:nowrap;flex-shrink:0;
            ${badgeStyle(item.type)}
        ">${badgeText(item.type)}</span>`;

        const title = item.title.length > 50
            ? item.title.slice(0, 50) + "…"
            : item.title;

        html += `
            <div style="
                display:flex;align-items:flex-start;gap:8px;
                margin-bottom:9px;padding:0 4px;
            ">
                ${badge}
                <a href="${item.url}" target="_blank" rel="noopener noreferrer"
                   title="${item.title}"
                   style="
                       font-size:0.88rem;font-weight:600;
                       color:${c.linkColor};
                       text-decoration:none;
                       line-height:1.4;word-break:break-all;
                   "
                   onmouseover="this.style.textDecoration='underline'"
                   onmouseout="this.style.textDecoration='none'"
                >${title}</a>
            </div>`;
    }

    html += `</div>`;
    return html;
}

/** 最新更新セクション */
function buildUpdatesSection(updates: BusEntry[], c: ReturnType<typeof colors>): string {
    if (updates.length === 0) return "";

    let html = `
        <div style="margin-bottom:20px;">
            <div style="
                font-size:1rem;font-weight:800;
                color:${c.sectionText};
                padding:8px 12px;margin-bottom:10px;
                border-left:4px solid #9b59b6;
                background:${c.headerBg};
                border-radius:0 6px 6px 0;
            ">📋 最新更新情報</div>`;

    for (const u of updates.slice(0, 3)) {
        const title = u.title.length > 50 ? u.title.slice(0, 50) + "…" : u.title;
        html += `
            <div style="margin-bottom:8px;padding:0 4px;">
                <div style="font-size:0.72rem;color:${c.mutedText};font-weight:600;margin-bottom:2px;">
                    📅 ${u.date}
                </div>
                <a href="${u.url}" target="_blank" rel="noopener noreferrer"
                   title="${u.title}"
                   style="
                       font-size:0.85rem;font-weight:600;
                       color:${c.linkColor};text-decoration:none;
                       line-height:1.4;word-break:break-all;
                   "
                   onmouseover="this.style.textDecoration='underline'"
                   onmouseout="this.style.textDecoration='none'"
                >${title}</a>
            </div>`;
    }

    html += `</div>`;
    return html;
}

/** パネルのHTMLを生成する（順: 通常ダイヤ→特別ダイヤ→最新更新） */
function buildPanelHTML(campuses: CampusBusInfo[]): string {
    if (campuses.length === 0) {
        return `<p style="padding:16px;color:#888;text-align:center;">情報を取得できませんでした。</p>`;
    }

    const c = colors();
    let html = "";

    for (const campus of campuses) {
        // ① 通常ダイヤ
        html += buildSection("📅", "通常ダイヤ", campus.regular, c);

        // 区切り線
        if (campus.regular.length > 0 && (campus.special.length > 0 || campus.updates.length > 0)) {
            html += `<hr style="border:none;border-top:1px solid ${c.divider};margin:4px 0 16px;">`;
        }

        // ② 特別ダイヤ・休業期間
        html += buildSection("⚠️", "特別ダイヤ・休業期間", campus.special, c);

        if (campus.special.length > 0 && campus.updates.length > 0) {
            html += `<hr style="border:none;border-top:1px solid ${c.divider};margin:4px 0 16px;">`;
        }

        // ③ 最新更新情報
        html += buildUpdatesSection(campus.updates, c);

        // 公式ページリンク
        html += `
            <div style="
                margin-top:4px;padding:10px 12px;
                background:${c.headerBg};border-radius:6px;
                text-align:center;
            ">
                <a href="${campus.sourceUrl}" target="_blank" rel="noopener noreferrer"
                   style="font-size:0.82rem;font-weight:700;color:${c.mutedText};text-decoration:none;"
                   onmouseover="this.style.color='${c.linkColor}'"
                   onmouseout="this.style.color='${c.mutedText}'"
                >🔗 早稲田大学公式バスページで確認する</a>
            </div>`;
    }

    return html;
}

function showPanel(navBtn: HTMLElement, campuses: CampusBusInfo[]): void {
    let panel = document.getElementById(PANEL_ID);
    const c = colors();

    if (!panel) {
        panel = document.createElement("div");
        panel.id = PANEL_ID;
        document.body.appendChild(panel);
    }

    Object.assign(panel.style, {
        position: "fixed",
        zIndex: "99998",
        background: c.panelBg,
        border: `1px solid ${c.panelBorder}`,
        borderRadius: "12px",
        boxShadow: c.shadow,
        padding: "18px",
        width: "380px",
        maxHeight: "520px",
        overflowY: "auto",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "block",
        transition: "none",
    });

    const rect = navBtn.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.left = `${Math.min(rect.left, window.innerWidth - 400)}px`;

    const cachedAt = (() => {
        try {
            const c = localStorage.getItem(BUS_CACHE_KEY);
            return c ? new Date(JSON.parse(c).cachedAt).toLocaleDateString("ja-JP") : "";
        } catch { return ""; }
    })();

    panel.innerHTML = `
        <div style="
            display:flex;justify-content:space-between;align-items:center;
            margin-bottom:14px;padding-bottom:10px;
            border-bottom:2px solid ${c.divider};
        ">
            <span style="font-weight:900;font-size:1.05rem;color:${c.headingText};">
                🚌 スクールバス時刻表
            </span>
            <button id="${PANEL_ID}-close" style="
                border:none;background:none;cursor:pointer;
                font-size:1.2rem;color:${c.mutedText};padding:0;line-height:1;
            ">✕</button>
        </div>
        <div style="
            font-size:0.72rem;color:${c.mutedText};
            margin-bottom:14px;padding:6px 10px;
            background:${c.headerBg};border-radius:6px;
        ">
            ※ 早稲田大学公式サイトの情報を表示しています${cachedAt ? `（取得日: ${cachedAt}）` : ""}
        </div>
        <div id="${PANEL_ID}-content">
            ${buildPanelHTML(campuses)}
        </div>
    `;

    document.getElementById(`${PANEL_ID}-close`)?.addEventListener("click", () => {
        panel!.style.display = "none";
    });
}

function closePanel(): void {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.display = "none";
}

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

    busA.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (panelOpen) {
            closePanel();
            panelOpen = false;
            return;
        }

        panelOpen = true;
        // ローディング表示
        showPanel(busA, []);
        const contentEl = document.getElementById(`${PANEL_ID}-content`);
        if (contentEl) {
            contentEl.innerHTML = `
                <div style="text-align:center;padding:24px;color:${colors().mutedText};">
                    <div style="font-size:1.5rem;margin-bottom:8px;">🔄</div>
                    <div style="font-size:0.88rem;font-weight:600;">最新情報を取得中...</div>
                </div>`;
        }

        try {
            const busData = await getBusInfo();
            const contentEl2 = document.getElementById(`${PANEL_ID}-content`);
            if (contentEl2) contentEl2.innerHTML = buildPanelHTML(busData);
        } catch {
            const contentEl2 = document.getElementById(`${PANEL_ID}-content`);
            if (contentEl2) {
                contentEl2.innerHTML = `
                    <p style="color:#e74c3c;padding:12px;font-size:0.88rem;font-weight:600;">
                        情報の取得に失敗しました。<br>
                        <a href="${BUS_INFO_SOURCE_URL}" target="_blank" rel="noopener noreferrer"
                           style="color:#3498db;">👉 公式ページを直接確認する</a>
                    </p>`;
            }
        }
    });

    document.addEventListener("click", (e) => {
        const panel = document.getElementById(PANEL_ID);
        if (panel && !panel.contains(e.target as Node) && e.target !== busA) {
            panel.style.display = "none";
            panelOpen = false;
        }
    });

    navList.appendChild(busLi);
}
