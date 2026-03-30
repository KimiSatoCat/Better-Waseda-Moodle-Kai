import { ConfigKey, getConfig, initConfig, setConfig } from "@/common/config/config";
import "./dark-mode.css";

const DARK_CLASS = "bwm-dark-mode";
const TOGGLE_ID = "bwm-darkmode-toggle";
const INQUIRY_ID = "bwm-inquiry-link";

function applyDarkMode(enabled: boolean): void {
    if (enabled) {
        document.documentElement.classList.add(DARK_CLASS);
    } else {
        document.documentElement.classList.remove(DARK_CLASS);
    }
}

function findNavList(): HTMLUListElement | null {
    const candidates = [
        "nav.moremenu [role='menubar']",
        ".secondary-navigation ul.nav",
        ".secondary-navigation ul",
        ".primary-navigation ul.nav",
        ".primary-navigation ul",
        "ul.nav",
    ];
    for (const sel of candidates) {
        const el = document.querySelector<HTMLUListElement>(sel);
        if (el && el.querySelectorAll("li").length >= 2) return el;
    }
    return null;
}

/** ライト/ダーク トグルボタンを挿入する */
function injectToggle(navList: HTMLUListElement, isDark: boolean): void {
    if (document.getElementById(TOGGLE_ID)) return;

    const li = document.createElement("li");
    li.setAttribute("role", "none");
    li.className = "nav-item";

    const btn = document.createElement("a");
    btn.id = TOGGLE_ID;
    btn.className = "nav-link";
    btn.setAttribute("role", "menuitem");
    btn.setAttribute("href", "#");
    btn.setAttribute("aria-label", isDark ? "ライトモードに切り替える" : "ダークモードに切り替える");
    btn.innerHTML = `<span>${isDark ? "☀️ ライト" : "🌙 ダーク"}</span>`;
    btn.style.cssText = "cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;";

    btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const next = !getConfig(ConfigKey.DarkModeEnabled);
        await setConfig(ConfigKey.DarkModeEnabled, next);
        location.reload();
    });

    li.appendChild(btn);
    navList.appendChild(li);
}

/** お問い合わせリンクを挿入する */
function injectInquiryLink(navList: HTMLUListElement): void {
    if (document.getElementById(INQUIRY_ID)) return;

    const li = document.createElement("li");
    li.setAttribute("role", "none");
    li.className = "nav-item";

    const link = document.createElement("a");
    link.id = INQUIRY_ID;
    link.className = "nav-link";
    link.setAttribute("role", "menuitem");
    // 拡張機能内のHTMLページを開く
    link.href = browser.runtime.getURL("inquiry/inquiry.html");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.innerHTML = `<span>📬 お問い合わせ</span>`;
    link.style.cssText = "white-space:nowrap;display:flex;align-items:center;gap:4px;";

    li.appendChild(link);
    navList.appendChild(li);
}

(async () => {
    await initConfig();
    const isDark = getConfig(ConfigKey.DarkModeEnabled);
    applyDarkMode(isDark);

    function tryInject(): boolean {
        const navList = findNavList();
        if (!navList) return false;
        injectToggle(navList, isDark);
        injectInquiryLink(navList);
        return true;
    }

    if (!tryInject()) {
        const observer = new MutationObserver(() => {
            if (tryInject()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 3000);
    }
})();
