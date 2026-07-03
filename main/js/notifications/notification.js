/**
 * notification.js (テスト用)
 */
const NotificationManager = (() => {
  async function start() {
    // 1. ブラウザが対応しているかチェック
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.log('このブラウザはService Workerまたは通知に対応していません。');
      return;
    }

    // 2. 通知の許可を得る
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('通知が拒否されました。');
      return;
    }

    try {
      // 3. Service Worker（sw.js）を登録
      // パスは index.html から見た相対パスにします
      const registration = await navigator.serviceWorker.register('sw.js');
      console.log('Service Worker 登録完了:', registration);

      // 4. 登録が完了したら、5秒後に通知を出すよう裏（sw.js）に命令を送る
      // 登録直後はアクティブになるまで一瞬タイムラグがあるので、少し待つか準備完了を確認します
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) {
          reg.active.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            title: '📅 Todoアプリテスト',
            body: 'サイトを閉じても通知が届きました！',
            delay: 5000 // 5秒（5000ミリ秒）
          });
          console.log('🚨 5秒後に通知を予約しました！今すぐブラウザのタブを閉じてください！');
        }
      });

    } catch (error) {
      console.error('Service Worker の登録に失敗しました:', error);
    }
  }

  return { start };
})();