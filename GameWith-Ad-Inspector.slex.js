
// ==UserScript==
// @name        GameWith PR Cleaner
// @name:ja     GameWith下部PR広告除去
// @author      ChaiMoca
// @description Hide GameWith bottom overlay advertisement.
// @description:ja GameWithの下部固定PR広告を非表示にします。
// @include     https://gamewith.jp/*
// @include     https://*.gamewith.jp/*
// @version     1.0
// @require     api
// ==/UserScript==

SLEX_addStyle(
  '.gtm-ga4-gdb-imp-event,' +
  'a.gdb-ad-footer-creative {' +
  'display: none !important;' +
  'visibility: hidden !important;' +
  '}'
);
