// ==UserScript==
// @name        Simple AD Blocker Shield Test
// @namespace   custom.sleipnir
// @author      Custom
// @description Shield icon display test
// @include     *://*/*
// @version     1.2.6
// ==/UserScript==

(function () {
    'use strict';

    function showShield() {
        if (document.getElementById('sab-test-shield')) {
            return;
        }

        if (!document.body) {
            return;
        }

        var button = document.createElement('button');

        button.id = 'sab-test-shield';
        button.textContent = '🛡';

        button.style.cssText =
            'position:fixed;' +
            'right:12px;' +
            'bottom:12px;' +
            'z-index:2147483647;' +
            'width:48px;' +
            'height:48px;' +
            'background:#1976d2;' +
            'color:white;' +
            'border:2px solid white;' +
            'border-radius:50%;' +
            'font-size:24px;' +
            'line-height:44px;' +
            'text-align:center;' +
            'padding:0;' +
            'margin:0;' +
            'display:block;' +
            'visibility:visible;' +
            'opacity:1;' +
            'box-shadow:0 2px 8px rgba(0,0,0,.4);' +
            '-webkit-appearance:none;' +
            'appearance:none;';

        button.onclick = function () {
            alert('Shield icon is working!');
        };

        document.body.appendChild(button);
    }

    function initialize() {
        showShield();

        setTimeout(showShield, 1000);
        setTimeout(showShield, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initialize,
            false
        );

        setTimeout(initialize, 1000);
        setTimeout(initialize, 3000);
    } else {
        initialize();
    }

})();
