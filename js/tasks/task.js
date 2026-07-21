/**
 * task.js
 * タスクのCRUD操作とバリデーションを担当するモジュール。
 * DOMには触れず、データ操作のみを行う。
 */

const TaskManager = (() => {
  /* ---------- バリデーション ---------- */

  /**
   * タスクデータを検証し、エラーメッセージの配列を返す。
   * エラーがなければ空配列を返す。
   * 追加：期限設定をしていない場合に加えて五桁以上の年数を打ち込んだ場合にエラーメッセージの配列を返す。
   */
  function validate({ name, detail, deadline }) {
    const errors = [];
    if (!name || name.trim().length === 0)   errors.push('タスク名を入力してください');
    if (name && name.trim().length > 30)      errors.push('タスク名は30文字以内です');
    if (detail && detail.length > 100)        errors.push('詳細は100文字以内です');
    if (!deadline){
      errors.push('期限を設定してください');
    }else if(isNaN(new Date(deadline).getTime())){
      errors.push('正しい日時を入力してください')
    }
    return errors;
  }

  /* ---------- 生成 ---------- */

  /** 新規タスクオブジェクトを生成して tasks 配列の先頭に追加し、保存する */
  function create(tasks, { name, detail, deadline, type, label }) {
    const task = {
      id:        Date.now().toString(),
      name:      name.trim(),
      detail:    detail.trim(),
      deadline,
      type,
      label,
      status:    'todo',
      createdAt: new Date().toISOString(),
      notified:  false,
    };
    const updated = [task, ...tasks];
    Storage.saveTasks(updated);
    return updated;
  }

  /* ---------- 更新 ---------- */

  /** 指定 id のタスクを fields で上書きして保存する */
  function update(tasks, id, fields) {
    const updated = tasks.map(t => t.id === id ? { ...t, ...fields } : t);
    Storage.saveTasks(updated);
    return updated;
  }

  /** 指定 id のタスクのステータスだけを変更して保存する */
  function changeStatus(tasks, id, status) {
    return update(tasks, id, { status });
  }

  /* ---------- 削除 ---------- */

  /** 指定 id のタスクを削除して保存する */
  function remove(tasks, id) {
    const updated = tasks.filter(t => t.id !== id);
    Storage.saveTasks(updated);
    return updated;
  }

  /* ---------- 検索 ---------- */

  /** id でタスクを取得する。存在しなければ null を返す */
  function findById(tasks, id) {
    return tasks.find(t => t.id === id) ?? null;
  }

  return { validate, create, update, changeStatus, remove, findById };
})();
