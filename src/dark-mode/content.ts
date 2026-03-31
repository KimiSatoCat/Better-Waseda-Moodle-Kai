import { ConfigKey, getConfig, initConfig, setConfig } from "@/common/config/config";
import "./dark-mode.css";

const DARK_CLASS = "bwm-dark-mode";
const TOGGLE_ID = "bwm-darkmode-toggle";
const INQUIRY_ID = "bwm-inquiry-link";
const INQUIRY_URL = "https://better-waseda-moodlekai.vercel.app/inquiry.html";

function applyDarkMode(enabled: boolean): void {
    if (enabled) document.documentElement.classList.add(DARK_CLASS);
    else document.documentElement.classList.remove(DARK_CLASS);
}

/**
 * ドキュメント全体から「お問い合わせ」テキストを含むナビアイテムを探して非表示にする。
 * 我々が注入した INQUIRY_ID の要素は除外。
 * Moodleが動的にアイテムを追加した後でも動作するよう、呼び出し側でMutationObserverと組み合わせる。
 */
function suppressNativeInquiryLinks(): void {
    // 全ナビアイテムを対象にする（セレクタを広く取る）
    const selectors = [
        "nav li",
        ".navigation li",
        ".nav-item",
        "[role='menuitem']",
        "[role='none']",
    ];
    const seen = new Set<Element>();
    for (const sel of selectors) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            if (seen.has(el)) return;
            seen.add(el);
            const a = el.tagName === "A" ? el as HTMLAnchorElement : el.querySelector<HTMLAnchorElement>("a");
            if (!a) return;
            // 我々のリンクは除外
            if (a.id === INQUIRY_ID || a.id === TOGGLE_ID) return;
            // テキストに「お問い合わせ」を含む場合は非表示
            const text = (a.textContent ?? "").replace(/\s/g, "");
            if (text.includes("お問い合わせ")) {
                // li要素（親）ごと非表示にする
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

function makeNavItem(id: string, html: string): HTMLLIElement {
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

function inject(navList: HTMLUListElement, isDark: boolean): void {
    navList.dataset.bwm = "1";

    // ── ライト/ダーク トグル ──
    const toggleLi = makeNavItem(TOGGLE_ID, `<span>${isDark ? "☀️ ライト" : "🌙 ダーク"}</span>`);
    toggleLi.querySelector("a")!.addEventListener("click", async (e) => {
        e.preventDefault();
        const next = !getConfig(ConfigKey.DarkModeEnabled);
        await setConfig(ConfigKey.DarkModeEnabled, next);
        location.reload();
    });
    navList.appendChild(toggleLi);

    // ── お問い合わせ ──
    const inquiryLi = makeNavItem(INQUIRY_ID, `<span>📬 お問い合わせ</span>`);
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

    let injected = false;

    function tryInject(): boolean {
        if (!injected) {
            if (document.getElementById(TOGGLE_ID) && document.getElementById(INQUIRY_ID)) {
                injected = true;
            } else {
                const navList = findNavList();
                if (!navList) return false;
                inject(navList, isDark);
                injected = true;
            }
        }
        // 注入済み・未注入問わず、毎回Moodleのネイティブリンクを非表示にする
        suppressNativeInquiryLinks();
        return true;
    }

    // 初回試行
    tryInject();

    // DOM変化を監視：Moodleがナビを動的更新するたびに非表示処理を再実行
    const observer = new MutationObserver(() => {
        if (!injected) {
            tryInject();
        } else {
            suppressNativeInquiryLinks();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 念のため3秒後にも再実行（Moodleの遅延描画対応）
    setTimeout(() => {
        if (!injected) tryInject();
        suppressNativeInquiryLinks();
    }, 3000);
})();
