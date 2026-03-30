import { ConfigKey, getConfig, initConfig, setConfig } from "../config/config";

/**
 * Microsoft Entra ID（旧Azure AD）ログインページへのチェックボックス挿入モジュール。
 *
 * 自動ログインが無効のとき，Microsoftのパスワード入力画面に
 * 「自動ログインを有効にする」チェックボックスを挿入し，
 * ユーザーがチェックした上でサインインすると自動ログイン設定を保存する。
 *
 * ────────────────────────────────────────────────────
 * 旧実装の問題点と対策
 * ────────────────────────────────────────────────────
 *
 * 問題1: history.state === 1 でパスワード画面を判定していた
 *   → Microsoft が pushState の値を変更すると即死する。
 *   対策: history.state の値ではなく，パスワード入力欄 input[name=passwd] の
 *         DOM出現を直接 MutationObserver で監視する。
 *
 * 問題2: mutation.target.classList.contains("boilerplate-button-bottom") で
 *         ボタンエリアを検出していた
 *   → Microsoft は定期的にクラス名を変更する（boilerplate-button-content等）。
 *   対策: サインインボタン自体（id="idSIButton9" または type="submit"）と
 *         パスワード入力欄の存在を判定基準にする。
 *
 * 問題3: input[name=login] でユーザーIDを取得していた
 *   → 現行の Entra ID では name=loginfmt。さらに2画面構成では
 *     パスワード画面に email フィールドが表示されない場合もある。
 *   対策: name=loginfmt → name=login → type=email の順でフォールバック。
 *
 * 問題4: MutationObserver が attributes のみを監視していた
 *   → パスワード画面は childList（要素の追加）で出現する場合が多い。
 *   対策: childList: true, subtree: true, attributes: true を全て有効化。
 */

const CHECKBOX_ID = "bwm-auto-login-checkbox";

(async () => {
    await initConfig();

    // 自動ログインが有効の場合はチェックボックスを挿入しない
    if (getConfig(ConfigKey.AutoLoginEnabled)) return;

    /** パスワード入力画面かどうかを判定する */
    function isPasswordScreen(): boolean {
        return !!document.querySelector('input[name="passwd"]');
    }

    /**
     * サインインボタンを取得する。
     * Entra ID は id="idSIButton9" が安定しているが，フォールバックも用意する。
     */
    function findSignInButton(): HTMLElement | null {
        return (
            document.getElementById("idSIButton9") ??
            document.querySelector<HTMLElement>('input[type="submit"]') ??
            document.querySelector<HTMLElement>('button[type="submit"]') ??
            null
        );
    }

    /**
     * ユーザーID（メールアドレス）を入力フィールドから取得する。
     * Entra IDのパスワード画面ではemail欄が非表示の場合があるため，
     * 表示・非表示を問わず全候補フィールドを試みる。
     */
    function extractUserId(): string | null {
        const selectors = [
            'input[name="loginfmt"]',  // Entra ID 現行
            'input[name="login"]',     // 旧 Azure AD
            'input[type="email"]',     // 汎用フォールバック
        ];
        for (const sel of selectors) {
            const el = document.querySelector<HTMLInputElement>(sel);
            if (el?.value) return el.value;
        }
        return null;
    }

    /**
     * チェックボックス挿入対象を探す。
     * サインインボタンの親要素，またはパスワード入力欄の親要素を対象にする。
     */
    function findInsertionTarget(): HTMLElement | null {
        return (
            findSignInButton()?.parentElement as HTMLElement | null ??
            (document.querySelector<HTMLInputElement>('input[name="passwd"]'))?.parentElement as HTMLElement | null ??
            null
        );
    }

    let checkboxInserted = false;

    /** パスワード画面が出現したときにチェックボックスを挿入する */
    function tryInsertCheckbox(): void {
        if (checkboxInserted) return;
        if (!isPasswordScreen()) return;
        if (document.getElementById(CHECKBOX_ID)) { checkboxInserted = true; return; }

        const target = findInsertionTarget();
        if (!target) return;

        insertCheckbox(target);
        checkboxInserted = true;

        const btn = findSignInButton();
        if (btn) btn.addEventListener("click", onClickSignInButton, { once: true });
    }

    // 初回チェック
    tryInsertCheckbox();

    // DOM変化を監視
    const observer = new MutationObserver(() => tryInsertCheckbox());
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
    });

    /** サインインボタンがクリックされたときにログイン情報を保存する */
    function onClickSignInButton(): void {
        const checkbox = document.getElementById(CHECKBOX_ID) as HTMLInputElement | null;
        if (!checkbox?.checked) return;

        const userId = extractUserId();
        const password = document.querySelector<HTMLInputElement>('input[name="passwd"]')?.value;
        if (!userId || !password) return;

        setConfig(ConfigKey.AutoLoginEnabled, true);
        setConfig(ConfigKey.LoginInfo, { userId, password });
    }
})();

/**
 * 自動ログインを有効にするチェックボックスを挿入する。
 * @param target - 挿入先の親要素
 */
function insertCheckbox(target: HTMLElement): void {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = CHECKBOX_ID;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = browser.i18n.getMessage("auto_login_checkbox");
    label.style.lineHeight = "1";
    label.style.whiteSpace = "nowrap";
    label.style.fontFamily = "sans-serif";
    label.style.fontSize = "0.85em";
    label.style.marginLeft = "0.5em";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.marginBottom = "0.5em";
    container.appendChild(checkbox);
    container.appendChild(label);

    target.insertAdjacentElement("afterbegin", container);
}
