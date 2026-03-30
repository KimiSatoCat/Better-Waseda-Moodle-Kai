const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { setCors } = require('./_cors');

/**
 * POST /api/create-inquiry-checkout
 * フォームデータを受け取り、Stripe Checkout Session を作成して URL を返す
 */
module.exports = async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { name, affiliation, email, content } = req.body;

        // バリデーション
        if (!name || !affiliation || !email || !content) {
            return res.status(400).json({ error: '全項目を入力してください' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'メールアドレスの形式が正しくありません' });
        }
        if (content.length > 2000) {
            return res.status(400).json({ error: 'お問い合わせ内容は2000字以内で入力してください' });
        }

        const baseUrl = process.env.BASE_URL || 'https://bwm-inquiry-api.vercel.app';

        // Stripe Checkout Session 作成
        // フォームデータは Stripe の metadata に格納（最大500字/項目）
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: 'Better Waseda Moodle 改 お問い合わせ',
                        description: '拡張機能への要望・フィードバック送信料。返金不可。',
                        images: [],
                    },
                    unit_amount: 500,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${baseUrl}/api/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/api/payment-cancel`,
            customer_email: email,
            metadata: {
                // 500字制限があるため content は分割
                form_name:          name.substring(0, 490),
                form_affiliation:   affiliation.substring(0, 490),
                form_email:         email.substring(0, 490),
                form_content_1:     content.substring(0, 490),
                form_content_2:     content.substring(490, 980),
                form_content_3:     content.substring(980, 1470),
                form_content_4:     content.substring(1470, 1960),
            },
            locale: 'ja',
            custom_text: {
                submit: { message: '送信後の返金はできません。ご了承の上、お支払いください。' }
            },
        });

        res.json({ url: session.url });

    } catch (err) {
        console.error('[create-inquiry-checkout] Error:', err);
        res.status(500).json({ error: 'サーバーエラーが発生しました。時間をおいてお試しください。' });
    }
};
