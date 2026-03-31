/**
 * 休日授業実施通知モジュール
 *
 * 当日が「休日だが授業がある日」の場合、Moodleのページ上部に
 * 目立つバナー通知を表示する。
 *
 * データソース: https://better-waseda-moodlekai.vercel.app/holiday-classes.json
 * （年度初めに管理者が更新）
 *
 * 動作:
 * - 毎日起動時にVercelからJSONを取得（当日分のみチェック）
 * - 通知を「今日は閉じる」→ localStorage で当日限り非表示
 * - 設定で「通知しない」→ HolidayNoticeEnabled = false
 */

import { ConfigKey, getConfig, initConfig } from "@/common/config/config";

const BANNER_ID = "bwm-holiday-notice";
const HOLIDAY_API = "https://better-waseda-moodlekai.vercel.app/holiday-classes.json";
const DISMISSED_KEY = "bwm_holiday_dismissed";

interface HolidayClass {
    date: string;        // YYYY-MM-DD
    holiday: string;     // 昭和の日
    holidayEn: string;   // Showa Day
    dayType: string;     // Monday
    dayTypeJa: string;   // 月曜日
    note: string;
    noteEn: string;
}

// i18n
const t = (key: string) => browser.i18n.getMessage(key) || key;
const isEn = () => (browser.i18n.getMessage("locale") || "ja") === "en";

function isDarkMode(): boolean {
    return document.documentElement.classList.contains("bwm-dark-mode");
}

function todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function isDismissedToday(): boolean {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        if (!raw) return false;
        const { date } = JSON.parse(raw);
        return date === todayStr();
    } catch { return false; }
}

function dismissToday(): void {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ date: todayStr() }));
}

async function fetchTodayHolidayClass(): Promise<HolidayClass | null> {
    const today = todayStr();
    try {
        const res = await fetch(`${HOLIDAY_API}?t=${today}`, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        const list: HolidayClass[] = data.holidayClasses ?? [];
        return list.find((h) => h.date === today) ?? null;
    } catch { return null; }
}

function buildBanner(info: HolidayClass): HTMLElement {
    const dark = isDarkMode();
    const en = isEn();

    const banner = document.createElement("div");
    banner.id = BANNER_ID;

    // スタイル
    const bgColor   = dark ? "#5a2000" : "#fff3e0";
    const borderColor = dark ? "#ff8c00" : "#e65100";
    const textColor = dark ? "#ffd090" : "#bf360c";
    const subColor  = dark ? "#ffb74d" : "#e65100";
    const closeBg   = dark ? "#7a3a10" : "#ffe0b2";

    banner.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 99999;
        background: ${bgColor};
        border-bottom: 3px solid ${borderColor};
        padding: 12px 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: bwm-slide-down 0.3s ease-out;
    `;

    const holiday = en ? info.holidayEn : info.holiday;
    const day     = en ? info.dayType   : info.dayTypeJa;
    const note    = en ? info.noteEn    : info.note;

    const titleText = en
        ? `⚠️ Class held today (${holiday})`
        : `⚠️ 本日（${holiday}）は授業実施日です`;

    const subText = en
        ? `${day} class schedule is in effect. ${note}`
        : `${day}ダイヤで授業が行われます。${note}`;

    const dismissToday_label = en ? "Dismiss for today" : "今日は表示しない";
    const settings_label     = en ? "Settings" : "通知設定";
    const source_label       = en ? "Check schedule" : "授業実施日一覧を確認";
    const SOURCE_URL = "https://www.waseda.jp/fhum/ghum/student/registration/";

    banner.innerHTML = `
        <style>
            @keyframes bwm-slide-down {
                from { transform: translateY(-100%); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
            }
            #${BANNER_ID} a:hover { opacity: 0.8; }
        </style>
        <div style="font-size:1.5rem;flex-shrink:0;line-height:1;">⚠️</div>
        <div style="flex:1;min-width:0;">
            <div style="font-size:1rem;font-weight:800;color:${textColor};margin-bottom:4px;">
                ${titleText.replace("⚠️ ", "")}
            </div>
            <div style="font-size:0.85rem;color:${subColor};line-height:1.5;">
                ${subText}
            </div>
            <div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap;">
                <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer"
                   style="font-size:0.78rem;font-weight:700;color:${textColor};text-decoration:underline;">
                    📋 ${source_label}
                </a>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;align-items:flex-end;">
            <button id="${BANNER_ID}-dismiss" style="
                padding:5px 12px;border-radius:20px;border:none;
                background:${closeBg};color:${textColor};
                font-size:0.75rem;font-weight:700;cursor:pointer;
                white-space:nowrap;
            ">${dismissToday_label}</button>
            <button id="${BANNER_ID}-close" style="
                background:none;border:none;cursor:pointer;
                font-size:1.1rem;color:${textColor};padding:0;line-height:1;
            " title="Close">✕</button>
        </div>
    `;

    // ボタンイベント
    banner.querySelector(`#${BANNER_ID}-dismiss`)?.addEventListener("click", () => {
        dismissToday();
        banner.remove();
        // body の padding-top を元に戻す
        document.body.style.paddingTop = originalPaddingTop;
    });

    banner.querySelector(`#${BANNER_ID}-close`)?.addEventListener("click", () => {
        banner.remove();
        document.body.style.paddingTop = originalPaddingTop;
    });

    return banner;
}

let originalPaddingTop = "";

export async function initHolidayNotice(): Promise<void> {
    await initConfig();
    if (!getConfig(ConfigKey.HolidayNoticeEnabled)) return;
    if (isDismissedToday()) return;

    const info = await fetchTodayHolidayClass();
    if (!info) return;

    // バナーを挿入
    const banner = buildBanner(info);
    document.body.prepend(banner);

    // body が上に隠れないよう padding を追加
    originalPaddingTop = document.body.style.paddingTop || "";
    const bannerHeight = banner.offsetHeight;
    document.body.style.paddingTop = `${bannerHeight + 4}px`;

    // ダークモード切替時に色を再描画
    const observer = new MutationObserver(() => {
        const existing = document.getElementById(BANNER_ID);
        if (existing) {
            const newBanner = buildBanner(info);
            existing.replaceWith(newBanner);
            document.body.style.paddingTop = `${newBanner.offsetHeight + 4}px`;
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}
