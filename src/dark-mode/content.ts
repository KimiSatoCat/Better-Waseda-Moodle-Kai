import { ConfigKey, getConfig, initConfig, setConfig } from "@/common/config/config";
import "./dark-mode.css";
import { injectBusNavItem, SCHOOL_BUS_NAV_ID } from "../school-bus/content";
import { initHolidayNotice } from "../holiday-notice/content";

const DARK_CLASS = "bwm-dark-mode";
const TOGGLE_ID = "bwm-darkmode-toggle";
const INQUIRY_ID = "bwm-inquiry-link";
const INQUIRY_URL = "https://better-waseda-moodlekai.vercel.app/inquiry.html";

// i18n ヘルパー
const t = (key: string) => browser.i18n.getMessage(key) || key;

function applyDarkMode(enabled: boolean): void {
    if (enabled) document.documentElement.classList.add(DARK_CLASS);
    else document.documentElement.classList.remove(DARK_CLASS);
}

function suppressNativeInquiryLinks(): void {
    const selectors = ["nav li", ".navigation li", ".nav-item", "[role='menuitem']", "[role='none']"];
    const seen = new Set<Element>();
    for (const sel of selectors) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            if (seen.has(el)) return;
            seen.add(el);
            const a = el.tagName === "A" ? el as HTMLAnchorElement : el.querySelector<HTMLAnchorElement>("a");
            if (!a) return;
            if (a.id === INQUIRY_ID || a.id === TOGGLE_ID || a.id === SCHOOL_BUS_NAV_ID) return;
            const text = (a.textContent ?? "").replace(/\s/g, "");
            if (text.includes("お問い合わせ") || text.includes("Contact")) {
                const li = el.closest("li") ?? el;
                (li as HTMLElement).style.setProperty("display", "none", "important");
            }
        });
    }
}

function findNavList(): HTMLUListElement | null {
    const candidates = [
        "nav.moremenu [role='menubar']",
        ".secondary-navigation ul.nav",
        ".secondary-navigation ul",
        ".primary-navigation ul.nav",
        ".primary-navigation ul",
    ];
    for (const sel of candidates) {
        const el = document.querySelector<HTMLUListElement>(sel);
        if (el && !el.dataset.bwm) return el;
    }
    return null;
}

export function makeNavItem(id: string, html: string): HTMLLIElement {
    const li = document.createElement("li");
    li.setAttribute("role", "none");
    li.className = "nav-item";
    const a = document.createElement("a");
    a.id = id;
    a.className = "nav-link";
    a.setAttribute("role", "menuitem");
    a.setAttribute("href", "#");
    a.innerHTML = html;
    a.style.cssText = "cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;";
    li.appendChild(a);
    return li;
}

async function inject(navList: HTMLUListElement, isDark: boolean): Promise<void> {
    navList.dataset.bwm = "1";

    // ── ライト/ダーク トグル ──
    const toggleLi = makeNavItem(TOGGLE_ID, `<span>${isDark ? t("nav_light_mode") : t("nav_dark_mode")}</span>`);
    toggleLi.querySelector("a")!.addEventListener("click", async (e) => {
        e.preventDefault();
        const next = !getConfig(ConfigKey.DarkModeEnabled);
        await setConfig(ConfigKey.DarkModeEnabled, next);
        location.reload();
    });
    navList.appendChild(toggleLi);

    // ── スクールバス（設定ONのとき）──
    await injectBusNavItem(navList, makeNavItem);

    // ── お問い合わせ ──
    const inquiryLi = makeNavItem(INQUIRY_ID, `<span>${t("nav_inquiry")}</span>`);
    const inquiryA = inquiryLi.querySelector("a")!;
    inquiryA.setAttribute("href", INQUIRY_URL);
    inquiryA.setAttribute("target", "_blank");
    inquiryA.setAttribute("rel", "noopener noreferrer");
    inquiryA.addEventListener("click", (e) => { e.stopPropagation(); });
    navList.appendChild(inquiryLi);
}

(async () => {
    await initConfig();
    const isDark = getConfig(ConfigKey.DarkModeEnabled);
    applyDarkMode(isDark);

    // 休日授業実施通知
    initHolidayNotice();

    let injected = false;

    async function tryInject(): Promise<boolean> {
        if (!injected) {
            if (document.getElementById(TOGGLE_ID) && document.getElementById(INQUIRY_ID)) {
                injected = true;
            } else {
                const navList = findNavList();
                if (!navList) return false;
                await inject(navList, isDark);
                injected = true;
            }
        }
        suppressNativeInquiryLinks();
        return true;
    }

    tryInject();

    const observer = new MutationObserver(async () => {
        if (!injected) {
            await tryInject();
        } else {
            suppressNativeInquiryLinks();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(async () => {
        if (!injected) await tryInject();
        suppressNativeInquiryLinks();
    }, 3000);
})();
