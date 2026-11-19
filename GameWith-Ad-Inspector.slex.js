
// ==UserScript==
// @name        GameWith PR Cleaner
// @name:ja     GameWith下部PR広告除去
// @author      ChaiMoca
// @include     https://gamewith.jp/*
// @include     https://*.gamewith.jp/*
// @run-at      document-start
// @version     1.1
// @require     api
// ==/UserScript==

SLEX_addStyle(
  '.gtm-ga4-gdb-imp-event,' +
  'a.gdb-ad-footer-creative {' +
  'display: none !important;' +
  'visibility: hidden !important;' +
  '}'
);
