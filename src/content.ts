import { assertExtensionContext } from "./common/util/context";
import { call } from "./common/util/messenger/client";

assertExtensionContext(["content_script", "extension_page"]);

// Q. なぜ個別にコンテンツスクリプトを登録するのではなく、ここからそれぞれの機能を呼び出しているのか？
// A. エントリポイントが増えると、それぞれにReactなどのライブラリがバンドルされてクソデカ拡張機能になってしまうため
// Q. Webpackのcode splittingを使えばいいじゃん
// A. コンテンツスクリプト上ではWebpackのchunkをロードする機能が動かなくて……
(async () => {
    /**
     * Moodle 4.xではsesskey取得方法が複数あるため，順番にフォールバックする。
     *
     * 方法1: インラインscriptタグ内のM.cfg.sesskey
     *   Moodleはすべての認証済みページで<script>内にM.cfg = {..., "sesskey": "XXXX", ...}を出力する。
     *   コンテンツスクリプトはwindow.M に直接アクセスできないが，scriptタグのtextContentは読める。
     *
     * 方法2: ログアウトリンクのhref属性
     *   Moodle 4.x Boostテーマではユーザーメニュー内に <a href=".../logout.php?sesskey=..."> が依然存在する。
     *   ただしMoodle 4.4でPOSTフォームに変更された場合を考慮し，方法1を優先する。
     *
     * 方法3: フォーム内のhidden input
     *   各種アクションフォームには <input name="sesskey" type="hidden" value="..."> が含まれる。
     */
    const sessionKeyFromScript = Array.from(document.querySelectorAll<HTMLScriptElement>("script:not([src])"))
        .map((s) => s.textContent?.match(/"sesskey"\s*:\s*"([^"]+)"/)?.[1])
        .find(Boolean);

    const sessionKeyFromLogout = document
        .querySelector('a[href*="login/logout.php?sesskey="]')
        ?.getAttribute("href")
        ?.match(/sesskey=([^&"]+)/)?.[1];

    const sessionKeyFromForm = (
        document.querySelector<HTMLInputElement>('input[name="sesskey"][type="hidden"]')
    )?.value;

    const sessionKey = sessionKeyFromScript ?? sessionKeyFromLogout ?? sessionKeyFromForm;

    if (sessionKey) {
        // セッションキーが要る機能もあると思うのでawaitする
        await call("setSessionKeyCache", sessionKey);
    }

    switch (location.host) {
        case "wsdmoodle.waseda.jp":
            // ダークモードは wsdmoodle.waseda.jp の全ページで有効にする
            import("./dark-mode/content");
            // お問い合わせボタンも全ページで有効にする
            import("./contact/content");

            switch (location.pathname) {
                case "/my/":
                case "/my/index.php":
                    import("./dashboard/dashboard");
                    break;
                case "/mod/quiz/attempt.php":
                    import("./quiz/remind-unanswered-questions/content");
                    import("./check-session/content");
                    break;
                case "/mod/assign/view.php":
                case "/mod/forum/view.php":
                    import("./check-session/content");
                    break;
                default:
                    if (location.pathname.startsWith("/mod/forum/")) {
                        import("./check-session/content");
                    }
                    break;
            }
            break;
        case "www.wsl.waseda.jp":
            switch (location.pathname) {
                case "/syllabus/JAA104.php":
                    import("./add-syllabus-to-timetable/content");
                    break;
            }
            break;
        default:
            if (
                (process.env.VENDOR === "firefox" && location.protocol === "moz-extension:") ||
                (process.env.VENDOR === "chrome" && location.protocol === "chrome-extension:")
            ) {
                switch (location.pathname) {
                    case "/popup/popup.html":
                        import("./popup/popup");
                        break;
                    case "/options-page/options-page.html":
                        import("./options-page/options-page");
                        break;
                    case "/config-editor/config-editor.html":
                        import("./config-editor/config-editor");
                        break;
                    case "/moodle-api-client/moodle-api-client.html":
                        import("./moodle-api-client/moodle-api-client");
                        break;
                    case "/error-log/error-log.html":
                        import("./error-log/error-log");
                        break;
                }
            }
            break;
    }
})();
