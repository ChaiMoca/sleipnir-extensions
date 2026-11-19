// ==UserScript==
// @name GameWith Ad Inspector
// @name:ja GameWith PR広告調査
// @author ChatGPT
// @description GameWith bottom PR ad inspector
// @description:ja GameWith下部PR広告の構造調査
// @include https://gamewith.jp/*
// @include http://gamewith.jp/*
// @version 2.2
// ==/UserScript==

(function () {
    'use strict';

    if (window.__gameWithAdInspector) return;
    window.__gameWithAdInspector = true;

    function start() {
        if (!document.body) return;

        var btn = document.createElement('button');
        btn.textContent = 'PR広告調査開始';

        btn.style.cssText =
            'position:fixed!important;' +
            'top:10px!important;' +
            'left:10px!important;' +
            'z-index:2147483647!important;' +
            'padding:12px!important;' +
            'background:#d32f2f!important;' +
            'color:white!important;' +
            'border:0!important;' +
            'border-radius:8px!important;' +
            'font-size:14px!important;';

        btn.onclick = function () {
            var vh = window.innerHeight;
            var vw = window.innerWidth;
            var elements = document.querySelectorAll('body *');
            var found = [];
            var seen = {};

            for (var i = 0; i < elements.length; i++) {
                var el = elements[i];

                if (el === btn) continue;

                var r = el.getBoundingClientRect();

                if (
                    r.width < vw * 0.65 ||
                    r.height < 20 ||
                    r.height > 500 ||
                    r.bottom < vh * 0.65 ||
                    r.top > vh
                ) continue;

                var text = (el.innerText || el.textContent || '').trim();

                if (!/PR/i.test(text) &&
                    el.tagName !== 'IFRAME') continue;

                var item = {
                    tag: el.tagName,
                    id: el.id || '',
                    className: typeof el.className === 'string'
                        ? el.className : '',
                    position: getComputedStyle(el).position,
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                    top: Math.round(r.top),
                    bottom: Math.round(r.bottom),
                    text: text.substring(0, 200),
                    html: el.outerHTML.substring(0, 1500)
                };

                var key = item.tag + '|' + item.id +
                    '|' + item.className + '|' + item.top;

                if (seen[key]) continue;

                seen[key] = true;
                found.push(item);
            }

            var panel = document.getElementById(
                'gw-inspector-result'
            );

            if (!panel) {
                panel = document.createElement('textarea');
                panel.id = 'gw-inspector-result';

                panel.style.cssText =
                    'position:fixed!important;' +
                    'top:60px!important;' +
                    'left:3%!important;' +
                    'width:94%!important;' +
                    'height:65%!important;' +
                    'z-index:2147483647!important;' +
                    'background:white!important;' +
                    'color:black!important;' +
                    'border:2px solid #d32f2f!important;' +
                    'padding:8px!important;' +
                    'font-size:12px!important;' +
                    'box-sizing:border-box!important;';

                document.body.appendChild(panel);
            }

            panel.value = JSON.stringify(found, null, 2);
            panel.focus();
            panel.select();

            btn.textContent = '調査完了：' + found.length + '件';
        };

        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
