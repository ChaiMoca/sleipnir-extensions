// ==UserScript==
// @name        SAB Observer Custom Test
// @namespace   custom.sleipnir
// @version     1.0.3
// @description MutationObserver dynamic element hiding test
// @include     *://*/*
// @require api
// ==/UserScript==

(function () {
    'use strict';

    var buttonId = 'sab-observer-test-button';
    var panelId = 'sab-observer-test-panel';

    var callbackCount = 0;
    var detectedCount = 0;
    var hiddenCount = 0;
    var currentMatches = 0;

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

    var seenElements = [];

    function isTargetElement(element) {
        if (!element || element.nodeType !== 1) {
            return false;
        }

        for (var i = 0; i < selectors.length; i++) {
            try {
                if (element.matches(selectors[i])) {
                    return true;
                }
            } catch (e) {
            }
        }

        return false;
    }

    function alreadySeen(element) {
        for (var i = 0; i < seenElements.length; i++) {
            if (seenElements[i] === element) {
                return true;
            }
        }

        return false;
    }

    function hideElement(element) {
        if (!isTargetElement(element)) {
            return;
        }

        if (alreadySeen(element)) {
            return;
        }

        seenElements.push(element);
        detectedCount++;

        element.style.setProperty(
            'display',
            'none',
            'important'
        );

        hiddenCount++;
    }

    function scanElement(element) {
        if (!element || element.nodeType !== 1) {
            return;
        }

        hideElement(element);

        for (var i = 0; i < selectors.length; i++) {
            try {
                var found = element.querySelectorAll(selectors[i]);

                for (var j = 0; j < found.length; j++) {
                    hideElement(found[j]);
                }
            } catch (e) {
            }
        }
    }

    function scanPage() {
        currentMatches = 0;

        for (var i = 0; i < selectors.length; i++) {
            try {
                var found = document.querySelectorAll(selectors[i]);
                currentMatches += found.length;

                for (var j = 0; j < found.length; j++) {
                    hideElement(found[j]);
                }
            } catch (e) {
            }
        }
    }

    function updatePanel() {
        var result = document.getElementById(
            'sab-observer-result'
        );

        if (!result) {
            return;
        }

        result.innerHTML =
            'Observer: CALLBACK OK<br>' +
            'Callbacks: ' + callbackCount + '<br>' +
            'Detected: ' + detectedCount + '<br>' +
            'Hidden: ' + hiddenCount + '<br>' +
            'Current matches: ' + currentMatches;
    }

    function startObserver() {
        if (typeof MutationObserver === 'undefined') {
            return;
        }

        var observer = new MutationObserver(function (mutations) {
            callbackCount++;

            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;

                for (var j = 0; j < added.length; j++) {
                    scanElement(added[j]);
                }
            }

            updatePanel();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        scanPage();
        updatePanel();
    }

    function addDynamicTestElement() {
        var element = document.createElement('div');

        element.className = 'ad-banner';
        element.textContent = 'SAB DYNAMIC TEST ELEMENT';

        element.style.cssText =
            'position:fixed;' +
            'left:15px;' +
            'top:180px;' +
            'z-index:2147483647;' +
            'padding:15px;' +
            'background:#ff9800;' +
            'color:#000;' +
            'font-weight:bold;';

        document.body.appendChild(element);

        updatePanel();
    }

    function createUI() {
        if (!document.body) {
            return;
        }

        if (document.getElementById(buttonId)) {
            return;
        }

        var button = document.createElement('div');

        button.id = buttonId;
        button.textContent = 'OBSERVER TEST';

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
            var panel = document.getElementById(panelId);

            if (panel) {
                panel.style.display =
                    panel.style.display === 'none'
                    ? 'block'
                    : 'none';
            }
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
            'padding:12px;' +
            'background:#202124;' +
            'color:white;' +
            'border:1px solid #777;' +
            'border-radius:8px;' +
            'font-size:13px;' +
            'line-height:1.8;' +
            'font-family:sans-serif;' +
            'box-sizing:border-box;';

        panel.innerHTML =
            '<div style="font-weight:bold;margin-bottom:8px;">' +
            'SAB Observer Test v1.0.3' +
            '</div>' +
            '<div id="sab-observer-result">準備中...</div>' +
            '<div style="margin-top:12px;">' +
            '<span id="sab-observer-add" ' +
            'style="display:inline-block;padding:7px;background:#673ab7;border-radius:5px;">' +
            '動的テスト要素を追加' +
            '</span></div>' +
            '<div style="margin-top:10px;">' +
            '<span id="sab-observer-close" ' +
            'style="display:inline-block;padding:5px 12px;background:#444;border-radius:5px;">' +
            '閉じる' +
            '</span></div>';

        document.body.appendChild(panel);

        document.getElementById('sab-observer-add')
            .addEventListener('click', addDynamicTestElement);

        document.getElementById('sab-observer-close')
            .addEventListener('click', function () {
                panel.style.display = 'none';
            });

        updatePanel();
    }

    function initialize() {
        createUI();
        startObserver();
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
