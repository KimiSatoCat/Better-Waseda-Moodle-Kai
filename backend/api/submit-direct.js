const { moderateContent, summarizeInquiry } = require('./_claude');
const { sendToSlack } = require('./_slack');
const { setCors } = require('./_cors');

const VALID_COUPON = 'test_betterwasedamoodle_kiminobusato_19980303_hokkaido_humanscience_1J23F072_3826C052';

/**
 * POST /api/submit-direct
 * クーポンコードによる直接送信（Stripe 不要）
 */
module.exports = async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { name, affiliation, email, content, coupon } = req.body;

        // クーポン検証
        if (coupon !== VALID_COUPON) {
            return res.status(403).json({ error: 'クーポンコードが正しくありません' });
        }

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

        // Claude 審査
        let isInappropriate = false;
        try {
            isInappropriate = await moderateContent(content);
        } catch (e) {
            console.error('[submit-direct] Moderation error:', e.message);
        }

        if (!isInappropriate) {
            let summary = '（要約に失敗しました）';
            try {
                summary = await summarizeInquiry(name, affiliation, content);
            } catch (e) {
                console.error('[submit-direct] Summarization error:', e.message);
            }

            try {
                await sendToSlack({ name, affiliation, email, content, summary, paymentType: 'coupon' });
            } catch (e) {
                console.error('[submit-direct] Slack error:', e.message);
            }
        }

        // 不適切な場合でも成功レスポンスを返す（送信者に気づかせない）
        res.json({ success: true });

    } catch (err) {
        console.error('[submit-direct] Error:', err);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
};
