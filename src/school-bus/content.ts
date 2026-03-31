import { BUS_API_URL, BUS_INFO_SOURCE_URL, BUS_CACHE_KEY, BusInfoCache, CampusBusInfo, BusEntry, isCacheValid, calcNextRefresh } from "./bus";
import { ConfigKey, getConfig, initConfig } from "@/common/config/config";

export const SCHOOL_BUS_NAV_ID = "bwm-schoolbus-nav";
const PANEL_ID = "bwm-bus-panel";

// i18n ヘルパー（ブラウザのロケールに応じて日英を自動選択）
const t = (key: string) => browser.i18n.getMessage(key) || key;

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
            const c: BusInfoCache = JSON.parse(cached);
            if (isCacheValid(c) && c.data.length > 0) return c.data;
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

function badgeLabel(type: BusEntry["type"]): string {
    switch (type) {
        case "special":  return t("badge_special");
        case "vacation": return t("badge_vacation");
        case "regular":  return t("badge_regular");
        default:         return t("badge_other");
    }
}

function isDarkMode(): boolean {
    return document.documentElement.classList.contains("bwm-dark-mode");
}

function colors() {
    const dark = isDarkMode();
    return {
        panelBg:    dark ? "#1e1e2e" : "#ffffff",
        panelBorder:dark ? "#3a3a5c" : "#e0e0e0",
        headerBg:   dark ? "#252540" : "#f4f6fa",
        headingText:dark ? "#a0c4ff" : "#1a3a6b",
        sectionText:dark ? "#c0d0f0" : "#2c3e50",
        linkColor:  dark ? "#7eb8ff" : "#2980b9",
        mutedText:  dark ? "#8899bb" : "#888888",
        divider:    dark ? "#3a3a5c" : "#e0e8f8",
        shadow:     dark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.14)",
    };
}

function buildSection(
    label: string,
    borderColor: string,
    items: BusEntry[],
    c: ReturnType<typeof colors>
): string {
    if (items.length === 0) return "";
    let html = `
        <div style="margin-bottom:20px;">
            <div style="font-size:1rem;font-weight:800;color:${c.sectionText};padding:8px 12px;margin-bottom:10px;border-left:4px solid ${borderColor};background:${c.headerBg};border-radius:0 6px 6px 0;">${label}</div>`;
    for (const item of items) {
        const title = item.title.length > 50 ? item.title.slice(0, 50) + "…" : item.title;
        html += `
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:9px;padding:0 4px;">
                <span style="display:inline-block;font-size:0.72rem;font-weight:700;padding:2px 7px;border-radius:4px;white-space:nowrap;flex-shrink:0;${badgeStyle(item.type)}">${badgeLabel(item.type)}</span>
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="${item.title}"
                   style="font-size:0.88rem;font-weight:600;color:${c.linkColor};text-decoration:none;line-height:1.4;word-break:break-all;"
                   onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'"
                >${title}</a>
            </div>`;
    }
    html += `</div>`;
    return html;
}

function buildUpdatesSection(updates: BusEntry[], c: ReturnType<typeof colors>): string {
    if (updates.length === 0) return "";
    let html = `
        <div style="margin-bottom:20px;">
            <div style="font-size:1rem;font-weight:800;color:${c.sectionText};padding:8px 12px;margin-bottom:10px;border-left:4px solid #9b59b6;background:${c.headerBg};border-radius:0 6px 6px 0;">${t("bus_panel_updates")}</div>`;
    for (const u of updates.slice(0, 3)) {
        const title = u.title.length > 50 ? u.title.slice(0, 50) + "…" : u.title;
        html += `
            <div style="margin-bottom:8px;padding:0 4px;">
                <div style="font-size:0.72rem;color:${c.mutedText};font-weight:600;margin-bottom:2px;">📅 ${u.date}</div>
                <a href="${u.url}" target="_blank" rel="noopener noreferrer" title="${u.title}"
                   style="font-size:0.85rem;font-weight:600;color:${c.linkColor};text-decoration:none;line-height:1.4;word-break:break-all;"
                   onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'"
                >${title}</a>
            </div>`;
    }
    html += `</div>`;
    return html;
}

