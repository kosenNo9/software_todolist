/**
 * storage.js
 * localStorageへの読み書きを一元管理するモジュール。
 * 他のモジュールはこのファイルを通じてのみ永続化を行う。
 */

const Storage = (() => {
  const KEYS = {
    TASKS:  'taskflow_tasks',
    LABELS: 'taskflow_labels',
  };

  /** タスク一覧を読み込む。失敗時は空配列を返す */
  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.TASKS)) || [];
    } catch {
      return [];
    }
  }

  /** タスク一覧を保存する */
  function saveTasks(tasks) {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  }

  /** ラベル一覧を読み込む。失敗時はデフォルトラベルを返す */
  function loadLabels() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.LABELS)) || _defaultLabels();
    } catch {
      return _defaultLabels();
    }
  }

  /** ラベル一覧を保存する */
  function saveLabels(labels) {
    localStorage.setItem(KEYS.LABELS, JSON.stringify(labels));
  }

  function _defaultLabels() {
    return ['数学', '物理', '英語', '化学', '情報'];
  }

  return { loadTasks, saveTasks, loadLabels, saveLabels };
})();
