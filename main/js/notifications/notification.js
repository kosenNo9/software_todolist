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
  const CHECK_INTERVAL_MS = 60 * 1000; // 1分ごとにチェック

  let _getTasksFn  = null;
  let _saveTasksFn = null;
  let _timerId     = null;

  /* ===========================
     公開 API
  =========================== */

  /**
   * 初期化：通知許可を取得して定期チェックを開始する
   * @param {() => object[]} getTasksFn   - 最新タスク配列を返す関数
   * @param {(tasks) => void} saveTasksFn - タスクを保存する関数（notifiedフラグ更新用）
   */
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

    // 起動直後に1回チェック
    _check();

    // 以降1分ごとにチェック
    _timerId = setInterval(_check, CHECK_INTERVAL_MS);
    console.info('[Notification] 通知チェック開始（1分ごと）');
  }

  /**
   * タスク追加・更新後に呼ぶ（即時チェックで通知漏れを防ぐ）
   */
  function syncOnTaskChange() {
    _check();
  }

  /**
   * タスク削除・完了時に呼ぶ（インターフェース互換のため残す）
   */
  function cancelTask(_taskId) {
    // setInterval方式はタスク単位のキャンセル不要
    // 次の_check()で自動的にスキップされる
  }

  /* ===========================
     内部関数
  =========================== */

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

      /* --- 24時間前警告（±1分の誤差を許容） --- */
      const WARNING_MS = 24 * HOUR_MS;
      if (diff > 0 && diff <= WARNING_MS && diff > WARNING_MS - MINUTE_MS) {
        _notify(
          `📅 明日が期限です：${task.name}`,
          `期限：${_fmt(task.deadline)}　ラベル：${task.label || 'なし'}`,
          `${task.id}_warning`
        );
      }

      /* --- 期限ちょうど（±1分の誤差を許容） --- */
      if (diff <= 0 && diff > -MINUTE_MS && !task.notifiedExpired) {
        _notify(
          `⚠️ 期限になりました：${task.name}`,
          `今すぐ取り掛かりましょう！`,
          `${task.id}_expired`
        );
        task.notifiedExpired = true;
        changed = true;
      }

      /* --- 期限切れ後1時間ごと（最大24回） --- */
      if (diff < 0) {
        const hoursOver = Math.floor(-diff / HOUR_MS);
        if (hoursOver >= 1 && hoursOver <= 24) {
          const remainder = (-diff) % HOUR_MS;
          if (remainder < MINUTE_MS) {
            _notify(
              `🔔 まだ未完了です：${task.name}`,
              `期限から ${hoursOver} 時間が経過しています`,
              `${task.id}_repeat_${hoursOver}`
            );
          }
        }
      }
    });

    // notifiedExpiredフラグが更新された場合は保存
    if (changed && _saveTasksFn) {
      _saveTasksFn(tasks);
    }
  }

  /**
   * ブラウザ通知を表示する
   * @param {string} title
   * @param {string} body
   * @param {string} tag   - 同じtagは上書き（重複防止）
   */
  function _notify(title, body, tag) {
    new Notification(title, { body, tag, renotify: true });
  }

  function _fmt(dt) {
    const d   = new Date(dt);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return { start, syncOnTaskChange, cancelTask };
})();