function buildPanelHTML(campuses: CampusBusInfo[]): string {
    if (campuses.length === 0) {
        return `<p style="padding:16px;color:#888;text-align:center;">${t("bus_panel_error")}</p>`;
    }
    const c = colors();
    let html = "";
    for (const campus of campuses) {
        // ① 通常ダイヤ / Regular
        html += buildSection(t("bus_panel_regular"), c.headingText, campus.regular, c);
        if (campus.regular.length > 0 && (campus.special.length > 0 || campus.updates.length > 0)) {
            html += `<hr style="border:none;border-top:1px solid ${c.divider};margin:4px 0 16px;">`;
        }
        // ② 特別ダイヤ / Special
        html += buildSection(t("bus_panel_special"), "#e74c3c", campus.special, c);
        if (campus.special.length > 0 && campus.updates.length > 0) {
            html += `<hr style="border:none;border-top:1px solid ${c.divider};margin:4px 0 16px;">`;
        }
        // ③ 最新更新 / Updates
        html += buildUpdatesSection(campus.updates, c);
        html += `
            <div style="margin-top:4px;padding:10px 12px;background:${c.headerBg};border-radius:6px;text-align:center;">
                <a href="${campus.sourceUrl}" target="_blank" rel="noopener noreferrer"
                   style="font-size:0.82rem;font-weight:700;color:${c.mutedText};text-decoration:none;"
                   onmouseover="this.style.color='${c.linkColor}'" onmouseout="this.style.color='${c.mutedText}'"
                >${t("bus_panel_open_page")}</a>
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
        position: "fixed", zIndex: "99998",
        background: c.panelBg, border: `1px solid ${c.panelBorder}`,
        borderRadius: "12px", boxShadow: c.shadow,
        padding: "18px", width: "380px", maxHeight: "520px", overflowY: "auto",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "block",
    });

    const rect = navBtn.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.left = `${Math.min(rect.left, window.innerWidth - 400)}px`;

    const cachedAt = (() => {
        try {
            const raw = localStorage.getItem(BUS_CACHE_KEY);
            if (!raw) return "";
            const locale = browser.i18n.getMessage("locale") || "ja";
            return new Date(JSON.parse(raw).cachedAt).toLocaleDateString(locale === "en" ? "en-US" : "ja-JP");
        } catch { return ""; }
    })();

    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid ${c.divider};">
            <span style="font-weight:900;font-size:1.05rem;color:${c.headingText};">${t("bus_panel_title")}</span>
            <button id="${PANEL_ID}-close" style="border:none;background:none;cursor:pointer;font-size:1.2rem;color:${c.mutedText};padding:0;line-height:1;">✕</button>
        </div>
        <div style="font-size:0.72rem;color:${c.mutedText};margin-bottom:14px;padding:6px 10px;background:${c.headerBg};border-radius:6px;">
            ${t("bus_panel_disclaimer")}${cachedAt ? `（${t("bus_panel_fetched")}: ${cachedAt}）` : ""}
        </div>
        <div id="${PANEL_ID}-content">${buildPanelHTML(campuses)}</div>`;

    document.getElementById(`${PANEL_ID}-close`)?.addEventListener("click", () => {
        panel!.style.display = "none";
    });
}

function closePanel(): void {
    const p = document.getElementById(PANEL_ID);
    if (p) p.style.display = "none";
}

export async function injectBusNavItem(
    navList: HTMLUListElement,
    makeNavItemFn: (id: string, html: string) => HTMLLIElement
): Promise<void> {
    if (document.getElementById(SCHOOL_BUS_NAV_ID)) return;
    await initConfig();
    if (!getConfig(ConfigKey.SchoolBusEnabled)) return;

    const busLi = makeNavItemFn(SCHOOL_BUS_NAV_ID, `<span>${t("nav_school_bus")}</span>`);
    const busA = busLi.querySelector("a")!;
    busA.title = t("bus_panel_title");
    let panelOpen = false;

    busA.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (panelOpen) { closePanel(); panelOpen = false; return; }
        panelOpen = true;
        showPanel(busA, []);
        const el = document.getElementById(`${PANEL_ID}-content`);
        if (el) el.innerHTML = `<div style="text-align:center;padding:24px;color:${colors().mutedText};"><div style="font-size:1.5rem;margin-bottom:8px;">🔄</div><div style="font-size:0.88rem;font-weight:600;">${t("bus_panel_loading")}</div></div>`;
        try {
            const data = await getBusInfo();
            const el2 = document.getElementById(`${PANEL_ID}-content`);
            if (el2) el2.innerHTML = buildPanelHTML(data);
        } catch {
            const el2 = document.getElementById(`${PANEL_ID}-content`);
            if (el2) el2.innerHTML = `<p style="color:#e74c3c;padding:12px;font-size:0.88rem;font-weight:600;">${t("bus_panel_error")}<br><a href="${BUS_INFO_SOURCE_URL}" target="_blank" rel="noopener noreferrer" style="color:#3498db;">${t("bus_panel_open_page")}</a></p>`;
        }
    });

    document.addEventListener("click", (e) => {
        const p = document.getElementById(PANEL_ID);
        if (p && !p.contains(e.target as Node) && e.target !== busA) {
            p.style.display = "none"; panelOpen = false;
        }
    });

    navList.appendChild(busLi);
}
