/**
 * sw.js — 最小構成
 *
 * setInterval方式では Service Worker は通知に関与しない。
 * このファイルはインストール・アクティベートのみ行う。
 * （将来Push API方式に切り替える場合に備えて残しておく）
 */

'use strict';

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));
