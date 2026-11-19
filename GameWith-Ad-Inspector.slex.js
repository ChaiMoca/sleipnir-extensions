// ==UserScript==
// @name        GameWith Game8 Filter 2.5
// @namespace   custom.sleipnir
// @author      Custom
// @description GameWith・Game8広告削除と広告跡地整理
// @include     http://*
// @include     https://*
// @version     2.5
// ==/UserScript==

(function () {
    'use strict';

    var STYLE_ID = 'sleipnir-game-filter-25';

    if (window.__sleipnirGameFilter25) return;
    window.__sleipnirGameFilter25 = true;

    var host = location.hostname.toLowerCase();
    var isGame8 = /(^|\.)game8\.jp$/.test(host);
    var isGameWith = /(^|\.)gamewith\.jp$/.test(host);

    var rules = [
        /* 共通広告 */
        'ins.adsbygoogle',
        '[id^="google_ads"]',
        '[id*="div-gpt-ad"]',
        '[class*="adsbygoogle"]',
        'iframe[src*="doubleclick.net"]',
        'iframe[src*="googlesyndication"]',
        'iframe[src*="adservice.google"]',

        /* 広告専用要素 */
        '[class~="advertisement"]',
        '[class~="ad-banner"]',
        '[class~="ad_banner"]',
        '[class~="sticky-ad"]',
        '[class~="floating-ad"]',
        '[class~="overlay-ad"]',
        '[class~="interstitial-ad"]',
        '[class~="fullscreen-ad"]'
    ];

    if (isGameWith) {
        rules = rules.concat([
            '[id*="ad_container"]',
            '[class~="floating-banner"]',

            /* GameWith 下部固定PR広告 */
            '.gtm-ga4-gdb-imp-event',
            'a.gdb-ad-footer-creative'
        ]);
    }

    if (isGame8) {
        rules = rules.concat([
            '[id*="ad-container"]',
            '[id*="ad_container"]',
            '[class~="ad-sticky"]',
            '[class~="ad-floating"]',
            '[class~="ad-bottom"]',
            '[class~="bottom-ad"]',
            '[class~="fixed-ad"]',
            '[class~="footer-ad"]'
        ]);
    }

    var css = rules.join(',') +
        '{display:none !important;}';

    /* Game8 広告スペース対策 */
    if (isGame8) {
        css += `
            [class~="ad-slot"],
            [class~="ad-space"],
            [class~="ad-placeholder"],
            [id~="ad-slot"],
            [id~="ad-space"],
            [id~="ad-placeholder"] {
                display:none !important;
            }
        `;

        /* Game8 下部固定OGY広告 */
        css += `
            #ogy-ad-slot {
                display:none !important;
            }
        `;
    }

    function installStyle() {
        if (!document.documentElement) return;

        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));

        (document.head || document.documentElement)
            .appendChild(style);
    }

    /* 広告専用の親コンテナを探す */
    function isAdContainer(el) {
        if (!el || el.nodeType !== 1) return false;

        var name = '';

        if (typeof el.className === 'string') {
            name += ' ' + el.className;
        }

        name += ' ' + (el.id || '');

        return /(^|[\s_-])(ad|ads|advert|advertisement|adslot|ad-space)([\s_-]|$)/i
            .test(name);
    }

    /* Game8 広告跡地の整理 */
    function cleanAdSpace() {
        if (!isGame8) return;

        var ads = document.querySelectorAll(
            'ins.adsbygoogle,' +
            '[id^="google_ads"],' +
            '[id*="div-gpt-ad"],' +
            'iframe[src*="doubleclick.net"],' +
            'iframe[src*="googlesyndication"]'
        );

        for (var i = 0; i < ads.length; i++) {
            var parent = ads[i].parentElement;

            /* 最大3階層まで親を調べる */
            for (var j = 0; j < 3 && parent; j++) {
                if (isAdContainer(parent)) {
                    parent.style.setProperty(
                        'display',
                        'none',
                        'important'
                    );
                    break;
                }

                parent = parent.parentElement;
            }
        }
    }

    function apply() {
        installStyle();
        cleanAdSpace();
    }

    function start() {
        apply();

        if (!document.documentElement) return;

        var observer = new MutationObserver(function () {
            apply();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded', start, false
        );
    } else {
        start();
    }

})();
