// ==UserScript==
// @name        Simple AD Blocker
// @namespace   custom.sleipnir
// @version     1.4.11
// @description SAB safe dynamic element handler on v1.4.10 base
// @include     *://*/*
// @require api
// ==/UserScript==

(function () {
    'use strict';

    var shieldId = 'sab-test-button';
    var panelId = 'sab-status-panel';
    var styleId = 'sab-applied-css-style';
    var filtersLoaded = false;
    var maxCssSelectors = 1500;
    var hiddenCount = 0;
    var observerStarted = false;
    var scanTimer = null;

    function getCurrentHost() {
        try {
            if (typeof location !== 'undefined' && location && location.hostname) {
                return String(location.hostname).toLowerCase();
            }
        } catch (e) {
            return '';
        }
        return '';
    }

    function isTargetDomain() {
        var host = getCurrentHost();
        if (!host) return false;
        return (
            host === 'gamewith.jp' ||
            host.indexOf('.gamewith.jp') !== -1 ||
            host === 'game8.jp' ||
            host.indexOf('.game8.jp') !== -1
        );
    }

    function isDomainMatchedSimple(domainPart, host) {
        if (!domainPart || !host) return false;
        if (domainPart.indexOf('~') !== -1) return false;

        var parts = domainPart.split(',');
        var i;
        var d;

        for (i = 0; i < parts.length; i++) {
            d = parts[i].replace(/^\s+|\s+$/g, '').toLowerCase();
            if (!d) continue;
            if (host === d || host.indexOf('.' + d) !== -1) {
                return true;
            }
        }
        return false;
    }

    function isSafeSelector(sel) {
        if (!sel || typeof sel !== 'string') return false;
        if (sel.length === 0 || sel.length > 100) return false;
        if (
            sel.indexOf(':-abp-') !== -1 ||
            sel.indexOf(':has(') !== -1 ||
            sel.indexOf(':contains(') !== -1 ||
            sel.indexOf(':matches-css(') !== -1 ||
            sel.indexOf('{') !== -1 ||
            sel.indexOf('}') !== -1 ||
            sel.indexOf(';') !== -1 ||
            sel.indexOf('expression(') !== -1
        ) {
            return false;
        }
        return true;
    }

    function applyCssRules(selectors) {
        if (!isTargetDomain()) {
            return 0;
        }
        if (!selectors || !selectors.length) {
            return 0;
        }

        try {
            var parent = document.head || document.documentElement || document.body;
            if (!parent) {
                return 0;
            }

            var oldStyle = document.getElementById(styleId);
            if (oldStyle && oldStyle.parentNode) {
                oldStyle.parentNode.removeChild(oldStyle);
            }

            var rules = [];
            var applied = 0;
            var i;
            var sel;

            for (i = 0; i < selectors.length && applied < maxCssSelectors; i++) {
                sel = selectors[i];
                if (!isSafeSelector(sel)) {
                    continue;
                }
                rules.push(sel + '{display:none !important;visibility:hidden !important;}');
                applied++;
            }

            if (rules.length === 0) {
                return 0;
            }

            var styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.type = 'text/css';
            styleEl.textContent = rules.join('\n');
            parent.appendChild(styleEl);

            return applied;
        } catch (e) {
            return 0;
        }
    }

    function updateHiddenCountText() {
        try {
            var el = document.getElementById('sab-hidden-count');
            if (el) {
                el.textContent = String(hiddenCount);
            }
        } catch (e) {
            // 表示更新失敗時は無視
        }
    }

    function applyCustomSiteRules() {
        if (!isTargetDomain() || !document.body) {
            return;
        }

        try {
            var targets = document.querySelectorAll('ins.adsbygoogle, [data-ad-slot]');
            var i;
            var el;
            var updated = false;

            for (i = 0; i < targets.length; i++) {
                el = targets[i];
                if (!el || el.id === shieldId || el.id === panelId) {
                    continue;
                }
                if (el.getAttribute('data-sab-done') === '1') {
                    continue;
                }
                el.setAttribute('data-sab-done', '1');
                if (el.style) {
                    el.style.display = 'none';
                }
                hiddenCount++;
                updated = true;
            }

            if (updated) {
                updateHiddenCountText();
            }
        } catch (e) {
            // 要素処理エラー時も継続
        }
    }

    function scheduleSafeScan() {
        if (!isTargetDomain()) return;
        if (scanTimer) {
            clearTimeout(scanTimer);
        }
        scanTimer = setTimeout(function () {
            scanTimer = null;
            applyCustomSiteRules();
        }, 500);
    }

    function startSafeObserver() {
        if (observerStarted || !isTargetDomain() || !document.body) {
            return;
        }

        try {
            if (typeof MutationObserver !== 'function') {
                applyCustomSiteRules();
                return;
            }

            var observer = new MutationObserver(function (mutations) {
                var i;
                for (i = 0; i < mutations.length; i++) {
                    if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
                        scheduleSafeScan();
                        break;
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            observerStarted = true;
            applyCustomSiteRules();
        } catch (e) {
            applyCustomSiteRules();
        }
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
            '<div>対象サイト：<span id="sab-domain-status">未判定</span></div>' +
            '<div>EasyList：<span id="sab-easylist-status">未取得</span></div>' +
            '<div>EasyPrivacy：<span id="sab-privacy-status">未取得</span></div>' +
            '<div>ルール解析：<span id="sab-rule-stats">未解析</span></div>' +
            '<div>適用CSS：<span id="sab-applied-css">未適用</span></div>' +
            '<div>通信遮断数：0</div>' +
            '<div>広告要素除去数：<span id="sab-hidden-count">0</span></div>' +
            '<div style="margin-top:12px;text-align:right;"><span id="sab-close-button" style="display:inline-block;padding:5px 14px;background:#444;border-radius:6px;cursor:pointer;">閉じる</span></div>';

        document.body.appendChild(panel);

        var domainEl = document.getElementById('sab-domain-status');
        if (domainEl) {
            domainEl.textContent = isTargetDomain() ? '対象（Game8/GameWith）' : '対象外';
        }

        updateHiddenCountText();

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

        var host = getCurrentHost();
        var start = 0;
        var lineEnd;
        var line;
        var markerIdx;
        var domainPart;
        var selectorPart;

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
                if (selectors.length < maxCssSelectors) {
                    markerIdx = line.indexOf('##');
                    domainPart = line.slice(0, markerIdx);
                    selectorPart = line.slice(markerIdx + 2).replace(/^\s+|\s+$/g, '');
                    if (selectorPart && (!domainPart || isDomainMatchedSimple(domainPart, host))) {
                        selectors.push(selectorPart);
                    }
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
            appliedCssEl.textContent = '適用中...';
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

                var appliedCount = applyCssRules(parsed.selectors);
                if (appliedCssEl) {
                    appliedCssEl.textContent = isTargetDomain()
                        ? (appliedCount + '件')
                        : '対象外';
                }
            } else {
                easyListStatus.textContent = '取得失敗';
                if (ruleStats) {
                    ruleStats.textContent = '対象なし';
                }
                if (appliedCssEl) {
                    appliedCssEl.textContent = '未適用';
                }
            }
        } catch (e) {
            easyListStatus.textContent = 'エラー';
            if (ruleStats) {
                ruleStats.textContent = 'エラー';
            }
            if (appliedCssEl) {
                appliedCssEl.textContent = 'エラー';
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
        startSafeObserver();
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
