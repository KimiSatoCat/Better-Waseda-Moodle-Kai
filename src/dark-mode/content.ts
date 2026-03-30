import { ConfigKey, getConfig, initConfig, setConfig } from "@/common/config/config";
import "./dark-mode.css";

/**
 * ダークモード切り替え機能
 *
 * Moodle 4.x のナビゲーションバー（HOME ダッシュボード マイコース Calendar の並び）に
 * 「ライト/ダーク」トグルを追加し，ページ全体のテーマを切り替える。
 *
 * ─────────────────────────────────────────────
 * 仕組み
 * ─────────────────────────────────────────────
 * 1. ダークモードが有効なとき，document.documentElement に .bwm-dark-mode クラスを付与する。
 *    dark-mode.css がこのクラスをトリガーとして全スタイルを上書きする。
 *
 * 2. ナビゲーションバーのセレクタは Moodle 4.x の複数パターンに対応する：
 *    - nav.moremenu [role="menubar"]   : Moodle 4.0〜4.4 Boost 標準
 *    - .secondary-navigation ul        : テーマによる代替
 *    - .primary-navigation ul          : プライマリナビ配置の場合
 *
 * 3. MutationObserver でナビが動的生成された場合にも対応する（最大3秒待機）。
 *
 * 4. 設定は chrome.storage.sync（ConfigKey.DarkModeEnabled）に保存され，
 *    ページをまたいで永続化される。
 */

const DARK_CLASS = "bwm-dark-mode";
const TOGGLE_ID = "bwm-darkmode-toggle";

/** ダークモードの適用/解除 */
function applyDarkMode(enabled: boolean): void {
    if (enabled) {
        document.documentElement.classList.add(DARK_CLASS);
    } else {
        document.documentElement.classList.remove(DARK_CLASS);
    }
}

/**
 * ナビゲーションバーの <ul> 要素を探す。
 * Moodle 4.x の複数テーマ実装に対応するため，候補セレクタを順番に試す。
 */
function findNavList(): HTMLUListElement | null {
    const candidates = [
        // Moodle 4.0〜4.4 Boost: moremenu の menubar
        "nav.moremenu [role='menubar']",
        // セカンダリナビゲーション
        ".secondary-navigation ul.nav",
        ".secondary-navigation ul",
        // プライマリナビゲーション
        ".primary-navigation ul.nav",
        ".primary-navigation ul",
        // 汎用フォールバック：HOME/ダッシュボードのリンクを含む ul
        "ul.nav",
    ];

    for (const sel of candidates) {
        const el = document.querySelector<HTMLUListElement>(sel);
        if (el && el.querySelectorAll("li").length >= 2) return el;
    }
    return null;
}

/** ライト/ダークトグルを <li> としてナビに挿入する */
function injectToggle(navList: HTMLUListElement, isDark: boolean): void {
    // 二重挿入防止
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
    btn.setAttribute("title", isDark ? "ライトモードに切り替える" : "ダークモードに切り替える");

    updateToggleLabel(btn, isDark);

    btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const next = !getConfig(ConfigKey.DarkModeEnabled);
        await setConfig(ConfigKey.DarkModeEnabled, next);
        // 設定保存後にリロード（全コンテンツのスタイルを確実に切り替えるため）
        location.reload();
    });

    li.appendChild(btn);
    navList.appendChild(li);
}

/** トグルボタンのラベル（アイコン + テキスト）を更新する */
function updateToggleLabel(btn: HTMLElement, isDark: boolean): void {
    // ダークモード中は「☀️ ライト」，ライトモード中は「🌙 ダーク」を表示
    btn.innerHTML = `
        <span class="bwm-toggle-icon">${isDark ? "☀️" : "🌙"}</span>
        <span class="bwm-toggle-text">${isDark ? "ライト" : "ダーク"}</span>
    `;
}

(async () => {
    await initConfig();

    const isDark = getConfig(ConfigKey.DarkModeEnabled);

    // ページ読み込み直後に即座に適用（FOUC最小化）
    applyDarkMode(isDark);

    /** ナビゲーションを探してトグルを挿入する */
    function tryInject(): boolean {
        const navList = findNavList();
        if (!navList) return false;
        injectToggle(navList, isDark);
        return true;
    }

    // 初回試行
    if (!tryInject()) {
        // ナビが動的生成される場合に備え MutationObserver で待機（最大3秒）
        const observer = new MutationObserver(() => {
            if (tryInject()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 3000);
    }
})();
