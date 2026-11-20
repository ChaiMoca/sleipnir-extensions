
// ==UserScript==
// @name        SAB Parser Test
// @namespace   custom.sleipnir
// @version     1.0.2
// @description Site-specific EasyList and EasyPrivacy parser test
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

    function domainMatches(domainPart, hostname) {
        if (!domainPart) return true;

        var domains = domainPart.toLowerCase().split(',');
        var matched = false;
        var excluded = false;

        for (var i = 0; i < domains.length; i++) {
            var domain = domains[i].replace(/^\s+|\s+$/g, '');

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

        return matched && !excluded;
    }

    function parseFilter(text, hostname) {
        var lines = text.split(/\r?\n/);
        var rules = [];
        var exceptions = [];
        var seenRules = {};
        var seenExceptions = {};

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].replace(/^\s+|\s+$/g, '');

            if (!line || line.charAt(0) === '!') continue;

            var exceptionIndex = line.indexOf('#@#');

            if (exceptionIndex !== -1) {
                var exceptionDomain = line.substring(0, exceptionIndex);
                var exceptionSelector = line.substring(exceptionIndex + 3);

                if (
                    exceptionSelector &&
                    domainMatches(exceptionDomain, hostname) &&
                    !seenExceptions[exceptionSelector]
                ) {
                    seenExceptions[exceptionSelector] = true;
                    exceptions.push(exceptionSelector);
                }

                continue;
            }

            // 今回は通常のCSS要素非表示ルールのみ対象
            if (
                line.indexOf('#?#') !== -1 ||
                line.indexOf('#$#') !== -1 ||
                line.indexOf('#%#') !== -1
            ) {
                continue;
            }

            var ruleIndex = line.indexOf('##');

            if (ruleIndex === -1) continue;

            var domainPart = line.substring(0, ruleIndex);
            var selector = line.substring(ruleIndex + 2);

            if (!selector || selector.length > 1500) continue;
            if (!domainMatches(domainPart, hostname)) continue;

            if (!seenRules[selector]) {
                seenRules[selector] = true;
                rules.push(selector);
            }
        }

        var exceptionMap = {};

        for (var e = 0; e < exceptions.length; e++) {
            exceptionMap[exceptions[e]] = true;
        }

        var activeRules = [];

        for (var r = 0; r < rules.length; r++) {
            if (!exceptionMap[rules[r]]) {
                activeRules.push(rules[r]);
            }
        }

        return {
            candidates: rules.length,
            exceptions: exceptions.length,
            active: activeRules
        };
    }

    function validateSelectors(selectors) {
        var valid = [];
        var invalid = 0;
        var checked = 0;
        var limit = 100;

        for (var i = 0; i < selectors.length; i++) {
            if (checked >= limit) break;

            checked++;

            try {
                document.querySelector(selectors[i]);
                valid.push(selectors[i]);
            } catch (e) {
                invalid++;
            }
        }

        return {
            valid: valid,
            invalid: invalid,
            checked: checked
        };
    }

    function runTest() {
        var panel = document.getElementById(panelId);
        var result = document.getElementById('sab-parser-result');

        if (!panel || !result) return;

        panel.style.display = 'block';
        result.textContent = 'EasyList取得中...';

        try {
            var easyList = SLEX_httpGet(
                'https://easylist.to/easylist/easylist.txt'
            );

            if (typeof easyList !== 'string' || !easyList.length) {
                result.textContent = 'EasyList取得失敗';
                return;
            }

            result.textContent = 'EasyPrivacy取得中...';

            var easyPrivacy = SLEX_httpGet(
                'https://easylist.to/easylist/easyprivacy.txt'
            );

            if (typeof easyPrivacy !== 'string') {
                easyPrivacy = '';
            }

            var hostname = location.hostname.toLowerCase();

            result.textContent = 'サイト別ルール解析中...';

            var listResult = parseFilter(easyList, hostname);
            var privacyResult = parseFilter(easyPrivacy, hostname);

            var combined = listResult.active.concat(
                privacyResult.active
            );

            var unique = [];
            var seen = {};

            for (var i = 0; i < combined.length; i++) {
                if (!seen[combined[i]]) {
                    seen[combined[i]] = true;
                    unique.push(combined[i]);
                }
            }

            var validation = validateSelectors(unique);

            var output =
                '対象サイト：' + hostname + '\n\n' +
                '【EasyList】\n' +
                '取得文字数：' + easyList.length + '\n' +
                '対象ルール候補：' + listResult.candidates + '\n' +
                '例外ルール：' + listResult.exceptions + '\n\n' +
                '【EasyPrivacy】\n' +
                '取得文字数：' + easyPrivacy.length + '\n' +
                '対象ルール候補：' + privacyResult.candidates + '\n' +
                '例外ルール：' + privacyResult.exceptions + '\n\n' +
                '【統合結果】\n' +
                '重複除外後：' + unique.length + '\n' +
                '構文検証数：' + validation.checked + '\n' +
                '構文エラー：' + validation.invalid + '\n' +
                '構文確認済み：' + validation.valid.length + '\n\n' +
                '【セレクタ例】\n';

            var sampleCount = Math.min(validation.valid.length, 10);

            for (var s = 0; s < sampleCount; s++) {
                output += (s + 1) + '. ' +
                    validation.valid[s] + '\n';
            }

            output +=
                '\n※抽出・構文検証のみ実施\n' +
                '※広告要素への適用は未実施';

            result.textContent = output;

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
