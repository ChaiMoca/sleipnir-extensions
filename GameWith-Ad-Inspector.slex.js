
// ==UserScript==
// @name        Simple AD Blocker
// @namespace   custom.sleipnir
// @version     1.5.1
// @description SAB cosmetic rule analysis
// @include     *://*/*
// @require api
// ==/UserScript==

(function () {
    'use strict';

    var shieldId = 'sab-test-button';
    var panelId = 'sab-status-panel';

    var filtersLoaded = false;
    var easyListText = '';
    var easyPrivacyText = '';

    function createPanel() {
        if (document.getElementById(panelId)) return;
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
            '<div style="font-size:16px;font-weight:bold;margin-bottom:10px;">' +
                '🛡 Simple AD Blocker' +
            '</div>' +
            '<div>状態：<span style="color:#4caf50;">UI動作中</span></div>' +
            '<div>EasyList：<span id="sab-easylist-status">未取得</span></div>' +
            '<div>EasyPrivacy：<span id="sab-privacy-status">未取得</span></div>' +
            '<div>広告ルール候補数：<span id="sab-rule-count">未解析</span></div>' +
            '<div style="margin-top:12px;text-align:right;">' +
                '<span id="sab-close-button" ' +
                'style="display:inline-block;padding:5px 14px;' +
                'background:#444;border-radius:6px;cursor:pointer;">' +
                '閉じる' +
                '</span>' +
            '</div>';

        document.body.appendChild(panel);

        document.getElementById('sab-close-button')
            .addEventListener('click', function () {
                panel.style.display = 'none';
            });
    }

    function domainMatches(domain, hostname) {
        domain = domain.toLowerCase().replace(/^\./, '');
        hostname = hostname.toLowerCase();

        return hostname === domain ||
            hostname.endsWith('.' + domain);
    }

    function domainRuleMatches(domainPart, hostname) {
        if (!domainPart) return true;

        var domains = domainPart.toLowerCase().split(',');
        var included = [];
        var excluded = [];

        for (var i = 0; i < domains.length; i++) {
            var domain = domains[i].trim();

            if (!domain) continue;

            if (domain.charAt(0) === '~') {
                excluded.push(domain.substring(1));
            } else {
                included.push(domain);
            }
        }

        for (var j = 0; j < excluded.length; j++) {
            if (domainMatches(excluded[j], hostname)) {
                return false;
            }
        }

        if (included.length === 0) return true;

        for (var k = 0; k < included.length; k++) {
            if (domainMatches(included[k], hostname)) {
                return true;
            }
        }

        return false;
    }

    function isUsableSelector(selector) {
        selector = selector.trim();

        if (!selector || selector.length > 1000) return false;

        var unsupported = [
            ':-abp-',
            ':has-text(',
            ':contains(',
            ':xpath(',
            ':matches-css(',
            ':matches-attr(',
            ':matches-property(',
            ':upward(',
            ':remove(',
            ':style('
        ];

        for (var i = 0; i < unsupported.length; i++) {
            if (selector.indexOf(unsupported[i]) !== -1) {
                return false;
            }
        }

        if (
            /[{};\r\n]/.test(selector) ||
            selector === 'html' ||
            selector === 'body' ||
            selector === 'div' ||
            selector === 'span' ||
            selector === 'iframe' ||
            selector === '*'
        ) {
            return false;
        }

        try {
            document.querySelector(selector);
            return true;
        } catch (e) {
            return false;
        }
    }

    function analyzeCosmeticRules() {
        var hostname = location.hostname.toLowerCase();

        var sources = [
            easyListText,
            easyPrivacyText
        ];

        var unique = Object.create(null);
        var count = 0;

        for (var s = 0; s < sources.length; s++) {
            if (!sources[s]) continue;

            var lines = sources[s].split(/\r?\n/);

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();

                if (
                    !line ||
                    line.charAt(0) === '!' ||
                    line.indexOf('[Adblock') === 0
                ) {
                    continue;
                }

                // 今回は通常の ## ルールだけを集計
                // 例外ルール #@# は対象外
                var index = line.indexOf('##');

                if (index < 0) continue;
                if (line.indexOf('#@#') >= 0) continue;

                var domainPart = line.substring(0, index);
                var selector = line.substring(index + 2).trim();

                if (!domainRuleMatches(domainPart, hostname)) {
                    continue;
                }

                if (!isUsableSelector(selector)) {
                    continue;
                }

                if (unique[selector]) continue;

                unique[selector] = true;
                count++;
            }
        }

        var countElement = document.getElementById('sab-rule-count');

        if (countElement) {
            countElement.textContent = String(count);
        }
    }

    function loadFilters() {
        if (filtersLoaded) return;

        filtersLoaded = true;

        var easyListStatus =
            document.getElementById('sab-easylist-status');

        var privacyStatus =
            document.getElementById('sab-privacy-status');

        if (!easyListStatus || !privacyStatus) return;

        easyListStatus.textContent = '取得中...';
        privacyStatus.textContent = '取得中...';

        try {
            var easyList = SLEX_httpGet(
                'https://easylist.to/easylist/easylist.txt'
            );

            if (typeof easyList === 'string' && easyList.length > 0) {
                easyListText = easyList;
                easyListStatus.textContent =
                    '取得成功（' + easyList.length + '文字）';
            } else {
                easyListStatus.textContent = '取得失敗';
            }
        } catch (e) {
            easyListStatus.textContent = 'エラー';
        }

        try {
            var easyPrivacy = SLEX_httpGet(
                'https://easylist.to/easylist/easyprivacy.txt'
            );

            if (
                typeof easyPrivacy === 'string' &&
                easyPrivacy.length > 0
            ) {
                easyPrivacyText = easyPrivacy;
                privacyStatus.textContent =
                    '取得成功（' + easyPrivacy.length + '文字）';
            } else {
                privacyStatus.textContent = '取得失敗';
            }
        } catch (e) {
            privacyStatus.textContent = 'エラー';
        }

        analyzeCosmeticRules();
    }

    function showShield() {
        if (!document.body) return;
        if (document.getElementById(shieldId)) return;

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
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    setTimeout(initialize, 1000);
    setTimeout(initialize, 3000);

})();
