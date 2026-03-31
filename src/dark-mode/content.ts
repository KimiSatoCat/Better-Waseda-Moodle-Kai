import { ConfigKey, getConfig, initConfig, setConfig } from "@/common/config/config";
import "./dark-mode.css";

const DARK_CLASS = "bwm-dark-mode";
const TOGGLE_ID = "bwm-darkmode-toggle";
const INQUIRY_ID = "bwm-inquiry-link";
// フォームはVercelにホスト（Chrome拡張機能のCSP制限を回避）
const INQUIRY_URL = "https://better-waseda-moodlekai.vercel.app/inquiry.html";

function applyDarkMode(enabled: boolean): void {
    if (enabled) document.documentElement.classList.add(DARK_CLASS);
    else document.documentElement.classList.remove(DARK_CLASS);
}

/**
 * ナビゲーションの <ul> を探す。
 * 注入済みマーカー data-bwm="1" が付いていない最初の候補を返す。
 * これにより複数のナビ要素が存在しても二重注入を防ぐ。
 */
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
        // 既に注入済みの要素は飛ばす
        if (el && !el.dataset.bwm) return el;
    }
    return null;
}

function makeNavItem(id: string, html: string, onClick?: (e: Event) => void): HTMLLIElement {
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

    if (onClick) {
        a.addEventListener("click", onClick);
    }

    li.appendChild(a);
    return li;
}

function inject(navList: HTMLUListElement, isDark: boolean): void {
    // navListに注入済みマーカーを付ける
    navList.dataset.bwm = "1";

    // ── ライト/ダーク トグル ──
    const toggleItem = makeNavItem(
        TOGGLE_ID,
        `<span>${isDark ? "☀️ ライト" : "🌙 ダーク"}</span>`,
        async (e) => {
            e.preventDefault();
            const next = !getConfig(ConfigKey.DarkModeEnabled);
            await setConfig(ConfigKey.DarkModeEnabled, next);
            location.reload();
        }
    );
    navList.appendChild(toggleItem);

    // ── お問い合わせ ──
    const inquiryItem = makeNavItem(
        INQUIRY_ID,
        `<span>📬 お問い合わせ</span>`
    );
    const inquiryLink = inquiryItem.querySelector("a")!;
    inquiryLink.href = INQUIRY_URL;
    inquiryLink.removeAttribute("href"); // href="#" を削除してからtarget設定
    inquiryLink.setAttribute("href", INQUIRY_URL);
    inquiryLink.setAttribute("target", "_blank");
    inquiryLink.setAttribute("rel", "noopener noreferrer");
    // クリックイベントのデフォルト（#へのジャンプ）を無効化
    inquiryLink.removeEventListener("click", () => {});
    inquiryLink.onclick = null;

    navList.appendChild(inquiryItem);
}

(async () => {
    await initConfig();
    const isDark = getConfig(ConfigKey.DarkModeEnabled);
    applyDarkMode(isDark);

    function tryInject(): boolean {
        // 既に両方注入済みなら何もしない
        if (document.getElementById(TOGGLE_ID) && document.getElementById(INQUIRY_ID)) return true;

        const navList = findNavList();
        if (!navList) return false;

        inject(navList, isDark);
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
