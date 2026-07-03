/**
 * main.js
 * アプリの初期化とイベント結線のみを担当するエントリポイント。
 * ビジネスロジックはtask.js / label.js / filter.js、
 * DOM描画はui.js、永続化はstorage.js、通知はnotification.js に委譲する。
 */

/* ===========================
   アプリ状態
=========================== */
let tasks         = [];
let labels        = [];
let currentTaskId = null;
let editBackup    = null;

/* ===========================
   初期化
=========================== */
document.addEventListener('DOMContentLoaded', () => {
  tasks  = Storage.loadTasks();
  labels = Storage.loadLabels();

  _refreshList();
  UI.syncLabelSelects(labels);
  UI.renderLabelChips(labels, _handleDeleteLabel);
  UI.renderLabelFilterList(labels, Filter.getSelectedLabels(), _handleLabelFilterToggle);
  UI.updateStat(tasks.length);

  // 通知開始（タスク getter を渡すだけ。保存は task.js / storage.js が担う）
  NotificationManager.start(() => tasks);

  // グローバルクリック（ドロップダウンを閉じる）
  document.addEventListener('click', e => {
    const wrap = document.querySelector('.label-filter-wrap');
    if (wrap && !wrap.contains(e.target)) UI.closeLabelDropdown();
  });
});

/* ===========================
   画面遷移
=========================== */
function showView(viewId) {
  if (viewId === 'add-task') UI.resetAddForm(labels);
  if (viewId === 'add-label') UI.renderLabelChips(labels, _handleDeleteLabel);
  if (viewId === 'list') _refreshList();
  UI.showView(viewId);
}

/* ===========================
   タスク登録
=========================== */
function registerTask() {
  const values = UI.getAddFormValues();
  const errors = TaskManager.validate(values);
  if (errors.length > 0) return UI.showToast(errors[0], 'error');

  tasks = TaskManager.create(tasks, values);
  UI.showToast('タスクを登録しました ✓', 'success');
  UI.updateStat(tasks.length);

  // 新タスクの通知スケジュールを SW に反映
  NotificationManager.syncOnTaskChange();

  showView('list');
}

function cancelForm() {
  UI.resetAddForm(labels);
  showView('list');
}

/* ===========================
   タスク一覧
=========================== */
function _refreshList() {
  const filtered = Filter.apply(tasks);
  UI.renderTaskList(filtered, showDetail);
  UI.updateStat(tasks.length);
}

/* ===========================
   ステータスフィルタ
=========================== */
function filterStatus(status) {
  Filter.setStatus(status);
  UI.updateStatusTabs(status);
  _refreshList();
}

/* ===========================
   ラベルフィルタ
=========================== */
function toggleLabelFilter() {
  UI.toggleLabelDropdown();
}

function _handleLabelFilterToggle(label, checked) {
  Filter.toggleLabel(label);
  UI.updateFilterButton(Filter.hasLabelFilter());
  _refreshList();
}

function clearLabelFilter() {
  Filter.clearLabels();
  UI.updateFilterButton(false);
  UI.closeLabelDropdown();
  UI.renderLabelFilterList(labels, [], _handleLabelFilterToggle);
  _refreshList();
}

/* ===========================
   詳細画面
=========================== */
function showDetail(id) {
  currentTaskId = id;
  const task = TaskManager.findById(tasks, id);
  if (!task) return;
  UI.renderDetail(task, _handleStatusChange);
  UI.showView('detail');
}

function _handleStatusChange(id, status) {
  tasks = TaskManager.changeStatus(tasks, id, status);
  UI.showToast('ステータスを更新しました', 'success');

  // 完了になった場合はそのタスクの通知をキャンセル
  if (status === 'done') {
    NotificationManager.cancelTask(id);
  } else {
    NotificationManager.syncOnTaskChange();
  }

  showDetail(id);
}

/* ===========================
   編集画面
=========================== */
function showEditView(id) {
  const task = TaskManager.findById(tasks, id);
  if (!task) return;
  editBackup = JSON.parse(JSON.stringify(task));
  UI.populateEditForm(task, labels);
  UI.showView('edit');
}

function updateTask() {
  const values = UI.getEditFormValues();
  const errors = TaskManager.validate(values);
  if (errors.length > 0) return UI.showToast(errors[0], 'error');

  tasks = TaskManager.update(tasks, currentTaskId, values);
  UI.showToast('タスクを更新しました ✓', 'success');

  // 期限などが変わった可能性があるので再同期
  NotificationManager.syncOnTaskChange();

  showDetail(currentTaskId);
}

function cancelEdit() {
  if (editBackup) {
    tasks = TaskManager.update(tasks, editBackup.id, editBackup);
    editBackup = null;
  }
  showDetail(currentTaskId);
}

/* ===========================
   タスク削除
=========================== */
function confirmDelete(id) {
  currentTaskId = id;
  UI.showConfirmModal();
}

function deleteTask() {
  // 削除前に通知キャンセル
  NotificationManager.cancelTask(currentTaskId);

  tasks = TaskManager.remove(tasks, currentTaskId);
  UI.closeConfirmModal();
  UI.showToast('タスクを削除しました', 'success');
  UI.updateStat(tasks.length);
  showView('list');
}

function closeModal() {
  UI.closeConfirmModal();
}

/* ===========================
   ラベル管理
=========================== */
function addLabel() {
  const input  = document.getElementById('new-label-input');
  const name   = input.value.trim();
  const errors = LabelManager.validate(name, labels);
  if (errors.length > 0) return UI.showToast(errors[0], 'error');

  labels = LabelManager.add(labels, name);
  input.value = '';
  document.getElementById('count-label').textContent = '0';
  _afterLabelChange();
  UI.showToast('ラベルを追加しました ✓', 'success');
}

function _handleDeleteLabel(label) {
  labels = LabelManager.remove(labels, label);
  _afterLabelChange();
}

function _afterLabelChange() {
  UI.renderLabelChips(labels, _handleDeleteLabel);
  UI.syncLabelSelects(labels);
  UI.renderLabelFilterList(labels, Filter.getSelectedLabels(), _handleLabelFilterToggle);
}

/* ===========================
   文字数カウンタ（HTMLから直呼び出し）
=========================== */
function updateCharCount(inputId, countId) {
  UI.updateCharCount(inputId, countId);
}