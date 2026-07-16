/**
 * label.js
 * ラベルのCRUD操作とバリデーションを担当するモジュール。
 * DOMには触れず、データ操作のみを行う。
 */

const LabelManager = (() => {
  /* ---------- バリデーション ---------- */

  /**
   * ラベル名を検証し、エラーメッセージの配列を返す。
   * エラーがなければ空配列を返す。
   */
  function validate(name, existingLabels) {
    const errors = [];
    if (!name || name.trim().length === 0) errors.push('ラベル名を入力してください');
    if (name && name.trim().length > 30)   errors.push('ラベルは30文字以内です');
    if (existingLabels.includes(name.trim())) errors.push('同じラベルが既にあります');
    return errors;
  }

  /* ---------- 追加 ---------- */

  /** ラベルを追加して保存し、更新後の配列を返す */
  function add(labels, name) {
    const updated = [...labels, name.trim()];
    Storage.saveLabels(updated);
    return updated;
  }

  /* ---------- 削除 ---------- */

  /** 指定ラベルを削除して保存し、更新後の配列を返す */
  function remove(labels, name) {
    const updated = labels.filter(l => l !== name);
    Storage.saveLabels(updated);
    return updated;
  }

  return { validate, add, remove };
})();
