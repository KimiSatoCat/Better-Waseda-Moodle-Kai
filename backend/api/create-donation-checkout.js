const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { setCors } = require('./_cors');

/**
 * POST /api/create-donation-checkout
 * 寄付の Stripe Checkout Session を作成
 */
module.exports = async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { amount, email, name } = req.body;

        const amountNum = parseInt(amount, 10);
        if (!amountNum || amountNum < 100 || amountNum > 100000) {
            return res.status(400).json({ error: '寄付金額は100円〜100,000円の範囲で入力してください' });
        }

        const baseUrl = process.env.BASE_URL || 'https://bwm-inquiry-api.vercel.app';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: 'Better Waseda Moodle 改 への寄付',
                        description: '開発継続のための任意寄付。返金不可。早稲田大学・Moodle 公式とは無関係。',
                    },
                    unit_amount: amountNum,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${baseUrl}/api/donation-success?name=${encodeURIComponent(name || 'ご支援者')}`,
            cancel_url: `${baseUrl}/api/payment-cancel`,
            customer_email: email || undefined,
            metadata: { donation_name: (name || '匿名').substring(0, 490), amount: String(amountNum) },
            locale: 'ja',
            custom_text: {
                submit: { message: '寄付は任意です。返金はできません。早稲田大学・Moodle 公式とは一切関係ありません。' }
            },
        });

        res.json({ url: session.url });

    } catch (err) {
        console.error('[create-donation-checkout] Error:', err);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
};
