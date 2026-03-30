/**
 * Better Waseda Moodle 改 - お問い合わせボタン注入
 *
 * Moodleナビゲーションバーの「ライト/ダーク」ボタンの隣に
 * 「お問い合わせ」ボタンを追加し，クリックでモーダルを開く。
 */

import { initConfig } from "@/common/config/config";
import React from "react";
import { createRoot } from "react-dom/client";
import { BWMRoot } from "@/common/react/root";
import { ContactModal } from "./ContactModal";

const CONTACT_BTN_ID = "bwm-contact-btn";
const MODAL_ROOT_ID = "bwm-contact-modal-root";

/**
 * ナビゲーションバーのUL要素を探す（dark-mode/content.tsと同じロジック）
 */
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

let modalOpen = false;
let modalRoot: ReturnType<typeof createRoot> | null = null;

function renderModal(open: boolean) {
    const rootEl = document.getElementById(MODAL_ROOT_ID);
    if (!rootEl || !modalRoot) return;
    modalRoot.render(
        React.createElement(BWMRoot, null,
            React.createElement(ContactModal, {
                open,
                onClose: () => {
                    modalOpen = false;
                    renderModal(false);
                },
            })
        )
    );
}

function injectContactButton(navList: HTMLUListElement): void {
    if (document.getElementById(CONTACT_BTN_ID)) return;

    // モーダルのマウントポイントを作成
    if (!document.getElementById(MODAL_ROOT_ID)) {
        const mountPoint = document.createElement("div");
        mountPoint.id = MODAL_ROOT_ID;
        document.body.appendChild(mountPoint);
        modalRoot = createRoot(mountPoint);
    }

    const li = document.createElement("li");
    li.setAttribute("role", "none");
    li.className = "nav-item";

    const btn = document.createElement("a");
    btn.id = CONTACT_BTN_ID;
    btn.className = "nav-link";
    btn.setAttribute("role", "menuitem");
    btn.setAttribute("href", "#");
    btn.setAttribute("title", "お問い合わせ・ご要望");
    btn.style.cssText = "cursor:pointer;display:flex;align-items:center;gap:4px;padding:0 12px;white-space:nowrap;font-size:0.875rem;text-decoration:none;user-select:none;";
    btn.innerHTML = `<span style="font-size:1rem">📬</span><span>お問い合わせ</span>`;

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        modalOpen = !modalOpen;
        renderModal(modalOpen);
    });

    li.appendChild(btn);
    navList.appendChild(li);
}

(async () => {
    await initConfig();

    function tryInject(): boolean {
        const nav = findNavList();
        if (!nav) return false;
        injectContactButton(nav);
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
