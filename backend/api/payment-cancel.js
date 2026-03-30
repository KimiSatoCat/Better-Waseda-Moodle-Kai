module.exports = (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>キャンセル - Better Waseda Moodle 改</title>
  <style>
    body { font-family: sans-serif; background: #1a1b2e; color: #d8d9f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #252638; border-radius: 12px; padding: 40px; max-width: 480px; text-align: center; }
    h1 { color: #ffa726; }
    p { line-height: 1.6; margin-top: 12px; color: #9899b8; }
    .btn { display:inline-block; margin-top:24px; padding:10px 24px; background:#5c6bc0; color:white; border-radius:6px; text-decoration:none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>お支払いをキャンセルしました</h1>
    <p>フォームの内容は保存されていません。<br>再度お問い合わせフォームから送信してください。</p>
    <a href="javascript:window.close()" class="btn">閉じる</a>
  </div>
</body>
</html>`);
};
