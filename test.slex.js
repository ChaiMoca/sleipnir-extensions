
// ==UserScript==
// @name        Aegis Ad Shield
// @name:ja     イージス広告シールド
// @namespace   custom.aegis
// @version     0.1.0
// @description Original ad and annoyance blocker for Sleipnir for Android.
// @include     http://*
// @include     https://*
// @require     api
// ==/UserScript==

(function () {
  'use strict';

  /*
   * Aegis Ad Shield
   * 独自実装の初期版。
   * - 広告通信先判定
   * - 広告枠・広告iframeの除去
   * - 動的追加要素の監視
   * - 盾ボタンと操作パネル
   */

  var APP = 'AegisAdShield';
  var VERSION = '0.1.0';
  var STORAGE_KEY = 'aegis_ad_shield_enabled';
  var enabled = true;
  var observer = null;
  var scanTimer = 0;
  var blockedCount = 0;
  var hiddenCount = 0;
  var lastAction = '起動しました';

  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '0') enabled = false;
  } catch (e) {}

  // 広告配信先
  var AD_HOSTS = [
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    'adnxs.com',
    'adsrvr.org',
    'taboola.com',
    'outbrain.com',
    'amazon-adsystem.com',
    'popads.net',
    'popcash.net',
    'trafficjunky.net',
    'microad.jp',
    'i-mobile.co.jp',
    'nend.net',
    'adingo.jp',
    'geniee.jp'
  ];

  // 広告枠セレクタ
  var HIDE_SELECTORS = [
    'ins.adsbygoogle',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="amazon-adsystem.com"]',
    'div[id^="div-gpt-ad"]',
    'div[id^="google_ads_"]',
    'div[id^="yads_"]',
    'div[id^="ad_position_"]',
    '[data-ad-slot]',
    '[data-google-query-id]',
    '.ad-banner',
    '.ad-container iframe'
  ];

  function log(message) {
    lastAction = message;
    updatePanel();
  }

  function hostFromUrl(value) {
    if (!value) return '';

    try {
      return new URL(String(value), location.href)
        .hostname.toLowerCase().replace(/\.$/, '');
    } catch (e) {
      return '';
    }
  }

  function isAdUrl(value) {
    var host = hostFromUrl(value);
    if (!host) return false;

    for (var i = 0; i < AD_HOSTS.length; i++) {
      var item = AD_HOSTS[i];

      if (host === item ||
          host.slice(-(item.length + 1)) === '.' + item) {
        return true;
      }
    }

    return false;
  }

  function addStyle(css) {
    try {
      if (typeof SLEX_addStyle === 'function') {
        SLEX_addStyle(css);
        return true;
      }
    } catch (e) {}

    try {
      var style = document.createElement('style');
      style.type = 'text/css';
      style.setAttribute('data-aegis-style', '1');
      style.appendChild(document.createTextNode(css));

      (document.head || document.documentElement)
        .appendChild(style);

      return true;
    } catch (e) {
      return false;
    }
  }

  var HIDE_CSS =
    HIDE_SELECTORS.join(',') +
    '{display:none !important; visibility:hidden !important;}' +
    '#aegis-shield-root, #aegis-shield-root *{' +
    'box-sizing:border-box !important;}' +
    '#aegis-shield-root{' +
    'display:block !important;visibility:visible !important;}' +
    '#aegis-shield-root button{' +
    'font-family:Arial,sans-serif !important;}';

  addStyle(HIDE_CSS);

  function markHidden(element) {
    if (!element || element.nodeType !== 1) return;

    if (element.closest &&
        element.closest('#aegis-shield-root')) return;

    var tag = element.tagName;

    if (tag === 'IFRAME' || tag === 'SCRIPT') {
      var source = element.src ||
        element.getAttribute('src') || '';

      if (isAdUrl(source)) {
        if (tag === 'IFRAME') {
          try {
            element.src = 'about:blank';
          } catch (e) {}
        }

        try {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
          blockedCount++;
        } catch (e) {}

        return;
      }
    }

    if (tag === 'INS' &&
        element.classList &&
        element.classList.contains('adsbygoogle')) {
      element.style.setProperty(
        'display', 'none', 'important'
      );
      hiddenCount++;
    }
  }

  function scan(root) {
    if (!enabled || !root) return;

    if (root.nodeType === 1) {
      markHidden(root);
    }

    if (root.querySelectorAll) {
      var nodes = root.querySelectorAll(
        'iframe,script,ins.adsbygoogle'
      );

      for (var i = 0; i < nodes.length; i++) {
        markHidden(nodes[i]);
      }

      for (var j = 0; j < HIDE_SELECTORS.length; j++) {
        var matches;

        try {
          matches = root.querySelectorAll(
            HIDE_SELECTORS[j]
          );
        } catch (e) {
          continue;
        }

        for (var k = 0; k < matches.length; k++) {
          var el = matches[k];

          if (el.closest &&
              el.closest('#aegis-shield-root')) {
            continue;
          }

          if (el.getAttribute('data-aegis-hidden') === '1') {
            continue;
          }

          el.setAttribute('data-aegis-hidden', '1');
          el.style.setProperty(
            'display', 'none', 'important'
          );

          hiddenCount++;
        }
      }
    }

    updatePanel();
  }

  function scheduleScan(root) {
    if (!enabled) return;

    if (scanTimer) clearTimeout(scanTimer);

    scanTimer = setTimeout(function () {
      scanTimer = 0;
      scan(root || document);
    }, 180);
  }

  function installObserver() {
    if (!window.MutationObserver || observer) return;

    try {
      observer = new MutationObserver(function (records) {
        if (!enabled) return;

        for (var i = 0; i < records.length; i++) {
          var added = records[i].addedNodes;

          for (var j = 0; j < added.length; j++) {
            if (added[j] && added[j].nodeType === 1) {
              scheduleScan(added[j]);
            }
          }
        }
      });

      observer.observe(
        document.documentElement || document,
        {
          childList: true,
          subtree: true
        }
      );
    } catch (e) {
      observer = null;
    }
  }

  // 通信遮断
  function installNetworkGuards() {
    try {
      if (window.fetch &&
          !window.fetch.__aegisWrapped) {

        var originalFetch = window.fetch;

        var wrappedFetch = function (input, init) {
          var url = typeof input === 'string'
            ? input
            : (input && input.url) || '';

          if (enabled && isAdUrl(url)) {
            blockedCount++;
            updatePanel();

            return Promise.resolve(
              new Response('', {
                status: 200,
                statusText: 'OK'
              })
            );
          }

          return originalFetch.apply(this, arguments);
        };

        wrappedFetch.__aegisWrapped = true;
        window.fetch = wrappedFetch;
      }
    } catch (e) {}

    try {
      if (window.XMLHttpRequest &&
          !XMLHttpRequest.prototype.__aegisWrapped) {

        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (
          method, url
        ) {
          this.__aegisBlocked =
            !!(enabled && isAdUrl(url));

          if (this.__aegisBlocked) {
            this.__aegisMethod = method;
            return;
          }

          return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function () {
          if (this.__aegisBlocked) {
            blockedCount++;

            var xhr = this;

            setTimeout(function () {
              try {
                Object.defineProperty(xhr, 'readyState', {
                  configurable: true,
                  value: 4
                });

                Object.defineProperty(xhr, 'status', {
                  configurable: true,
                  value: 200
                });

                Object.defineProperty(xhr, 'responseText', {
                  configurable: true,
                  value: ''
                });

                Object.defineProperty(xhr, 'response', {
                  configurable: true,
                  value: ''
                });
              } catch (e) {}

              try {
                if (typeof xhr.onreadystatechange === 'function') {
                  xhr.onreadystatechange();
                }

                if (typeof xhr.onload === 'function') {
                  xhr.onload();
                }
              } catch (e) {}

              try {
                xhr.dispatchEvent(new Event('load'));
                xhr.dispatchEvent(new Event('loadend'));
              } catch (e) {}
            }, 0);

            updatePanel();
            return;
          }

          return originalSend.apply(this, arguments);
        };

        XMLHttpRequest.prototype.__aegisWrapped = true;
      }
    } catch (e) {}
  }

  // 操作パネル
  function createPanel() {
    if (document.getElementById('aegis-shield-root')) {
      return;
    }

    var root = document.createElement('div');
    root.id = 'aegis-shield-root';

    root.innerHTML =
      '<button id="aegis-shield-button" ' +
      'type="button" aria-label="Aegis Ad Shield">盾</button>' +

      '<section id="aegis-shield-panel" ' +
      'style="display:none">' +

        '<div class="aegis-head">' +
          '<strong>Aegis Ad Shield</strong>' +
          '<span>v' + VERSION + '</span>' +
        '</div>' +

        '<div class="aegis-state" id="aegis-state">' +
          '保護中' +
        '</div>' +

        '<div class="aegis-stats">' +
          '<div><b id="aegis-blocked">0</b>' +
          '<small>通信遮断</small></div>' +

          '<div><b id="aegis-hidden">0</b>' +
          '<small>要素非表示</small></div>' +
        '</div>' +

        '<button class="aegis-action" id="aegis-toggle">' +
          '保護を一時停止' +
        '</button>' +

        '<button class="aegis-action secondary" ' +
        'id="aegis-rescan">' +
          'このページを再スキャン' +
        '</button>' +

        '<p class="aegis-last" id="aegis-last">' +
          '起動しました' +
        '</p>' +

      '</section>';

    var css = document.createElement('style');

    css.textContent =
      '#aegis-shield-root{' +
      'position:fixed !important;' +
      'right:14px !important;' +
      'bottom:22px !important;' +
      'z-index:2147483647 !important;' +
      'color:#fff !important;' +
      'font:13px Arial,sans-serif !important;}' +

      '#aegis-shield-button{' +
      'width:48px !important;' +
      'height:48px !important;' +
      'border:0 !important;' +
      'border-radius:50% !important;' +
      'background:#7138c8 !important;' +
      'color:#fff !important;' +
      'font-size:21px !important;' +
      'font-weight:bold !important;' +
      'box-shadow:0 3px 12px #0007 !important;}' +

      '#aegis-shield-panel{' +
      'position:absolute !important;' +
      'right:0 !important;' +
      'bottom:58px !important;' +
      'width:238px !important;' +
      'padding:13px !important;' +
      'border-radius:14px !important;' +
      'background:#211b2d !important;' +
      'box-shadow:0 5px 22px #0008 !important;' +
      'color:#fff !important;}' +

      '#aegis-shield-panel .aegis-head{' +
      'display:flex !important;' +
      'justify-content:space-between !important;' +
      'align-items:center !important;' +
      'margin-bottom:10px !important;}' +

      '#aegis-shield-panel .aegis-head span{' +
      'font-size:10px !important;' +
      'opacity:.65 !important;}' +

      '#aegis-shield-panel .aegis-state{' +
      'padding:7px 9px !important;' +
      'border-radius:8px !important;' +
      'background:#3a2b50 !important;' +
      'margin-bottom:10px !important;}' +

      '#aegis-shield-panel .aegis-stats{' +
      'display:flex !important;' +
      'gap:8px !important;' +
      'margin:8px 0 12px !important;}' +

      '#aegis-shield-panel .aegis-stats div{' +
      'flex:1 !important;' +
      'text-align:center !important;' +
      'padding:8px 4px !important;' +
      'background:#30283d !important;' +
      'border-radius:8px !important;}' +

      '#aegis-shield-panel .aegis-stats b{' +
      'display:block !important;' +
      'font-size:20px !important;}' +

      '#aegis-shield-panel .aegis-stats small{' +
      'font-size:10px !important;' +
      'opacity:.75 !important;}' +

      '#aegis-shield-panel .aegis-action{' +
      'width:100% !important;' +
      'padding:9px !important;' +
      'margin:4px 0 !important;' +
      'border:0 !important;' +
      'border-radius:8px !important;' +
      'background:#7138c8 !important;' +
      'color:#fff !important;' +
      'font-size:12px !important;}' +

      '#aegis-shield-panel .aegis-action.secondary{' +
      'background:#40364f !important;}' +

      '#aegis-shield-panel .aegis-last{' +
      'font-size:10px !important;' +
      'opacity:.7 !important;' +
      'margin:8px 0 0 !important;' +
      'word-break:break-word !important;}';

    root.appendChild(css);

    (document.body || document.documentElement)
      .appendChild(root);

    var button = root.querySelector(
      '#aegis-shield-button'
    );

    var panel = root.querySelector(
      '#aegis-shield-panel'
    );

    button.addEventListener('click', function () {
      panel.style.display =
        panel.style.display === 'none'
          ? 'block'
          : 'none';
    });

    root.querySelector('#aegis-toggle')
      .addEventListener('click', function () {
        enabled = !enabled;

        try {
          localStorage.setItem(
            STORAGE_KEY,
            enabled ? '1' : '0'
          );
        } catch (e) {}

        if (enabled) {
          installNetworkGuards();
          installObserver();
          scan(document);
          log('保護を再開しました');
        } else {
          log('保護を一時停止しました');
        }

        updatePanel();
      });

    root.querySelector('#aegis-rescan')
      .addEventListener('click', function () {
        scan(document);
        log('ページを再スキャンしました');
      });

    updatePanel();
  }

  function updatePanel() {
    var root = document.getElementById(
      'aegis-shield-root'
    );

    if (!root) return;

    var state = root.querySelector('#aegis-state');
    var toggle = root.querySelector('#aegis-toggle');
    var blocked = root.querySelector('#aegis-blocked');
    var hidden = root.querySelector('#aegis-hidden');
    var last = root.querySelector('#aegis-last');

    if (state) {
      state.textContent = enabled
        ? '● 保護中'
        : '○ 一時停止中';
    }

    if (toggle) {
      toggle.textContent = enabled
        ? '保護を一時停止'
        : '保護を再開';
    }

    if (blocked) {
      blocked.textContent = String(blockedCount);
    }

    if (hidden) {
      hidden.textContent = String(hiddenCount);
    }

    if (last) {
      last.textContent = lastAction;
    }
  }

  function start() {
    if (location.protocol !== 'http:' &&
        location.protocol !== 'https:') {
      return;
    }

    installNetworkGuards();
    installObserver();

    var attempts = 0;

    var panelTimer = setInterval(function () {
      attempts++;

      if (document.body || attempts > 30) {
        clearInterval(panelTimer);

        if (document.body) {
          createPanel();
        }

        if (enabled) {
          scan(document);
        }

        log('初期化完了');
      }
    }, 200);
  }

  start();
})();
