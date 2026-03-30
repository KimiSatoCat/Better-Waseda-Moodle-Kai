/**
 * Better Waseda Moodle 改 - お問い合わせ送信 API
 *
 * POST /api/submit-inquiry
 *
 * 処理フロー:
 * 1. Stripeで支払い済みかクーポンコードが有効かを検証
 * 2. Claude APIで内容を要約 + 誹謗中傷チェック
 * 3. 問題なければSlackに要約を送信
 * 4. 誹謗中傷が検知された場合は開発者に通知せず静かに削除
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// 有効なクーポンコード
const VALID_COUPON =
  "test_betterwasedamoodle_kiminobusato_19980303_hokkaido_humanscience_1J23F072_3826C052";

interface InquiryBody {
  name: string;
  affiliation: string;
  email: string;
  content: string;
  paymentIntentId?: string; // Stripe決済ID
  couponCode?: string;      // クーポンコード
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as InquiryBody;
  const { name, affiliation, email, content, paymentIntentId, couponCode } = body;

  // ─── 入力バリデーション ───
  if (!name || !affiliation || !email || !content) {
    return res.status(400).json({ error: "必須項目が未入力です。" });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: "お問い合わせ内容は2000文字以内にしてください。" });
  }

  // ─── 認証: クーポンコードまたはStripe決済の確認 ───
  const isCouponValid = couponCode === VALID_COUPON;

  if (!isCouponValid) {
    if (!paymentIntentId) {
      return res.status(402).json({ error: "支払いまたはクーポンコードが必要です。" });
    }

    // Stripe決済の確認
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: "Stripe設定エラー" });
    }

    const stripeRes = await fetch(
      `https://api.stripe.com/v1/payment_intents/${paymentIntentId}`,
      {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );
    const stripeData = await stripeRes.json();

    if (stripeData.status !== "succeeded") {
      return res.status(402).json({ error: "支払いが確認できませんでした。" });
    }
    // 金額チェック（500円 = 500 JPY）
    if (stripeData.amount < 500 || stripeData.currency !== "jpy") {
      return res.status(402).json({ error: "支払い金額が正しくありません。" });
    }
  }

  // ─── Claude APIで誹謗中傷チェック + 要約 ───
  const claudeApiKey = process.env.CLAUDE_API_KEY;
  if (!claudeApiKey) {
    return res.status(500).json({ error: "Claude API設定エラー" });
  }

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `以下はブラウザ拡張機能「Better Waseda Moodle 改」へのお問い合わせです。

送信者情報:
- 名前: ${name}
- 所属: ${affiliation}
- メール: ${email}

お問い合わせ内容:
${content}

以下の2点をJSON形式で回答してください:
1. "is_abusive": 誹謗中傷・個人攻撃・差別的表現・暴力的表現が含まれているか (true/false)
2. "summary": 開発者向けの簡潔な日本語要約（3行以内、箇条書きなし）。is_abusiveがtrueの場合は空文字。

必ずJSON形式のみで回答し、説明文は不要です。例: {"is_abusive": false, "summary": "○○機能の追加要望"}`,
        },
      ],
    }),
  });

  const claudeData = await claudeRes.json();
  const rawText = claudeData.content?.[0]?.text ?? "";

  let isAbusive = false;
  let summary = "";

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      isAbusive = parsed.is_abusive === true;
      summary = parsed.summary ?? "";
    }
  } catch {
    // パース失敗時はデフォルト値（送信を継続）
    summary = content.slice(0, 100) + (content.length > 100 ? "…" : "");
  }

  // 誹謗中傷が検知された場合: 開発者に通知せず静かに成功レスポンスを返す
  if (isAbusive) {
    return res.status(200).json({
      success: true,
      message: "お問い合わせを受け付けました。ありがとうございました。",
    });
  }

  // ─── Slackに要約を送信 ───
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    return res.status(500).json({ error: "Slack設定エラー" });
  }

  const slackPayload = {
    text: `📩 *Better Waseda Moodle 改 お問い合わせ*`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📩 Better Waseda Moodle 改 お問い合わせ",
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*名前*\n${name}` },
          { type: "mrkdwn", text: `*所属*\n${affiliation}` },
          { type: "mrkdwn", text: `*メール*\n${email}` },
          {
            type: "mrkdwn",
            text: `*認証方法*\n${isCouponValid ? "クーポンコード" : "Stripe決済 (¥500)"}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*要約（Claude生成）*\n${summary}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `原文（${content.length}文字）: ${content.slice(0, 200)}${content.length > 200 ? "…" : ""}`,
          },
        ],
      },
    ],
  };

  const slackRes = await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackPayload),
  });

  if (!slackRes.ok) {
    console.error("Slack送信エラー:", await slackRes.text());
    // Slack失敗でもユーザーには成功と返す
  }

  return res.status(200).json({
    success: true,
    message: "お問い合わせを受け付けました。ありがとうございました。",
  });
}
