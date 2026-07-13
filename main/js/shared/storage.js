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

  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.TASKS)) || [];
    } catch {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  }

  function loadLabels() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.LABELS)) || _defaultLabels();
    } catch {
      return _defaultLabels();
    }
  }

  function saveLabels(labels) {
    localStorage.setItem(KEYS.LABELS, JSON.stringify(labels));
  }

  function _defaultLabels() {
    return ['数学', '物理', '英語', '化学', '情報'];
  }

  return { loadTasks, saveTasks, loadLabels, saveLabels };
})();
