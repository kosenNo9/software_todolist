/**
 * ui.js
 * DOM描画・画面遷移・トーストなど、すべてのUI操作を担当するモジュール。
 * データの変更はせず、受け取ったデータを表示するだけにとどめる。
 */

const UI = (() => {
  /* ===========================
     ユーティリティ
  =========================== */

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return String(s).replace(/'/g, "\\'");
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatDeadline(dt) {
    if (!dt) return '未設定';
    const d = new Date(dt);
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
  }

  function timeLeftStr(diff) {
    if (diff < 0) return '期限切れ';
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days  > 0) return `残り ${days}日 ${hours}時間`;
    if (hours > 0) return `残り ${hours}時間`;
    return `残り ${Math.floor((diff % 3600000) / 60000)}分`;
  }

  function statusLabel(s) {
    return { todo: '未着手', doing: '進行中', done: '完了' }[s] || s;
  }

  /* ===========================
     画面遷移
  =========================== */

  /**
   * 指定した viewId の画面を表示し、サイドバーのアクティブ状態を更新する。
   * @param {string} viewId - 'list' | 'add-task' | 'detail' | 'edit' | 'add-label'
   */
  function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.view === viewId);
    });
  }

  /* ===========================
     タスク一覧
  =========================== */

  /**
   * フィルタ済みタスク配列をカードグリッドに描画する。
   * @param {object[]} filteredTasks
   * @param {Function} onCardClick - (taskId: string) => void
   */
  function renderTaskList(filteredTasks, onCardClick) {
    const container = document.getElementById('task-list');
    const empty     = document.getElementById('empty-state');
    container.innerHTML = '';

    if (filteredTasks.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    filteredTasks.forEach(task => {
      const card = _buildTaskCard(task);
      card.addEventListener('click', () => onCardClick(task.id));
      container.appendChild(card);
    });
  }

  function _buildTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card status-${task.status}`;

    // urgency bar
    const bar  = document.createElement('div');
    bar.className = 'urgency-bar';
    const now  = Date.now();
    const dl   = new Date(task.deadline).getTime();
    const diff = dl - now;
    if (task.status !== 'done') {
      const total = dl - new Date(task.createdAt).getTime();
      const pct   = total > 0 ? Math.min(100, Math.max(0, ((total - diff) / total) * 100)) : 100;
      bar.style.width = pct + '%';
      if (diff < 0)           bar.classList.add('urgent');
      else if (diff < 86400000 * 3) bar.classList.add('warning');
    } else {
      bar.style.width = '100%';
      bar.style.background = 'var(--green)';
    }

    const dlClass   = diff < 0 ? 'overdue' : diff < 86400000 * 3 ? 'near' : '';
    const timeLeft  = task.status !== 'done' ? timeLeftStr(diff) : '完了';
    const labelHtml = task.label
      ? `🏷️ ${escHtml(task.label)}`
      : `<span style="color:var(--border)">ラベルなし</span>`;

    card.innerHTML = `
      <div class="card-top">
        <div class="card-title">${escHtml(task.name)}</div>
        <span class="card-type-badge type-${task.type}">${task.type}</span>
      </div>
      <div class="card-label">${labelHtml}</div>
      <div class="card-deadline ${dlClass}">📅 ${formatDeadline(task.deadline)}</div>
      <div class="card-footer">
        <span class="status-badge badge-${task.status}">${statusLabel(task.status)}</span>
        <span class="card-time-left">${timeLeft}</span>
      </div>
    `;
    card.prepend(bar);
    return card;
  }

  /* ===========================
     ステータスタブ
  =========================== */

  function updateStatusTabs(activeStatus) {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.status === activeStatus);
    });
  }

  /* ===========================
     ラベルフィルタドロップダウン
  =========================== */

  /**
   * 種類フィルタ（課題／テスト）のチェックリストを再描画する。
   * @param {string[]} selectedTypes - 選択中の種類
   * @param {Function} onToggle      - (type: string, checked: boolean) => void
   */
  function renderTypeFilterList(selectedTypes, onToggle) {
    const container = document.getElementById('type-filter-list');
    container.innerHTML = '';
    ['課題', 'テスト'].forEach(type => {
      const isSelected = selectedTypes.includes(type);
      const item = document.createElement('label');
      item.className = 'label-filter-item' + (isSelected ? ' selected' : '');
      const icon = type === '課題' ? '📝' : '📖';
      item.innerHTML = `<input type="checkbox" ${isSelected ? 'checked' : ''}> ${icon} ${escHtml(type)}`;
      item.querySelector('input').addEventListener('change', e => {
        item.classList.toggle('selected', e.target.checked);
        onToggle(type, e.target.checked);
      });
      container.appendChild(item);
    });
  }

  /**
   * ラベルフィルタのチェックリストを再描画する。
   * @param {string[]} labels        - 全ラベル一覧
   * @param {string[]} selectedLabels - 選択中のラベル
   * @param {Function} onToggle      - (label: string, checked: boolean) => void
   */
  function renderLabelFilterList(labels, selectedLabels, onToggle) {
    const container = document.getElementById('label-filter-list');
    container.innerHTML = '';
    labels.forEach(label => {
      const isSelected = selectedLabels.includes(label);
      const item = document.createElement('label');
      item.className = 'label-filter-item' + (isSelected ? ' selected' : '');
      item.innerHTML = `<input type="checkbox" ${isSelected ? 'checked' : ''}> ${escHtml(label)}`;
      item.querySelector('input').addEventListener('change', e => {
        item.classList.toggle('selected', e.target.checked);
        onToggle(label, e.target.checked);
      });
      container.appendChild(item);
    });
  }

  function toggleLabelDropdown() {
    document.getElementById('label-filter-dropdown').classList.toggle('hidden');
  }

  function closeLabelDropdown() {
    document.getElementById('label-filter-dropdown').classList.add('hidden');
  }

  function updateFilterButton(hasFilter) {
    document.querySelector('.btn-filter').classList.toggle('active-filter', hasFilter);
  }

  /* ===========================
     詳細画面
  =========================== */

  /**
   * タスク詳細画面のコンテンツを描画する。
   * @param {object}   task
   * @param {Function} onStatusChange - (taskId: string, status: string) => void
   */
  function renderDetail(task, onStatusChange) {
    const now    = Date.now();
    const dl     = new Date(task.deadline).getTime();
    const diff   = dl - now;
    const dlClass = diff < 0 ? 'overdue' : diff < 86400000 * 3 ? 'warning' : '';

    const el = document.getElementById('detail-content');
    el.innerHTML = `
      <div class="detail-type-row">
        <span class="card-type-badge type-${task.type}">${task.type}</span>
        ${task.label ? `<span class="card-label" style="margin:0">🏷️ ${escHtml(task.label)}</span>` : ''}
      </div>
      <div class="detail-title">${escHtml(task.name)}</div>
      <div class="detail-meta">
        <span>登録: ${formatDate(task.createdAt)}</span>
      </div>
      ${task.detail ? `
      <div class="detail-section">
        <div class="detail-label-h">詳細</div>
        <div class="detail-body">${escHtml(task.detail)}</div>
      </div>` : ''}
      <div class="detail-section">
        <div class="detail-label-h">期限</div>
        <div class="deadline-display ${dlClass}">
          📅 ${formatDeadline(task.deadline)}
          ${task.status !== 'done'
            ? `<span style="margin-left:auto;font-size:12px;color:var(--text-muted)">${timeLeftStr(diff)}</span>`
            : ''}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-label-h">進捗状態</div>
        <div class="status-change-row">
          <button class="status-change-btn ${task.status==='todo'  ?'active-status':''}" data-status="todo">未着手</button>
          <button class="status-change-btn ${task.status==='doing' ?'active-status':''}" data-status="doing">進行中</button>
          <button class="status-change-btn ${task.status==='done'  ?'active-status':''}" data-status="done">完了</button>
        </div>
      </div>
    `;

    el.querySelectorAll('.status-change-btn').forEach(btn => {
      btn.addEventListener('click', () => onStatusChange(task.id, btn.dataset.status));
    });
  }

  /* ===========================
     タスク登録フォーム
  =========================== */

  /** 登録フォームを初期状態にリセットする */
  function resetAddForm(labels) {
    document.getElementById('new-task-name').value   = '';
    document.getElementById('new-task-detail').value = '';
    document.getElementById('new-task-deadline').value = '';
    document.getElementById('count-name').textContent   = '0';
    document.getElementById('count-detail').textContent = '0';
    // type toggle を「課題」に戻す
    const toggle = document.querySelector('#view-add-task .type-toggle');
    toggle.querySelectorAll('.type-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    _renderLabelSelect('new-task-label', labels, '');
  }

  /** 登録フォームの入力値を収集して返す */
  function getAddFormValues() {
    return {
      name:     document.getElementById('new-task-name').value,
      detail:   document.getElementById('new-task-detail').value,
      deadline: document.getElementById('new-task-deadline').value,
      label:    document.getElementById('new-task-label').value,
      type:     document.querySelector('#view-add-task .type-btn.active')?.dataset.type || '課題',
    };
  }

  /* ===========================
     タスク編集フォーム
  =========================== */

  /** 編集フォームを指定タスクの値で初期化する */
  function populateEditForm(task, labels) {
    document.getElementById('edit-task-name').value      = task.name;
    document.getElementById('edit-task-detail').value    = task.detail || '';
    document.getElementById('edit-task-deadline').value  = task.deadline;
    document.getElementById('edit-count-name').textContent   = task.name.length;
    document.getElementById('edit-count-detail').textContent = (task.detail || '').length;
    _renderLabelSelect('edit-task-label', labels, task.label);
    // type toggle
    document.querySelectorAll('#edit-type-toggle .type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.type === task.type);
    });
    // status
    document.querySelectorAll('.status-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.status === task.status);
    });
  }

  /** 編集フォームの入力値を収集して返す */
  function getEditFormValues() {
    return {
      name:     document.getElementById('edit-task-name').value,
      detail:   document.getElementById('edit-task-detail').value,
      deadline: document.getElementById('edit-task-deadline').value,
      label:    document.getElementById('edit-task-label').value,
      type:     document.querySelector('#edit-type-toggle .type-btn.active')?.dataset.type || '課題',
      status:   document.querySelector('.status-btn.active')?.dataset.status || 'todo',
    };
  }

  /* ===========================
     ラベル管理画面
  =========================== */

  /**
   * ラベルチップ一覧を描画する。
   * @param {string[]} labels
   * @param {Function} onDelete - (label: string) => void
   */
  function renderLabelChips(labels, onDelete) {
    const container = document.getElementById('label-list');
    container.innerHTML = '';
    if (labels.length === 0) {
      container.innerHTML = '<span style="color:var(--text-muted);font-size:13px">ラベルがありません</span>';
      return;
    }
    labels.forEach(label => {
      const chip = document.createElement('div');
      chip.className = 'label-chip';
      chip.innerHTML = `🏷️ ${escHtml(label)} <button class="label-chip-del" title="削除">✕</button>`;
      chip.querySelector('.label-chip-del').addEventListener('click', () => onDelete(label));
      container.appendChild(chip);
    });
  }

  /* ===========================
     select 要素のラベル選択肢更新（内部共通処理）
  =========================== */

  function _renderLabelSelect(selectId, labels, selected) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- 選択してください --</option>';
    labels.forEach(label => {
      const opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      if (label === selected) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  /** 複数の select にラベル選択肢を反映する（外部から呼ぶ用） */
  function syncLabelSelects(labels, selectedInEdit = '') {
    _renderLabelSelect('new-task-label', labels, '');
    _renderLabelSelect('edit-task-label', labels, selectedInEdit);
  }

  /* ===========================
     統計表示
  =========================== */

  function updateStat(totalCount) {
    document.getElementById('stat-total').textContent = `${totalCount} タスク`;
  }

  /* ===========================
     確認モーダル
  =========================== */

  function showConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('hidden');
  }

  function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
  }

  /* ===========================
     文字数カウンタ
  =========================== */

  function updateCharCount(inputId, countId) {
    const len = document.getElementById(inputId).value.length;
    document.getElementById(countId).textContent = len;
  }

  /* ===========================
     トースト通知
  =========================== */

  let _toastTimer = null;
  function showToast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className   = 'toast' + (type ? ' ' + type : '');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
  }

  /* ===========================
     公開 API
  =========================== */
  return {
    showView,
    renderTaskList,
    updateStatusTabs,
    renderTypeFilterList,
    renderLabelFilterList,
    toggleLabelDropdown,
    closeLabelDropdown,
    updateFilterButton,
    renderDetail,
    resetAddForm,
    getAddFormValues,
    populateEditForm,
    getEditFormValues,
    renderLabelChips,
    syncLabelSelects,
    updateStat,
    showConfirmModal,
    closeConfirmModal,
    updateCharCount,
    showToast,
  };
})();