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
    const DAY_MS    = 24 * HOUR_MS;
    let   changed   = false;

    tasks.forEach(task => {
      if (task.status === 'done') return;

      const dl    = new Date(task.deadline).getTime();
      const st    = task.start ? new Date(task.start).getTime() : null;
      const diffDl = dl - now;
      const diffSt = st ? st - now : null;

      /* --- 期限1日前（未着手・進行中） --- */
      if (diffDl > 0 && diffDl <= DAY_MS && diffDl > DAY_MS - MINUTE_MS) {
        _notify(
          `${task.name}　明日が期限です`,
          `期限：${_fmt(task.deadline)}`,
          `${task.id}_deadline_warning`
        );
      }

      /* --- 開始時刻の通知（未着手のみ） --- */
      if (task.status === 'todo' && diffSt !== null) {

        /* 開始1日前 */
        if (diffSt > 0 && diffSt <= DAY_MS && diffSt > DAY_MS - MINUTE_MS) {
          _notify(
            `${task.name} 明日から開始です`,
            `開始：${_fmt(task.start)}`,
            `${task.id}_start_day`
          );
        }

      /* 開始1時間前 */
      if (diffSt > 0 && diffSt <= HOUR_MS && diffSt > HOUR_MS - MINUTE_MS) {
        _notify(
          `${task.name} 1時間後から開始です`,
          `開始：${_fmt(task.start)}`,
          `${task.id}_start_hour`
        );
      }

      /* 開始時刻ちょうど */
      if (diffSt <= 0 && diffSt > -MINUTE_MS) {
        _notify(
          `${task.name} 今から開始です`,
          `開始：${_fmt(task.start)}`,
          `${task.id}_start_now`
        );
      }

      /* 開始時刻超過後1時間ごと（期限まで） */
      if (diffSt < 0 && diffDl > 0) {
        const hoursOver = Math.floor(-diffSt / HOUR_MS);
        if (hoursOver >= 1 && (-diffSt) % HOUR_MS < MINUTE_MS) {
          _notify(
            `${task.name} 開始時刻を${hoursOver}時間すぎています、速やかに取り掛かってください`,
            `開始：${_fmt(task.start)} 期限：${_fmt(task.deadline)}`,
            `${task.id}_start_over_${hoursOver}`
          );
        }
      }
    }

    if (changed && _saveTasksFn) _saveTasksFn(tasks);
  });

  if (changed && _saveTasksFn) _saveTasksFn(tasks);
}

  let _notifyQueue = [];
  let _notifyTimer = null;

  function _notify(title, body, tag) {
    _notifyQueue.push({ title, body, tag });
    if (_notifyTimer) return;
    _notifyTimer = setInterval(() => {
      if (_notifyQueue.length === 0) {
        clearInterval(_notifyTimer);
        _notifyTimer = null;
        return;
      }
      const { title, body, tag } = _notifyQueue.shift();
      new Notification(title, { body, tag, renotify: true });
    }, 500);
  }

  function _fmt(dt) {
    const d = new Date(dt);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return { start, syncOnTaskChange, cancelTask };
})();