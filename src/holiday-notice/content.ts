/**
 * 休日授業実施通知モジュール
 *
 * 当日 or 前週（7日以内）に「休日だが授業がある日」がある場合に
 * Moodle上部にバナー通知を表示する。
 *
 * - 当日: 「⚠️ 本日（昭和の日）は授業実施日です」
 * - 事前: 「📅 来週 4/29（昭和の日）は授業実施日です」（残りN日）
 * - 「今日は表示しない」: localStorage で当日限り非表示
 * - 設定で HolidayNoticeEnabled = false で完全無効
 */

import { ConfigKey, getConfig, initConfig } from "@/common/config/config";

const BANNER_ID    = "bwm-holiday-notice";
const HOLIDAY_API  = "https://better-waseda-moodlekai.vercel.app/holiday-classes.json";
const DISMISSED_KEY = "bwm_holiday_dismissed";
/** 何日前から通知するか（前の週 = 7日前） */
const NOTICE_DAYS_BEFORE = 7;

interface HolidayClass {
    date: string;
    holiday: string;
    holidayEn: string;
    dayType: string;
    dayTypeJa: string;
    note: string;
    noteEn: string;
}

const t    = (key: string) => browser.i18n.getMessage(key) || key;
const isEn = () => (browser.i18n.getMessage("locale") || "ja") === "en";

function isDarkMode(): boolean {
    return document.documentElement.classList.contains("bwm-dark-mode");
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/** 日付文字列(YYYY-MM-DD)を Date に変換 */
function parseDate(s: string): Date {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/** today から target までの残り日数（当日 = 0） */
function daysUntil(target: string): number {
    const now = parseDate(todayStr());
    const tgt = parseDate(target);
    return Math.round((tgt.getTime() - now.getTime()) / 86400000);
}

/** 「今日は表示しない」の判定 */
function isDismissedToday(): boolean {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        if (!raw) return false;
        return (JSON.parse(raw) as { date: string }).date === todayStr();
    } catch { return false; }
}

function dismissToday(): void {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ date: todayStr() }));
}

