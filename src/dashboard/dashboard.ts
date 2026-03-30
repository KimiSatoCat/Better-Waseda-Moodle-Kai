import { initConfig } from "@/common/config/config";
import { initCourseOverview } from "./course-overview/course-overview";
import { initTimeline } from "./timeline/timeline";

(async () => {
    await initConfig();

    initCourseOverview();
    initTimeline();

    /**
     * ブロック内の card-body の左右 padding を除去する。
     *
     * Moodle 4.x では block-region の id / data-region が変更された場合に備え，
     * 複数のセレクタをまとめて試みる。
     *
     * 対応する構造：
     *   - #block-region-content .card-body     (Boost / Moodle 4.3以前)
     *   - [data-region="blocks-default-region"] .card-body  (一部カスタムテーマ)
     *   - .block-region .card-body             (汎用フォールバック)
     */
    const CARD_BODY_SELECTORS = [
        "#block-region-content .card-body",
        "[data-region='blocks-default-region'] .card-body",
        ".block-region .card-body",
    ];
    const seen = new Set<Element>();
    for (const selector of CARD_BODY_SELECTORS) {
        for (const elem of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
            if (!seen.has(elem)) {
                seen.add(elem);
                elem.style.cssText = "padding-left: 0 !important; padding-right: 0 !important;";
            }
        }
    }
})();
