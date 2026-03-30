/**
 * Better Waseda Moodle 改 - Stripe PaymentIntent 作成 API
 *
 * POST /api/create-payment-intent
 * お問い合わせ送信前に500円の支払いを作成する
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return res.status(500).json({ error: "Stripe設定エラー" });

  // Stripe REST APIでPaymentIntentを作成（500円）
  const params = new URLSearchParams({
    amount: "500",
    currency: "jpy",
    "payment_method_types[]": "card",
    description: "Better Waseda Moodle 改 お問い合わせ料",
  });

  const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await stripeRes.json();
  if (!stripeRes.ok) {
    return res.status(500).json({ error: data.error?.message ?? "Stripeエラー" });
  }

  return res.status(200).json({ clientSecret: data.client_secret });
}
