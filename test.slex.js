
// ==UserScript==
// @name        SAB Parser Test
// @namespace   custom.sleipnir
// @version     1.0.1
// @description Independent EasyList cosmetic rule parser test
// @include     *://*/*
// @require api
// ==/UserScript==

(function () {
    'use strict';

    var buttonId = 'sab-parser-test-button';
    var panelId = 'sab-parser-test-panel';

    function createUI() {
        if (!document.body) return;
        if (document.getElementById(buttonId)) return;

        var button = document.createElement('div');
        button.id = buttonId;
        button.textContent = 'PARSER TEST';

        button.style.cssText =
            'position:fixed;' +
            'left:15px;' +
            'top:30px;' +
            'z-index:2147483647;' +
            'background:#673ab7;' +
            'color:white;' +
            'padding:12px;' +
            'border-radius:8px;' +
            'font-size:14px;' +
            'font-weight:bold;' +
            'cursor:pointer;';

        button.addEventListener('click', function () {
            runTest();
        });

        document.body.appendChild(button);

        var panel = document.createElement('div');
        panel.id = panelId;

        panel.style.cssText =
            'position:fixed;' +
            'left:15px;' +
            'top:85px;' +
            'z-index:2147483647;' +
            'width:260px;' +
            'max-height:60vh;' +
            'overflow:auto;' +
            'padding:12px;' +
            'background:#202124;' +
            'color:white;' +
            'border:1px solid #777;' +
            'border-radius:8px;' +
            'font-size:13px;' +
            'line-height:1.7;' +
            'font-family:sans-serif;' +
            'display:none;' +
            'box-sizing:border-box;';

        panel.innerHTML =
            '<div style="font-weight:bold;margin-bottom:8px;">' +
            'SAB Parser Test' +
            '</div>' +
            '<div id="sab-parser-result">待機中</div>' +
            '<div style="margin-top:10px;text-align:right;">' +
            '<span id="sab-parser-close" ' +
            'style="padding:5px 12px;background:#444;border-radius:5px;">' +
            '閉じる</span></div>';

        document.body.appendChild(panel);

        document.getElementById('sab-parser-close')
            .addEventListener('click', function () {
                panel.style.display = 'none';
            });
    }

    function countCosmeticRules(text, hostname) {
        var lines = text.split(/\r?\n/);
        var seen = {};
        var count = 0;
        var exceptions = 0;

        hostname = hostname.toLowerCase();

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].replace(/^\s+|\s+$/g, '');

            if (!line || line.charAt(0) === '!') continue;

            var exceptionIndex = line.indexOf('#@#');

            if (exceptionIndex !== -1) {
                exceptions++;
                continue;
            }

            var separator = line.indexOf('##');

            if (separator === -1) continue;

            var domainPart = line.substring(0, separator);
            var selector = line.substring(separator + 2);

            if (!selector) continue;

            if (domainPart) {
                var domains = domainPart.toLowerCase().split(',');
                var matched = false;
                var excluded = false;

                for (var d = 0; d < domains.length; d++) {
                    var domain = domains[d].replace(/^\s+|\s+$/g, '');

                    if (!domain) continue;

                    if (domain.charAt(0) === '~') {
                        domain = domain.substring(1);

                        if (
                            hostname === domain ||
                            hostname.slice(-(domain.length + 1)) === '.' + domain
                        ) {
                            excluded = true;
                        }
                    } else if (
                        hostname === domain ||
                        hostname.slice(-(domain.length + 1)) === '.' + domain
                    ) {
                        matched = true;
                    }
                }

                if (!matched || excluded) continue;
            }

            if (seen[selector]) continue;

            seen[selector] = true;
            count++;
        }

        return {
            rules: count,
            exceptions: exceptions
        };
    }

    function runTest() {
        var panel = document.getElementById(panelId);
        var result = document.getElementById('sab-parser-result');

        if (!panel || !result) return;

        panel.style.display = 'block';
        result.textContent = 'EasyList取得中...';

        try {
            var filterText = SLEX_httpGet(
                'https://easylist.to/easylist/easylist.txt'
            );

            if (
                typeof filterText !== 'string' ||
                filterText.length === 0
            ) {
                result.textContent = 'EasyList取得失敗';
                return;
            }

            result.textContent = 'CSSルール解析中...';

            var hostname = location.hostname.toLowerCase();

            var parsed = countCosmeticRules(
                filterText,
                hostname
            );

            result.innerHTML =
                '対象ドメイン：' + hostname + '<br>' +
                'EasyList：取得成功<br>' +
                '取得文字数：' + filterText.length + '<br>' +
                'CSSルール候補：' + parsed.rules + '<br>' +
                '例外ルール：' + parsed.exceptions + '<br>' +
                '<span style="color:#ffcc80;">※まだ広告には適用していません</span>';

        } catch (e) {
            result.textContent = 'エラー：' + String(e);
        }
    }

    function initialize() {
        createUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    setTimeout(initialize, 1000);
    setTimeout(initialize, 3000);

})();
