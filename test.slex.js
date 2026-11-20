
// ==UserScript==
// @name        Simple AD Blocker
// @namespace   custom.sleipnir
// @version     1.5.4
// @description SAB isolated rule analysis preparation
// @include     *://*/*
// @require api
// ==/UserScript==

(function () {
    'use strict';

    var shieldId = 'sab-test-button';
    var panelId = 'sab-status-panel';
    var filtersLoaded = false;

    // 追加：フィルター保存領域
    var easyListText = '';
    var easyPrivacyText = '';

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
            '<div style="font-size:16px;font-weight:bold;margin-bottom:10px;">' +
                '🛡 Simple AD Blocker' +
            '</div>' +

            '<div>状態：<span style="color:#4caf50;">UI動作中</span></div>' +
            '<div>EasyList：<span id="sab-easylist-status">未取得</span></div>' +
            '<div>EasyPrivacy：<span id="sab-privacy-status">未取得</span></div>' +
            '<div>通信遮断数：0</div>' +
            '<div>広告要素除去数：0</div>' +

            '<div style="margin-top:12px;text-align:right;">' +
                '<span id="sab-close-button" ' +
                'style="display:inline-block;padding:5px 14px;' +
                'background:#444;border-radius:6px;cursor:pointer;">' +
                '閉じる' +
                '</span>' +
            '</div>';

        document.body.appendChild(panel);

        var closeButton = document.getElementById('sab-close-button');

        closeButton.addEventListener('click', function () {
            panel.style.display = 'none';
        });
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
    }

    // 追加：独立した解析関数（今回は呼び出さない）
    function analyzeCosmeticRules() {
        var sources = [easyListText, easyPrivacyText];
        var hostname = location.hostname.toLowerCase();
        var found = Object.create(null);
        var count = 0;

        for (var s = 0; s < sources.length; s++) {
            if (!sources[s]) continue;

            var lines = sources[s].split(/\r?\n/);

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();

                if (!line || line.charAt(0) === '!') continue;

                var index = line.indexOf('##');
                if (index < 0) continue;

                var domainPart = line.substring(0, index);
                var selector = line.substring(index + 2).trim();

                if (!selector || selector.length > 1000) continue;

                if (domainPart) {
                    var domains = domainPart.toLowerCase().split(',');
                    var matched = false;

                    for (var d = 0; d < domains.length; d++) {
                        var domain = domains[d].trim();

                        if (domain.charAt(0) === '~') continue;

                        if (
                            hostname === domain ||
                            hostname.endsWith('.' + domain)
                        ) {
                            matched = true;
                            break;
                        }
                    }

                    if (!matched) continue;
                }

                if (found[selector]) continue;

                found[selector] = true;
                count++;

                if (count >= 1500) return count;
            }
        }

        return count;
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