/** 今日から NOTICE_DAYS_BEFORE 日以内で最も近い授業実施日を返す */
async function fetchUpcomingHolidayClass(): Promise<{ info: HolidayClass; daysLeft: number } | null> {
    try {
        const res = await fetch(`${HOLIDAY_API}?t=${todayStr()}`, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        const list: HolidayClass[] = data.holidayClasses ?? [];

        // 0 ≤ daysLeft ≤ NOTICE_DAYS_BEFORE の範囲でソート
        const candidates = list
            .map((h) => ({ info: h, daysLeft: daysUntil(h.date) }))
            .filter(({ daysLeft }) => daysLeft >= 0 && daysLeft <= NOTICE_DAYS_BEFORE)
            .sort((a, b) => a.daysLeft - b.daysLeft);

        return candidates[0] ?? null;
    } catch { return null; }
}

/** 日付を読みやすい形式に変換（例: 4/29(水)） */
function formatDate(dateStr: string, en: boolean): string {
    const d = parseDate(dateStr);
    const days_ja = ["日", "月", "火", "水", "木", "金", "土"];
    const days_en = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const dow = en ? days_en[d.getDay()] : days_ja[d.getDay()];
    return en
        ? `${m}/${day} (${dow})`
        : `${m}/${day}（${dow}）`;
}

function buildBanner(info: HolidayClass, daysLeft: number): HTMLElement {
    const dark = isDarkMode();
    const en   = isEn();
    const isToday = daysLeft === 0;

    // 当日: オレンジ系 / 事前: 青系
    const bgColor      = dark
        ? (isToday ? "#5a2000" : "#0d2040")
        : (isToday ? "#fff3e0" : "#e3f2fd");
    const borderColor  = dark
        ? (isToday ? "#ff8c00" : "#2196f3")
        : (isToday ? "#e65100" : "#1565c0");
    const textColor    = dark
        ? (isToday ? "#ffd090" : "#90caf9")
        : (isToday ? "#bf360c" : "#0d47a1");
    const subColor     = dark
        ? (isToday ? "#ffb74d" : "#64b5f6")
        : (isToday ? "#e65100" : "#1976d2");
    const closeBg      = dark
        ? (isToday ? "#7a3a10" : "#1a3a60")
        : (isToday ? "#ffe0b2" : "#bbdefb");
    const icon         = isToday ? "⚠️" : "📅";

    const holiday = en ? info.holidayEn : info.holiday;
    const note    = en ? info.noteEn    : info.note;
    const dateFormatted = formatDate(info.date, en);

    // タイトル文言
    let titleText: string;
    let subText: string;
    if (isToday) {
        titleText = en
            ? `Class held today (${holiday})`
            : `本日（${holiday}）は授業実施日です`;
        subText = en
            ? `${info.dayType} class schedule is in effect. ${note}`
            : `${info.dayTypeJa}ダイヤで授業が行われます。${note}`;
    } else {
        titleText = en
            ? `Upcoming: Class on ${dateFormatted} (${holiday}) — ${daysLeft} day${daysLeft > 1 ? "s" : ""} away`
            : `お知らせ: ${dateFormatted}（${holiday}）は授業実施日です — あと${daysLeft}日`;
        subText = en
            ? `${info.dayType} class schedule will be in effect. ${note}`
            : `${info.dayTypeJa}ダイヤで授業が行われます。${note}`;
    }

    const dismissLabel = en ? "Dismiss for today" : "今日は表示しない";
    const sourceLabel  = en ? "Check schedule"    : "授業実施日一覧を確認";
    const SOURCE_URL   = "https://www.waseda.jp/fhum/ghum/student/registration/";

    const banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.style.cssText = `
        position:fixed; top:0; left:0; right:0; z-index:99999;
        background:${bgColor}; border-bottom:3px solid ${borderColor};
        padding:10px 16px; display:flex; align-items:flex-start; gap:12px;
        box-shadow:0 4px 16px rgba(0,0,0,0.2);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        animation:bwm-slide-down 0.3s ease-out;
    `;

    banner.innerHTML = `
        <style>
            @keyframes bwm-slide-down{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
        </style>
        <div style="font-size:1.4rem;flex-shrink:0;line-height:1.2;">${icon}</div>
        <div style="flex:1;min-width:0;">
            <div style="font-size:0.95rem;font-weight:800;color:${textColor};margin-bottom:3px;">${titleText}</div>
            <div style="font-size:0.82rem;color:${subColor};line-height:1.5;">${subText}</div>
            <div style="margin-top:6px;">
                <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer"
                   style="font-size:0.75rem;font-weight:700;color:${textColor};text-decoration:underline;">
                    📋 ${sourceLabel}
                </a>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;align-items:flex-end;">
            <button id="${BANNER_ID}-dismiss" style="
                padding:4px 11px;border-radius:20px;border:none;
                background:${closeBg};color:${textColor};
                font-size:0.72rem;font-weight:700;cursor:pointer;white-space:nowrap;
            ">${dismissLabel}</button>
            <button id="${BANNER_ID}-close" style="
                background:none;border:none;cursor:pointer;
                font-size:1rem;color:${textColor};padding:0;line-height:1;
            ">✕</button>
        </div>
    `;

    const removeBanner = () => {
        banner.remove();
        document.body.style.paddingTop = originalPaddingTop;
    };

    banner.querySelector(`#${BANNER_ID}-dismiss`)?.addEventListener("click", () => {
        dismissToday();
        removeBanner();
    });
    banner.querySelector(`#${BANNER_ID}-close`)?.addEventListener("click", removeBanner);

    return banner;
}

let originalPaddingTop = "";

export async function initHolidayNotice(): Promise<void> {
    await initConfig();
    if (!getConfig(ConfigKey.HolidayNoticeEnabled)) return;
    if (isDismissedToday()) return;

    const result = await fetchUpcomingHolidayClass();
    if (!result) return;

    const { info, daysLeft } = result;
    const banner = buildBanner(info, daysLeft);
    document.body.prepend(banner);

    originalPaddingTop = document.body.style.paddingTop || "";
    document.body.style.paddingTop = `${banner.offsetHeight + 4}px`;

    // ダークモード切替時に再描画
    const mo = new MutationObserver(() => {
        const existing = document.getElementById(BANNER_ID);
        if (existing) {
            const nb = buildBanner(info, daysLeft);
            existing.replaceWith(nb);
            document.body.style.paddingTop = `${nb.offsetHeight + 4}px`;
        }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}
