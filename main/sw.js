/**
 * sw.js (ブラウザの裏側で動くスクリプト)
 */

// メイン側（notification.js）からメッセージを受け取ったときの処理
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
      const { title, body, delay } = event.data;
  
      // 指定された時間（5秒）待ってから通知を表示する
      setTimeout(() => {
        const options = {
          body: body,
          // icon: 'icon.png' // もしアイコン画像があれば指定可能
        };
  
        // Service Worker から OS に通知を表示させる命令
        self.registration.showNotification(title, options);
      }, delay);
    }
  });