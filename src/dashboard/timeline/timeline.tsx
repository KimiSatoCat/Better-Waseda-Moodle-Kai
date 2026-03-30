import { ConfigKey, getConfig } from "@/common/config/config";
import { NotificationContextProvider } from "@/common/react/notification";
import { BWMRoot } from "@/common/react/root";
import React from "react";
import { createRoot } from "react-dom/client";
import { Timeline } from "./components/Timeline";

/**
 * ダッシュボードに表示するタイムラインの機能を初期化する。
 *
 * タイムラインを挿入するブロック領域を複数のセレクタで検出する。
 *
 * Moodle 4.x の Boost テーマにおける block-region の構造：
 *   - id="block-region-content"         : Boost標準，Moodle 4.3で引き続き確認済み
 *   - data-region="blocks-default-region" : 一部のテーマ実装で使われる代替属性
 *   - .region-content                    : 汎用フォールバック
 *
 * DOM DOMが確定していない場合（JavaScriptによる動的生成）に備え，
 * MutationObserverで最大2秒待機するフォールバックを追加する。
 */
export function initTimeline(): void {
    if (!getConfig(ConfigKey.TimelineShowInDashboard)) return;

    /**
     * ブロック領域要素を検索する。
     * 複数セレクタを試し，最初に見つかった要素を返す。
     */
    function findBlockRegion(): HTMLElement | null {
        return (
            document.getElementById("block-region-content") ??
            document.querySelector<HTMLElement>("[data-region='blocks-default-region']") ??
            document.querySelector<HTMLElement>(".region-content") ??
            null
        );
    }

    function mountTimeline(parent: HTMLElement): void {
        // 二重マウント防止
        if (document.getElementById("bwm-timeline-root")) return;

        const elem = document.createElement("div");
        elem.id = "bwm-timeline-root";
        parent.appendChild(elem);

        createRoot(elem).render(
            <>
                <style>
                    {`
                    #bwm-timeline-root img {
                        vertical-align: unset;
                    }
                    `}
                </style>

                <h5 className="card-title">{browser.i18n.getMessage("timeline_title")}</h5>
                <BWMRoot>
                    <NotificationContextProvider>
                        <Timeline />
                    </NotificationContextProvider>
                </BWMRoot>
            </>
        );
    }

    const parent = findBlockRegion();
    if (parent) {
        mountTimeline(parent);
        return;
    }

    // ブロック領域がまだDOMに存在しない場合，最大2秒間 MutationObserver で待機する
    const observer = new MutationObserver(() => {
        const found = findBlockRegion();
        if (found) {
            observer.disconnect();
            mountTimeline(found);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 2000);
}
