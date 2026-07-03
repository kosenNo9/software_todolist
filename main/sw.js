/**
 * sw.js — Service Worker（本番用）
 *
 * 役割：
 *  1. notification.js からタスクリストを受け取り、通知スケジュールを管理する
 *  2. ブラウザタブが閉じていても OS ネイティブ通知を発火する
 *  3. 通知クリック時にアプリを前面に出す
 *
 * 通知ロジック（notification.js 側と役割分担）：
 *  - notification.js … タスクデータの解釈・通知すべき内容の決定・SW への送信
 *  - sw.js          … 受け取ったスケジュールを setTimeout で保持し、OS へ発火
 */

'use strict';

/* ===========================
   状態：スケジュール済みの通知タイマーを管理
   key: taskId_type（例: "1234567890_deadline"）
   value: setTimeout の戻り値
=========================== */
const scheduledTimers = new Map();

/* ===========================
   インストール・アクティベート
=========================== */
self.addEventListener('install', () => {
  // 古い SW を待たずに即アクティベート
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 現在開いているすべてのクライアント（タブ）を即座に制御下に置く
  event.waitUntil(self.clients.claim());
});

/* ===========================
   メインスレッド（notification.js）からのメッセージ受信
=========================== */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  switch (data.type) {

    // タスク一覧を受け取り、各タスクの通知をスケジュールする
    case 'SYNC_TASKS':
      _syncSchedules(data.tasks);
      break;

    // 特定タスクの通知スケジュールをキャンセルする（削除・完了時）
    case 'CANCEL_TASK':
      _cancelTask(data.taskId);
      break;

    // 全スケジュールをリセットする
    case 'RESET_ALL':
      _resetAll();
      break;
  }
});

/* ===========================
   通知クリック：アプリタブをフォーカス or 新規開く
=========================== */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 既に開いているタブがあればフォーカス
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        // なければ新しいタブで開く
        if (self.clients.openWindow) {
          return self.clients.openWindow('./');
        }
      })
  );
});

/* ===========================
   内部関数：スケジュール同期
=========================== */

/**
 * タスク配列を受け取り、必要な通知をスケジュールする。
 * 既存スケジュールとの差分を取り、不要なものはキャンセル。
 *
 * @param {object[]} tasks
 */
function _syncSchedules(tasks) {
  // 受け取ったタスクIDセットを作成（完了タスクは除外）
  const activetaskIds = new Set(
    tasks.filter(t => t.status !== 'done').map(t => t.id)
  );

  // 削除・完了済みタスクのタイマーをキャンセル
  for (const key of scheduledTimers.keys()) {
    const taskId = key.split('_')[0];
    if (!activetaskIds.has(taskId)) {
      _cancelTimer(key);
    }
  }

  // 各タスクの通知をスケジュール
  tasks.forEach(task => {
    if (task.status === 'done') return;
    _scheduleTaskNotifications(task);
  });
}

/**
 * 1タスクについて、必要な通知をすべてスケジュールする。
 *
 * 通知の種類：
 *  - deadline_warning : 期限24時間前
 *  - deadline_expired : 期限切れ（未通知かつ未着手/進行中の場合のみ）
 *  - overdue_repeat   : 期限切れ後、1時間ごとの繰り返し（最大24回）
 *
 * @param {object} task
 */
function _scheduleTaskNotifications(task) {
  const now = Date.now();
  const dl  = new Date(task.deadline).getTime();
  const diff = dl - now;

  /* --- 24時間前警告 --- */
  const warningKey = `${task.id}_warning`;
  const warningTime = dl - 24 * 60 * 60 * 1000; // 期限の24時間前
  if (!scheduledTimers.has(warningKey) && warningTime > now) {
    const delay = warningTime - now;
    _setTimer(warningKey, delay, {
      title: `📅 明日が期限です：${task.name}`,
      body:  `期限：${_fmt(task.deadline)}　ラベル：${task.label || 'なし'}`,
      tag:   warningKey,
    });
  }

  /* --- 期限切れ通知（初回） --- */
  const expiredKey = `${task.id}_expired`;
  if (!scheduledTimers.has(expiredKey)) {
    if (diff > 0) {
      // まだ期限前 → 期限ちょうどに発火
      _setTimer(expiredKey, diff, {
        title: `⚠️ 期限になりました：${task.name}`,
        body:  `期限：${_fmt(task.deadline)}　今すぐ取り掛かりましょう！`,
        tag:   expiredKey,
      });
    } else if (!task.notified) {
      // 既に期限切れ・まだ通知していない → 即時発火
      _setTimer(expiredKey, 0, {
        title: `🚨 期限切れ：${task.name}`,
        body:  `期限：${_fmt(task.deadline)}　早急に対応してください`,
        tag:   expiredKey,
      });
    }
  }

  /* --- 期限切れ後の繰り返し通知（1時間ごと・最大24回） --- */
  const HOUR = 60 * 60 * 1000;
  const MAX_REPEATS = 24;

  for (let i = 1; i <= MAX_REPEATS; i++) {
    const repeatKey  = `${task.id}_repeat_${i}`;
    const repeatTime = dl + i * HOUR; // 期限の i 時間後
    if (!scheduledTimers.has(repeatKey) && repeatTime > now) {
      const delay = repeatTime - now;
      _setTimer(repeatKey, delay, {
        title: `🔔 まだ未完了です：${task.name}`,
        body:  `期限から ${i} 時間が経過しています`,
        tag:   repeatKey,
      });
    }
  }
}

/* ===========================
   内部関数：タイマー管理
=========================== */

/**
 * setTimeout をセットし、発火時に OS 通知を表示する。
 * @param {string} key    - scheduledTimers のキー
 * @param {number} delay  - 発火までのミリ秒
 * @param {object} payload - { title, body, tag }
 */
function _setTimer(key, delay, payload) {
  const timerId = setTimeout(() => {
    scheduledTimers.delete(key);
    self.registration.showNotification(payload.title, {
      body:              payload.body,
      tag:               payload.tag,   // 同じ tag は上書き（重複防止）
      renotify:          true,
      requireInteraction: false,
    });
  }, delay);

  scheduledTimers.set(key, timerId);
}

/** 特定タスクのタイマーをすべてキャンセル */
function _cancelTask(taskId) {
  for (const key of scheduledTimers.keys()) {
    if (key.startsWith(taskId + '_')) {
      _cancelTimer(key);
    }
  }
}

/** 1タイマーをキャンセルして Map から削除 */
function _cancelTimer(key) {
  clearTimeout(scheduledTimers.get(key));
  scheduledTimers.delete(key);
}

/** 全タイマーをキャンセル */
function _resetAll() {
  for (const key of scheduledTimers.keys()) {
    clearTimeout(scheduledTimers.get(key));
  }
  scheduledTimers.clear();
}

/* ===========================
   ユーティリティ
=========================== */
function _fmt(dt) {
  const d   = new Date(dt);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}