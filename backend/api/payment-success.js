const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { moderateContent, summarizeInquiry } = require('./_claude');
const { sendToSlack } = require('./_slack');

/**
 * GET /api/payment-success?session_id=XXX
 * Stripe 支払い完了後のリダイレクト先
 * 1. 支払い確認
 * 2. フォームデータ取得（metadata）
 * 3. Claude で審査（不適切 → 静かに破棄）
 * 4. Claude で要約
 * 5. Slack に送信
 * 6. 完了ページを表示
 */
module.exports = async (req, res) => {
    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).send(errorHTML('セッションIDが見つかりません。'));
    }

    try {
        // Stripe セッション取得・検証
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status !== 'paid') {
            return res.status(400).send(errorHTML('お支払いが完了していません。'));
        }

        const { form_name, form_affiliation, form_email, form_content_1, form_content_2, form_content_3, form_content_4 } = session.metadata;
        const content = [form_content_1, form_content_2, form_content_3, form_content_4].filter(Boolean).join('');

        // Claude で不適切コンテンツを審査
        let isInappropriate = false;
        try {
            isInappropriate = await moderateContent(content);
        } catch (e) {
            // Claude API エラーは無視して通過させる
            console.error('[payment-success] Moderation error:', e.message);
        }

        if (!isInappropriate) {
            // Claude で要約 + Slack 送信
            let summary = '（要約に失敗しました）';
            try {
                summary = await summarizeInquiry(form_name, form_affiliation, content);
            } catch (e) {
                console.error('[payment-success] Summarization error:', e.message);
            }

            try {
                await sendToSlack({
                    name: form_name,
                    affiliation: form_affiliation,
                    email: form_email,
                    content,
                    summary,
                    paymentType: 'paid',
                    sessionId: session_id,
                });
            } catch (e) {
                console.error('[payment-success] Slack error:', e.message);
            }
        }
        // 不適切な場合でも成功ページを表示（送信者に気づかせない）

        res.send(successHTML(form_name));

    } catch (err) {
        console.error('[payment-success] Error:', err);
        res.status(500).send(errorHTML('サーバーエラーが発生しました。サポートにお問い合わせください。'));
    }
};

function successHTML(name) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>送信完了 - Better Waseda Moodle 改</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
      background: #1a1b2e; color: #d8d9f0;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 20px;
    }
    .card {
      background: #252638; border-radius: 16px; padding: 48px 40px;
      max-width: 520px; width: 100%; text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .emoji { font-size: 3.5rem; margin-bottom: 16px; }
    h1 { color: #7eb4ff; font-size: 1.5rem; margin-bottom: 12px; }
    p { line-height: 1.7; color: #b0b2d0; margin-bottom: 16px; }
    .promise {
      background: #2e2f47; border-left: 4px solid #5c6bc0;
      padding: 18px 20px; border-radius: 0 8px 8px 0;
      text-align: left; margin: 24px 0; line-height: 1.7;
    }
    .promise strong { color: #7eb4ff; }
    .note { font-size: 0.78rem; color: #6668a0; margin-top: 20px; }
    .btn {
      display: inline-block; margin-top: 24px; padding: 12px 32px;
      background: #5c6bc0; color: white; border: none; border-radius: 8px;
      cursor: pointer; font-size: 1rem; text-decoration: none;
      transition: background 0.2s;
    }
    .btn:hover { background: #7986cb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">🎉</div>
    <h1>${name} さん、ありがとうございます！</h1>
    <p>ご要望を受け付けました。</p>
    <div class="promise">
      🌟 いただいたご要望は、<strong>Better Waseda Moodle 改</strong> がより使いやすくなるための改善に活用させていただきます。<br><br>
      みなさんのご支援・ご意見が、Waseda Moodle をより快適にする開発の原動力です。ありがとうございます。
    </div>
    <p class="note">
      ※ 本サービスは早稲田大学・情報企画部・Moodle 公式とは一切関係のない個人開発サービスです。<br>
      ※ 授業・学籍・成績等のお問い合わせは各担当窓口にお問い合わせください。
    </p>
    <a href="javascript:window.close()" class="btn">閉じる</a>
  </div>
</body>
</html>`;
}

function errorHTML(message) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>エラー - Better Waseda Moodle 改</title>
  <style>
    body { font-family: sans-serif; background: #1a1b2e; color: #d8d9f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #252638; border-radius: 12px; padding: 40px; max-width: 480px; text-align: center; }
    h1 { color: #ef5350; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠️ エラー</h1>
    <p style="margin-top:16px">${message}</p>
    <a href="javascript:history.back()" style="display:inline-block;margin-top:24px;padding:10px 24px;background:#5c6bc0;color:white;border-radius:6px;text-decoration:none">戻る</a>
  </div>
</body>
</html>`;
}
