
// ==UserScript==
// @name GameWith Ad Inspector
// @name:ja GameWith PR広告詳細調査
// @author ChatGPT
// @description GameWith bottom element inspector
// @description:ja GameWith下部広告の詳細調査
// @include https://gamewith.jp/*
// @include http://gamewith.jp/*
// @version 3.0
// ==/UserScript==

(function () {
    'use strict';

    if (window.__gameWithAdInspectorV3) return;
    window.__gameWithAdInspectorV3 = true;

    function start() {
        if (!document.body) return;

        var btn = document.createElement('button');
        btn.textContent = '下部広告・構造調査';

        btn.style.cssText =
            'position:fixed!important;' +
            'top:10px!important;' +
            'left:10px!important;' +
            'z-index:2147483647!important;' +
            'padding:12px!important;' +
            'background:#1565c0!important;' +
            'color:white!important;' +
            'border:0!important;' +
            'border-radius:8px!important;' +
            'font-size:14px!important;';

        btn.onclick = function () {
            var vh = window.innerHeight;
            var vw = window.innerWidth;
            var elements = document.body.querySelectorAll('*');
            var found = [];
            var seen = {};

            for (var i = 0; i < elements.length; i++) {
                var el = elements[i];

                if (el === btn ||
                    el.id === 'gw-inspector-result') continue;

                if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(el.tagName))
                    continue;

                var r = el.getBoundingClientRect();
                var style = window.getComputedStyle(el);

                var fixed =
                    style.position === 'fixed' ||
                    style.position === 'sticky';

                if (
                    r.width < vw * 0.35 ||
                    r.height < 15 ||
                    r.height > 1000 ||
                    r.bottom < vh * 0.45 ||
                    r.top > vh
                ) {
                    if (!fixed) continue;
                }

                if (r.width <= 0 || r.height <= 0) continue;

                var text = (
                    el.innerText || el.textContent || ''
                ).replace(/\s+/g, ' ').trim();

                var item = {
                    tag: el.tagName,
                    id: el.id || '',
                    className: typeof el.className === 'string'
                        ? el.className : '',
                    position: style.position,
                    display: style.display,
                    visibility: style.visibility,
                    zIndex: style.zIndex,
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                    top: Math.round(r.top),
                    bottom: Math.round(r.bottom),
                    text: text.substring(0, 120),
                    html: el.outerHTML.substring(0, 700)
                };

                if (el.tagName === 'IFRAME') {
                    item.src = el.getAttribute('src') || '';
                }

                var key = [
                    item.tag,
                    item.id,
                    item.className,
                    item.top,
                    item.height
                ].join('|');

                if (seen[key]) continue;
                seen[key] = true;

                found.push(item);

                if (found.length >= 100) break;
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
                    'border:2px solid #1565c0!important;' +
                    'padding:8px!important;' +
                    'font-size:11px!important;' +
                    'box-sizing:border-box!important;';
                document.body.appendChild(panel);
            }

            panel.value = JSON.stringify(found, null, 2);
            panel.focus();
            panel.select();

            btn.textContent =
                '調査完了：' + found.length + '件';
        };

        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
