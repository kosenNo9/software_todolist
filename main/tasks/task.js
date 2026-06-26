// タスクを保存する配列
let tasks = [];

// HTML要素取得
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

// 登録ボタン
addTaskBtn.addEventListener("click", () => {

  // 入力値取得
  const name = document.getElementById("taskName").value;
  const detail = document.getElementById("taskDetail").value;
  const deadline = document.getElementById("taskDeadline").value;
  const type = document.getElementById("taskType").value;
  const label = document.getElementById("taskLabel").value;

  // バリデーション
  if (name.length < 1 || name.length > 30) {
    alert("タスク名は1〜30文字です");
    return;
  }

  if (detail.length > 100) {
    alert("詳細は100文字以下です");
    return;
  }

  // タスク作成
  const task = {
    id: Date.now(),
    name,
    detail,
    deadline,
    type,
    label,
    status: "未着手"
  };

  // 配列へ追加
  tasks.unshift(task);

  // 保存
  saveTasks();

  // 表示更新
  renderTasks();

  // 入力欄リセット
  clearForm();
});


// タスク一覧表示
function renderTasks() {

  // 一旦空にする
  taskList.innerHTML = "";

  // 配列を画面に表示
  tasks.forEach(task => {

    const li = document.createElement("li");

    li.innerHTML = `
      <h3>${task.name}</h3>
      <p>詳細: ${task.detail}</p>
      <p>期限: ${task.deadline}</p>
      <p>種類: ${task.type}</p>
      <p>ラベル: ${task.label}</p>
      <p>状態: ${task.status}</p>

      <button onclick="deleteTask(${task.id})">
        削除
      </button>
    `;

    taskList.appendChild(li);
  });
}


// タスク削除
function deleteTask(id) {

  // 確認メッセージ
  const result = confirm("本当に削除しますか？");

  if (!result) {
    return;
  }

  // 指定id以外を残す
  tasks = tasks.filter(task => task.id !== id);

  // 保存
  saveTasks();

  // 再表示
  renderTasks();
}


// フォーム初期化
function clearForm() {

  document.getElementById("taskName").value = "";
  document.getElementById("taskDetail").value = "";
  document.getElementById("taskDeadline").value = "";
  document.getElementById("taskType").value = "課題";
  document.getElementById("taskLabel").value = "";
}


// localStorageへ保存
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}


// 起動時読み込み
function loadTasks() {

  const data = localStorage.getItem("tasks");

  if (data) {
    tasks = JSON.parse(data);
  }

  renderTasks();
}

loadTasks();