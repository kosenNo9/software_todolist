/**
 * notification.js
 * ブラウザ通知（Notification API）の権限取得・送信・定期チェックを担当するモジュール。
 * タスクデータは getter 関数経由で取得することで、常に最新状態を参照する。
 */

const NotificationManager = (() => {
  const INTERVAL_MS = 60 * 60 * 1000; // 1時間

  /**
   * 通知の定期チェックを開始する。
   * @param {() => object[]} getTasksFn - 最新タスク配列を返す関数
   * @param {(tasks: object[]) => void} saveTasksFn - tasks を保存する関数
   */
  async function start(getTasksFn, saveTasksFn) {
    if (!('Notification' in window)) return;

    await _requestPermission();
    _check(getTasksFn, saveTasksFn);
    setInterval(() => _check(getTasksFn, saveTasksFn), INTERVAL_MS);
  }

  /* ---------- 内部関数 ---------- */

  async function _requestPermission() {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  function _check(getTasksFn, saveTasksFn) {
    if (Notification.permission !== 'granted') return;

    const tasks = getTasksFn();
    const now   = Date.now();
    let changed  = false;

    tasks.forEach(task => {
      if (task.status === 'done') return;

      const dl   = new Date(task.deadline).getTime();
      const diff = dl - now;

      // 期限切れかつ未通知
      if (diff < 0 && !task.notified) {
        _send(`⚠️ 期限切れ: ${task.name}`, `期限: ${_fmt(task.deadline)}`);
        task.notified = true;
        changed = true;
      }

      // 24時間以内
      if (diff > 0 && diff < 86400000) {
        _send(`📅 期限が近づいています: ${task.name}`, `残り ${_timeLeft(diff)}`);
      }
    });

    if (changed) saveTasksFn(tasks);
  }

  function _send(title, body) {
    new Notification(title, { body });
  }

  function _fmt(dt) {
    const d = new Date(dt);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function _timeLeft(diff) {
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days  > 0) return `${days}日 ${hours}時間`;
    if (hours > 0) return `${hours}時間`;
    return `${Math.floor((diff % 3600000) / 60000)}分`;
  }

  return { start };
})();
