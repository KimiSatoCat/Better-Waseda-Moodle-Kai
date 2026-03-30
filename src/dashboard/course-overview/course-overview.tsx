import { ConfigKey, getConfig } from "@/common/config/config";
import { NotificationContextProvider } from "@/common/react/notification";
import React from "react";
import { createRoot } from "react-dom/client";
import { BWMRoot } from "../../common/react/root";
import { assertExtensionContext } from "../../common/util/context";
import { CourseOverview } from "./components/CourseOverview";

assertExtensionContext("content_script");

/**
 * Moodle 4.xのダッシュボードで「星付きコース」ブロックを検出する。
 *
 * Moodleはバージョンアップのたびにblockの内部HTML構造（CSSクラス名など）を変更するが，
 * 以下の属性・クラスはMoodleのブロックレンダリング仕様として安定している：
 *
 *   1. [data-block="starredcourses"]
 *      MoodleがすべてのBlockコンテナに付与する標準属性。4.xで不変。
 *      参照: https://moodledev.io/docs/4.4/apis/plugintypes/blocks
 *
 *   2. .block_starredcourses
 *      ブロックコンテナのクラス名。"block_" + ブロック名（アンダースコア区切り）は
 *      Moodleのブロックレンダリング規約として変更されない。
 *
 *   3. .block-starredcourses（旧，ハイフン区切り）
 *      v0.9.5時点（Moodle 4.3対応）で使われていたブロック内部コンテンツのクラス名。
 *      Moodle 4.4でテンプレートが変更された場合に備え最後のフォールバックとして残す。
 *
 * @returns ブロックコンテナ要素（非表示にしてBWMのUIと置き換える対象），または null
 */
function findStarredCoursesBlock(): HTMLElement | null {
    // 方法1: data-block属性（最も安定，Moodle全バージョン共通）
    const byDataBlock = document.querySelector<HTMLElement>('[data-block="starredcourses"]');
    if (byDataBlock) return byDataBlock;

    // 方法2: .block_starredcourses クラス（アンダースコア，Moodleレンダリング規約）
    const byClass = document.querySelector<HTMLElement>(".block_starredcourses");
    if (byClass) return byClass;

    // 方法3: .block-starredcourses の親（v0.9.5互換，Moodle 4.3のblock template由来）
    const byInnerClass = document.getElementsByClassName("block-starredcourses")[0]?.parentElement as HTMLElement | undefined;
    if (byInnerClass) return byInnerClass;

    return null;
}

/**
 * コース概要の機能を初期化する。
 */
export function initCourseOverview(): void {
    if (getConfig(ConfigKey.CourseOverviewEnabled)) {
        const blockElem = findStarredCoursesBlock();
        if (!blockElem) return;

        // ブロック全体を非表示にしてBWM独自UIに置き換える
        blockElem.style.display = "none";

        // ブロックタイトルを更新（非表示前の要素を対象に検索）
        // Moodle 4.x: h2/h3/h4 いずれもあり得るため，セレクタを拡張する
        const titleElem =
            blockElem.querySelector("h2, h3, h4") ??
            document.querySelector(".block_starredcourses h2, .block_starredcourses h3, .block_starredcourses h4");
        if (titleElem) {
            titleElem.textContent = browser.i18n.getMessage("options_page_section_course_overview_title");
        }

        const root = document.createElement("div");
        root.id = "bwm-timetable-root";
        // ブロックの直後に挿入
        blockElem.insertAdjacentElement("afterend", root);

        createRoot(root).render(
            <BWMRoot>
                <NotificationContextProvider>
                    <CourseOverview />
                </NotificationContextProvider>
            </BWMRoot>
        );
    }
}
