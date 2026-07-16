/**
 * notification.js — setInterval方式（サーバー不要）
 *
 * 役割：
 *  - Chromeが起動している間、1分ごとにタスクの期限をチェック
 *  - 期限が来たらブラウザのNotification APIで直接通知を表示
 *  - Service Worker・サーバー不要
 *
 * 動作条件：
 *  - Chromeが起動していること（タブを閉じていてもChromeが起動中ならOK）
 *  - 通知を「許可」していること
 */

const NotificationManager = (() => {
  const CHECK_INTERVAL_MS = 60 * 1000;

  let _getTasksFn  = null;
  let _saveTasksFn = null;

  async function start(getTasksFn, saveTasksFn) {
    _getTasksFn  = getTasksFn;
    _saveTasksFn = saveTasksFn;

    if (!('Notification' in window)) {
      console.warn('[Notification] このブラウザは通知に対応していません');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Notification] 通知が許可されませんでした');
      return;
    }

    _check();
    setInterval(_check, CHECK_INTERVAL_MS);
    console.info('[Notification] 通知チェック開始（1分ごと）');
  }

  function syncOnTaskChange() { _check(); }
  function cancelTask(_taskId) {}

  function _check() {
    if (!_getTasksFn) return;

    const tasks     = _getTasksFn();
    const now       = Date.now();
    const MINUTE_MS = 60 * 1000;
    const HOUR_MS   = 60 * MINUTE_MS;
    let   changed   = false;

    tasks.forEach(task => {
      if (task.status === 'done') return;

      const dl   = new Date(task.deadline).getTime();
      const diff = dl - now;

      const WARNING_MS = 24 * HOUR_MS;
      if (diff > 0 && diff <= WARNING_MS && diff > WARNING_MS - MINUTE_MS) {
        _notify(`📅 明日が期限です：${task.name}`, `期限：${_fmt(task.deadline)}`, `${task.id}_warning`);
      }

      if (diff <= 0 && diff > -MINUTE_MS && !task.notifiedExpired) {
        _notify(`⚠️ 期限になりました：${task.name}`, `今すぐ取り掛かりましょう！`, `${task.id}_expired`);
        task.notifiedExpired = true;
        changed = true;
      }

      if (diff < 0) {
        const hoursOver = Math.floor(-diff / HOUR_MS);
        if (hoursOver >= 1 && hoursOver <= 24) {
          if ((-diff) % HOUR_MS < MINUTE_MS) {
            _notify(`🔔 まだ未完了です：${task.name}`, `期限から ${hoursOver} 時間が経過しています`, `${task.id}_repeat_${hoursOver}`);
          }
        }
      }
    });

    if (changed && _saveTasksFn) _saveTasksFn(tasks);
  }

  function _notify(title, body, tag) {
    new Notification(title, { body, tag, renotify: true });
  }

  function _fmt(dt) {
    const d = new Date(dt);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return { start, syncOnTaskChange, cancelTask };
})();