// ==UserScript==
// @name        Simple AD Blocker
// @namespace   custom.sleipnir
// @version     1.4.4
// @description SAB domain check and safe CSS rule injection
// @include     *://*/*
// @require api
// ==/UserScript==

(function () {
    'use strict';

    var shieldId = 'sab-test-button';
    var panelId = 'sab-status-panel';
    var styleId = 'sab-applied-css-style';
    var filtersLoaded = false;
    var maxCssRules = 1500;

    function isTargetDomain() {
        var host = (location && location.hostname) ? location.hostname.toLowerCase() : '';
        if (!host) return false;
        return (
            host === 'gamewith.jp' ||
            host.indexOf('.gamewith.jp') !== -1 ||
            host === 'game8.jp' ||
            host.indexOf('.game8.jp') !== -1
        );
    }

    function isSafeCssSelector(selector) {
        if (!selector || typeof selector !== 'string') return false;
        if (selector.length > 120) return false;
        // 複雑なABP拡張擬似クラスや制御文字・URLスキーム風文字を除外
        if (
            selector.indexOf(':-abp-') !== -1 ||
            selector.indexOf(':has(') !== -1 ||
            selector.indexOf(':contains(') !== -1 ||
            selector.indexOf(':matches-css(') !== -1 ||
            selector.indexOf(';') !== -1 ||
            selector.indexOf('{') !== -1 ||
            selector.indexOf('}') !== -1 ||
            selector.indexOf('expression(') !== -1
        ) {
            return false;
        }
        return true;
    }

    function applyCssRules(selectors) {
        if (!isTargetDomain()) {
            return 0;
        }

        var parent = document.head || document.documentElement || document.body;
        if (!parent) {
            return 0;
        }

        var existing = document.getElementById(styleId);
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }

        var styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.type = 'text/css';

        var appliedCount = 0;
        var cssChunks = [];
        var i;
        var sel;

        for (i = 0; i < selectors.length && appliedCount < maxCssRules; i++) {
            sel = selectors[i];
            if (!isSafeCssSelector(sel)) {
                continue;
            }
            cssChunks.push(sel + '{display:none !important;visibility:hidden !important;}');
            appliedCount++;
        }

        if (cssChunks.length === 0) {
            return 0;
        }

        styleEl.textContent = cssChunks.join('\n');
        parent.appendChild(styleEl);

        // ブラウザ側でセレクタ構文が拒否されていないか検証
        try {
            if (styleEl.sheet && styleEl.sheet.cssRules && styleEl.sheet.cssRules.length === 0) {
                if (styleEl.parentNode) {
                    styleEl.parentNode.removeChild(styleEl);
                }
                return 0;
            }
        } catch (e) {
            // クロスオリジンや制限環境でsheet参照に失敗しても要素注入自体は維持
        }

        return appliedCount;
    }

    function createPanel() {
        if (document.getElementById(panelId)) {
            return;
        }

        if (!document.body) return;

        var panel = document.createElement('div');

        panel.id = panelId;

        panel.style.cssText = [
            'position:fixed',
            'right:20px',
            'bottom:95px',
            'z-index:2147483647',
            'width:240px',
            'padding:15px',
            'background:#202124',
            'color:white',
            'border:1px solid #555',
            'border-radius:12px',
            'box-shadow:0 3px 12px rgba(0,0,0,0.5)',
            'font-size:14px',
            'line-height:1.7',
            'font-family:sans-serif',
            'display:none',
            'pointer-events:auto',
            'box-sizing:border-box'
        ].join(';');

        panel.innerHTML =
            '<div style="font-size:16px;font-weight:bold;margin-bottom:10px;">🛡 Simple AD Blocker</div>' +
            '<div>状態：<span style="color:#4caf50;">UI動作中</span></div>' +
            '<div>EasyList：<span id="sab-easylist-status">未取得</span></div>' +
            '<div>EasyPrivacy：<span id="sab-privacy-status">未取得</span></div>' +
            '<div>ルール解析：<span id="sab-rule-stats">未解析</span></div>' +
            '<div>適用CSS：<span id="sab-applied-css">0</span></div>' +
            '<div>通信遮断数：0</div>' +
            '<div>広告要素除去数：0</div>' +
            '<div style="margin-top:12px;text-align:right;"><span id="sab-close-button" style="display:inline-block;padding:5px 14px;background:#444;border-radius:6px;cursor:pointer;">閉じる</span></div>';

        document.body.appendChild(panel);

        var closeButton = document.getElementById('sab-close-button');

        if (closeButton) {
            closeButton.addEventListener('click', function () {
                panel.style.display = 'none';
            });
        }
    }

    function parseEasyListRules(text) {
        var cssCount = 0;
        var exceptionCount = 0;
        var selectors = [];

        if (typeof text !== 'string' || text.length === 0) {
            return {
                cssCount: 0,
                exceptionCount: 0,
                selectors: selectors
            };
        }

        var start = 0;
        var lineEnd;
        var line;
        var markerIndex;
        var prefix;
        var selector;

        while (start <= text.length) {
            lineEnd = text.indexOf('\n', start);
            if (lineEnd === -1) {
                line = text.slice(start);
                start = text.length + 1;
            } else {
                line = text.slice(start, lineEnd);
                start = lineEnd + 1;
            }

            if (line.charAt(line.length - 1) === '\r') {
                line = line.slice(0, -1);
            }

            line = line.replace(/^\s+|\s+$/g, '');

            if (!line || line.charAt(0) === '!') {
                continue;
            }

            if (line.indexOf('#@#') !== -1) {
                exceptionCount++;
            } else if (line.indexOf('##') !== -1) {
                cssCount++;
                markerIndex = line.indexOf('##');
                prefix = line.slice(0, markerIndex);
                selector = line.slice(markerIndex + 2).replace(/^\s+|\s+$/g, '');

                // まずはドメイン指定なしの汎用隠蔽ルールを収集（上限まで）
                if (!prefix && selector && selectors.length < maxCssRules * 2) {
                    selectors.push(selector);
                }
            }
        }

        return {
            cssCount: cssCount,
            exceptionCount: exceptionCount,
            selectors: selectors
        };
    }

    function loadFilters() {
        if (filtersLoaded) return;

        filtersLoaded = true;

        var easyListStatus =
            document.getElementById('sab-easylist-status');

        var privacyStatus =
            document.getElementById('sab-privacy-status');

        var ruleStats =
            document.getElementById('sab-rule-stats');

        var appliedCssEl =
            document.getElementById('sab-applied-css');

        if (!easyListStatus || !privacyStatus) return;

        easyListStatus.textContent = '取得中...';
        privacyStatus.textContent = '取得中...';
        if (ruleStats) {
            ruleStats.textContent = '解析中...';
        }
        if (appliedCssEl) {
            appliedCssEl.textContent = '0';
        }

        try {
            var easyList = SLEX_httpGet(
                'https://easylist.to/easylist/easylist.txt'
            );

            if (typeof easyList === 'string' && easyList.length > 0) {
                easyListStatus.textContent =
                    '取得成功（' + easyList.length + '文字）';

                var parsed = parseEasyListRules(easyList);
                if (ruleStats) {
                    ruleStats.textContent =
                        'CSS ' + parsed.cssCount + ' / 例外 ' + parsed.exceptionCount;
                }

                var applied = applyCssRules(parsed.selectors);
                if (appliedCssEl) {
                    appliedCssEl.textContent = isTargetDomain()
                        ? (applied + '件適用')
                        : '対象外ドメイン';
                }
            } else {
                easyListStatus.textContent = '取得失敗';
                if (ruleStats) {
                    ruleStats.textContent = '対象なし';
                }
            }
        } catch (e) {
            easyListStatus.textContent = 'エラー';
            if (ruleStats) {
                ruleStats.textContent = 'エラー';
            }
        }

        try {
            var easyPrivacy = SLEX_httpGet(
                'https://easylist.to/easylist/easyprivacy.txt'
            );

            if (
                typeof easyPrivacy === 'string' &&
                easyPrivacy.length > 0
            ) {
                privacyStatus.textContent =
                    '取得成功（' + easyPrivacy.length + '文字）';
            } else {
                privacyStatus.textContent = '取得失敗';
            }
        } catch (e) {
            privacyStatus.textContent = 'エラー';
        }
    }

    function showShield() {
        if (!document.body) return;

        if (document.getElementById(shieldId)) {
            return;
        }

        var button = document.createElement('div');

        button.id = shieldId;
        button.textContent = '🛡';

        button.style.cssText = [
            'position:fixed',
            'right:20px',
            'bottom:30px',
            'z-index:2147483647',
            'width:55px',
            'height:55px',
            'border-radius:50%',
            'background:#1976d2',
            'color:white',
            'font-size:26px',
            'font-weight:bold',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'box-shadow:0 2px 8px #000',
            'pointer-events:auto',
            'cursor:pointer'
        ].join(';');

        button.addEventListener('click', function () {
            createPanel();

            var panel = document.getElementById(panelId);

            if (panel) {
                if (panel.style.display === 'none') {
                    panel.style.display = 'block';
                    loadFilters();
                } else {
                    panel.style.display = 'none';
                }
            }
        });

        document.body.appendChild(button);
    }

    function initialize() {
        showShield();
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initialize
        );
    } else {
        initialize();
    }

    setTimeout(initialize, 1000);
    setTimeout(initialize, 3000);

})();
