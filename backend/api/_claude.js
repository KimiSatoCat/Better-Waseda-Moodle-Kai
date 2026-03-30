const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * テキストを Claude で審査し、不適切なコンテンツを検出する
 * @param {string} text
 * @returns {Promise<boolean>} true = 不適切
 */
async function moderateContent(text) {
    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{
            role: 'user',
            content: `以下のテキストに誹謗中傷、差別的発言、ハラスメント、悪意ある内容、または個人攻撃が含まれているか判定してください。
YESまたはNOのみで返答してください。

テキスト:
${text.substring(0, 2000)}`
        }]
    });

    const answer = response.content[0].text.trim().toUpperCase();
    return answer.startsWith('YES');
}

/**
 * お問い合わせ内容を要約する
 * @param {string} name
 * @param {string} affiliation
 * @param {string} content
 * @returns {Promise<string>} 要約テキスト
 */
async function summarizeInquiry(name, affiliation, content) {
    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
            role: 'user',
            content: `以下の Better Waseda Moodle 改（早稲田大学 Moodle 用ブラウザ拡張機能）へのお問い合わせを、開発者向けに200字以内で要約してください。
要望のポイントを箇条書きで、優先度の高い項目を先に記載してください。

送信者: ${name}（${affiliation}）
内容:
${content}`
        }]
    });

    return response.content[0].text;
}

module.exports = { moderateContent, summarizeInquiry };
