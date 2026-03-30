/**
 * Slack にお問い合わせ内容を送信する
 * @param {object} params
 * @param {string} params.name - 送信者名
 * @param {string} params.affiliation - 所属
 * @param {string} params.email - メールアドレス
 * @param {string} params.content - お問い合わせ内容（原文）
 * @param {string} params.summary - AI 要約
 * @param {string} params.paymentType - 'paid' | 'coupon' | 'donation'
 * @param {string} [params.sessionId] - Stripe セッション ID
 * @param {number} [params.donationAmount] - 寄付金額（donation の場合）
 */
async function sendToSlack({ name, affiliation, email, content, summary, paymentType, sessionId, donationAmount }) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('[Slack] SLACK_WEBHOOK_URL が設定されていません');
        return;
    }

    const icon = paymentType === 'donation' ? '💝' : '📩';
    const typeLabel = paymentType === 'paid' ? '有料送信 (¥500)' : paymentType === 'coupon' ? 'クーポン使用' : `寄付 (¥${donationAmount})`;
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    const blocks = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `${icon} 新着 BWM改 お問い合わせ`, emoji: true }
        },
        {
            type: 'section',
            fields: [
                { type: 'mrkdwn', text: `*📛 名前:*\n${name}` },
                { type: 'mrkdwn', text: `*🏫 所属:*\n${affiliation}` },
                { type: 'mrkdwn', text: `*📧 メール:*\n${email}` },
                { type: 'mrkdwn', text: `*💳 種別:*\n${typeLabel}` },
            ]
        },
        { type: 'divider' },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*📝 要望（原文）:*\n${content.substring(0, 1000)}${content.length > 1000 ? '…（省略）' : ''}`
            }
        },
        { type: 'divider' },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*🤖 AI 要約:*\n${summary}`
            }
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `受信: ${timestamp}${sessionId ? ` | Session: \`${sessionId}\`` : ''}`
                }
            ]
        }
    ];

    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks })
    });
}

module.exports = { sendToSlack };
