// ==UserScript==
// @name        SAB Display Test
// @namespace   custom.sleipnir
// @version     1.0
// @description Simple display test
// @include     *://*/*
// ==/UserScript==

(function () {
    'use strict';

    function showTest() {
        if (!document.body) return;

        if (document.getElementById('sab-test-button')) {
            return;
        }

        var button = document.createElement('div');

        button.id = 'sab-test-button';
        button.textContent = 'TEST';

        button.style.cssText = [
            'position:fixed',
            'right:20px',
            'bottom:30px',
            'z-index:2147483647',
            'width:55px',
            'height:55px',
            'border-radius:50%',
            'background:#e53935',
            'color:white',
            'font-size:16px',
            'font-weight:bold',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'box-shadow:0 2px 8px #000',
            'pointer-events:auto'
        ].join(';');

        button.addEventListener('click', function () {
            alert('Sleipnir extension is working!');
        });

        document.body.appendChild(button);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            showTest
        );
    } else {
        showTest();
    }

    setTimeout(showTest, 1000);
    setTimeout(showTest, 3000);

})();
