
// ==UserScript==
// @name        SAB Observer Custom Test
// @namespace   custom.sleipnir
// @version     1.0.2
// @description Observer integration test
// @include     *://*/*
// @require api
// ==/UserScript==

(function () {
    'use strict';

    var boxId = 'sab-observer-test-box';
    var detected = 0;

    var selectors = [
        'ins.adsbygoogle',
        '[data-ad-slot]',
        '.ad-banner',
        '.ad_banner',
        '.pr-banner',
        '.pr_banner',
        '.sponsored',
        '.ad-box'
    ];

    function countTargets() {
        var total = 0;
        var i;

        for (i = 0; i < selectors.length; i++) {
            try {
                total += document.querySelectorAll(selectors[i]).length;
            } catch (e) {
            }
        }

        return total;
    }

    function showResult(message) {
        var box = document.getElementById(boxId);
        if (!box) return;

        box.textContent =
            'SAB Observer Test\n' +
            'Observer: ' + message + '\n' +
            'Detected: ' + detected + '\n' +
            'Current matches: ' + countTargets();
    }

    function startTest() {
        if (!document.body) return;
        if (document.getElementById(boxId)) return;

        var box = document.createElement('div');
        box.id = boxId;

        box.style.cssText =
            'position:fixed;top:30px;left:15px;' +
            'z-index:2147483647;padding:12px;' +
            'background:#202124;color:white;' +
            'border:2px solid #673ab7;' +
            'font-size:13px;line-height:1.7;' +
            'white-space:pre-line;';

        box.textContent = 'SAB Observer Test\nStarting...';
        document.body.appendChild(box);

        try {
            if (typeof MutationObserver !== 'function') {
                showResult('NOT AVAILABLE');
                return;
            }

            var observer = new MutationObserver(function (records) {
                var changed = false;
                var i;

                for (i = 0; i < records.length; i++) {
                    if (records[i].target !== box &&
                        !box.contains(records[i].target)) {
                        changed = true;
                        break;
                    }
                }

                if (changed) {
                    detected++;
                    showResult('CALLBACK OK');
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            showResult('CREATED');

            var target = document.createElement('div');
            target.className = 'ad-banner';
            target.textContent = 'TEST TARGET';
            document.body.appendChild(target);

        } catch (e) {
            showResult('ERROR: ' + String(e));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startTest);
    } else {
        startTest();
    }

    setTimeout(startTest, 1000);

})();
