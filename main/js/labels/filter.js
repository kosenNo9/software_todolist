/**
 * filter.js
 * タスク一覧のステータスフィルタ・ラベルフィルタの状態管理と絞り込みロジック。
 * DOMイベントの登録は main.js から行い、このモジュールは純粋な状態＋ロジックのみを持つ。
 */

const Filter = (() => {
  /* ---------- 状態 ---------- */
  let currentStatus = 'all';     // 'all' | 'todo' | 'doing' | 'done'
  let selectedLabels = [];       // string[]
  let selectedTypes = [];        // string[]  '課題' | 'テスト'

  /* ---------- ステータスフィルタ ---------- */

  function setStatus(status) {
    currentStatus = status;
  }

  function getStatus() {
    return currentStatus;
  }

  /* ---------- ラベルフィルタ ---------- */

  function toggleLabel(label) {
    if (selectedLabels.includes(label)) {
      selectedLabels = selectedLabels.filter(l => l !== label);
    } else {
      selectedLabels = [...selectedLabels, label];
    }
  }

  function clearLabels() {
    selectedLabels = [];
  }

  function getSelectedLabels() {
    return [...selectedLabels];
  }

  function hasLabelFilter() {
    return selectedLabels.length > 0;
  }

  /* ---------- 種類フィルタ ---------- */

  function toggleType(type) {
    if (selectedTypes.includes(type)) {
      selectedTypes = selectedTypes.filter(t => t !== type);
    } else {
      selectedTypes = [...selectedTypes, type];
    }
  }

  function clearTypes() {
    selectedTypes = [];
  }

  function getSelectedTypes() {
    return [...selectedTypes];
  }

  function hasTypeFilter() {
    return selectedTypes.length > 0;
  }

  /* ---------- 絞り込み ---------- */

  /**
   * tasks 配列に現在のステータス・ラベルフィルタを適用して返す。
   * 元の配列は変更しない。
   */
  function apply(tasks) {
    let result = tasks;
    if (currentStatus !== 'all') {
      result = result.filter(t => t.status === currentStatus);
    }
    if (selectedLabels.length > 0) {
      result = result.filter(t => selectedLabels.includes(t.label));
    }
    if (selectedTypes.length > 0) {
      result = result.filter(t => selectedTypes.includes(t.type));
    }
    return result;
  }

  return {
    setStatus, getStatus,
    toggleLabel, clearLabels, getSelectedLabels, hasLabelFilter,
    toggleType, clearTypes, getSelectedTypes, hasTypeFilter,
    apply,
  };
})();