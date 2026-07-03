/**
 * notification.js — 本番用
 *
 * 役割：
 *  - Service Worker（sw.js）の登録・管理
 *  - タスクデータの変化を検知し、通知スケジュールを SW に同期する
 *  - 通知許可の取得
 *
 * SW との通信プロトコル（postMessage）：
 *  SYNC_TASKS  { type, tasks }        … タスク一覧を同期（起動時・更新時）
 *  CANCEL_TASK { type, taskId }       … 削除・完了時に特定タスクをキャンセル
 *  RESET_ALL   { type }               … 全スケジュールをリセット
 */

const NotificationManager = (() => {
  const SW_PATH    = 'sw.js';   // index.html と同階層に置く
  const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1時間ごとに再同期

  let _swRegistration = null;  // ServiceWorkerRegistration
  let _getTasksFn     = null;  // main.js から渡される最新タスク getter

  /* ===========================
     公開 API
  =========================== */

  /**
   * 初期化：SW 登録 → 許可取得 → 初回同期 → 定期同期
   * @param {() => object[]} getTasksFn - 最新タスク配列を返す関数
   */
  async function start(getTasksFn) {
    _getTasksFn = getTasksFn;

    if (!_isSupported()) {
      console.warn('[Notification] Service Worker / Notification API 非対応');
      return;
    }

    const permission = await _requestPermission();
    if (permission !== 'granted') {
      console.warn('[Notification] 通知が許可されませんでした');
      return;
    }

    try {
      _swRegistration = await navigator.serviceWorker.register(SW_PATH);
      console.info('[Notification] SW 登録完了');

      // SW がアクティブになるのを待ってから同期
      await navigator.serviceWorker.ready;
      _syncAll();

      // 定期再同期（タブを開いている間）
      setInterval(_syncAll, SYNC_INTERVAL_MS);

    } catch (err) {
      console.error('[Notification] SW 登録失敗:', err);
    }
  }

  /**
   * タスクの追加・更新後に呼ぶ。
   * SW に最新タスク一覧を再送信してスケジュールを更新する。
   */
  function syncOnTaskChange() {
    if (_isReady()) _syncAll();
  }

  /**
   * タスク削除・完了時に呼ぶ。
   * 対象タスクの通知スケジュールだけをキャンセルする。
   * @param {string} taskId
   */
  function cancelTask(taskId) {
    if (_isReady()) {
      _postMessage({ type: 'CANCEL_TASK', taskId });
    }
  }

  /* ===========================
     内部関数
  =========================== */

  function _isSupported() {
    return ('serviceWorker' in navigator) && ('Notification' in window);
  }

  function _isReady() {
    return _swRegistration && _swRegistration.active;
  }

  async function _requestPermission() {
    if (Notification.permission !== 'default') return Notification.permission;
    return await Notification.requestPermission();
  }

  /** 最新タスクを SW に送信してスケジュールを同期する */
  function _syncAll() {
    if (!_isReady() || !_getTasksFn) return;
    const tasks = _getTasksFn();
    _postMessage({ type: 'SYNC_TASKS', tasks });
  }

  /** SW の active worker にメッセージを送る */
  function _postMessage(message) {
    try {
      _swRegistration.active.postMessage(message);
    } catch (err) {
      console.error('[Notification] postMessage 失敗:', err);
    }
  }

  return { start, syncOnTaskChange, cancelTask };
})();