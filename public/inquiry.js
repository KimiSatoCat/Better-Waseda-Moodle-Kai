'use strict';

const API_BASE = 'https://better-waseda-moodlekai.vercel.app';
const STRIPE_KEY = 'pk_live_51TEHmODedaFhOLE3hcwZx5kqlwCYYeJdYcvBlNPgwHmmQTDf8K2Eocpz2ED2vr39fwVgUR8Dunoaoe6cNrapc3q7000JQQANdb';
const VALID_COUPON = 'test_betterwasedamoodle_kiminobusato_19980303_hokkaido_humanscience_1J23F072_3826C052';

// ─── 翻訳データ ───────────────────────────────────────────
const I18N = {
  ja: {
    pageTitle:     'お問い合わせ・要望 – Better Waseda Moodle 改',
    mTitle:        '📋 ご利用前にご確認ください',
    mS1h:          '■ サービスの独立性',
    mS1b:          '本フォームおよびBetter Waseda Moodle 改は、<strong>早稲田大学・大学事務局・Moodle Project・その他大学関係機関とは一切無関係の</strong>個人開発プロジェクトです。名称中の「Waseda Moodle」は動作対象を説明するための叙述的使用であり、商標権の侵害にはあたりません。',
    mS2h:          '■ 個人情報の取り扱い',
    mS2b:          '入力いただいた情報（氏名・所属・メールアドレス・要望内容）は、開発者への要望連絡のみに使用します。AI要約後に開発者専用チャンネルへ通知され、外部DBへの永続保存は行いません。第三者への提供は一切行いません。',
    mS3h:          '■ お問い合わせ料金（¥500）について',
    mS3b:          'スパム防止・サービス維持を目的とした料金です。支払いはStripe社の決済システムを通じて安全に処理されます。決済完了後の返金は原則対応しておりません。',
    mS4h:          '■ 免責事項',
    mS4b:          '本サービスはWaseda Moodleの公式サービスではありません。大学システムの仕様変更等による機能停止について開発者は責任を負いません。本サービスの利用はご自身の判断と責任において行ってください。',
    mAgree:        '同意してフォームを開く',
    mClose:        '閉じる',
    mFooter:       '早稲田大学・Moodle Projectとは一切関係ありません',
    hTitle:        '📬 お問い合わせ・要望',
    hSub:          'Better Waseda Moodle 改 拡張機能に関するご要望・ご意見をお送りください。',
    hNote:         '※ 早稲田大学・Moodle とは無関係の個人開発プロジェクトです',
    fTitle:        '📝 お問い合わせ内容',
    lName:         'お名前',
    lNameOpt:      '（任意）',
    lAffilLabel:   '所属（学部・研究科など）',
    lAffilPH:      '例：〇〇学部　〇〇学科',
    lEmail:        'メールアドレス',
    lEmailPH:      'xxx@waseda.jp',
    lContent:      'ご要望・お問い合わせ内容',
    lContentPH:    '具体的なご要望をお書きください...',
    lContentMax:   '（2000文字以内）',
    fPayTitle:     '💳 お問い合わせ料（¥500）',
    fPayNote:      'スパム防止・継続的なメンテナンス費用として活用いたします。クーポンをお持ちの方は無料でご送信いただけます。',
    tabCard:       'カードで支払い',
    tabCoupon:     'クーポンコード',
    couponPH:      'クーポンコードを入力',
    couponApply:   '適用',
    couponOk:      '✅ クーポンコードが適用されました（無料で送信できます）',
    couponErr:     '❌ クーポンコードが正しくありません',
    submitFree:    '送信する（無料）',
    submit500:     '送信する（¥500）',
    sending:       '送信中...',
    errRequired:   'メールアドレスとお問い合わせ内容は必須です。',
    errEmail:      'メールアドレスの形式が正しくありません。',
    errInit:       '決済の初期化に失敗しました。ページを再読み込みしてください。',
    errNetwork:    'ネットワークエラーが発生しました。',
    errGeneral:    '送信に失敗しました。しばらく後にお試しください。',
    sTitle:        'ありがとうございます！',
    sBody:         'お問い合わせを受け付けました。いただいたご要望をもとに、Waseda Moodle がより使いやすくなるよう個人開発者として継続的に改善に取り組んでまいります。',
    sNote:         '※ 本サービスは早稲田大学・Moodle Project とは無関係の個人開発プロジェクトです。',
    dTitle:        '☕ 開発を応援する（任意寄付）',
    dBody:         'Better Waseda Moodle 改 はすべて個人開発・無償提供です。いただいたサポートはWaseda Moodleをより快適にするための機能開発・サーバー維持費に充てさせていただきます。',
    dBtn:          'を寄付する',
    dThanks:       '✅ ありがとうございます！',
    dDisclaimer:   '※ 本サービスは早稲田大学・大学事務・Moodle Projectとは一切関係のない個人開発プロジェクトです。<br>※ 寄付は完全に任意です。いかなる特典・優遇も伴いません。<br>※ 決済完了後の払い戻しは原則対応しておりません（Stripe決済規約に準じます）。',
    namePH:        '早稲田 太郎',
  },
  en: {
    pageTitle:     'Contact / Feedback – Better Waseda Moodle Kai',
    mTitle:        '📋 Please Read Before Proceeding',
    mS1h:          '■ Independence of This Service',
    mS1b:          'This form and Better Waseda Moodle Kai are an <strong>independent personal project completely unaffiliated with Waseda University, its administration, Moodle Project, or any other university-related organizations.</strong> The name "Waseda Moodle" is used descriptively to indicate the system this extension works with, and does not constitute trademark infringement.',
    mS2h:          '■ Handling of Personal Information',
    mS2b:          'Information you provide (name, affiliation, email address, message) will be used solely to communicate your feedback to the developer. It will be sent to a private developer channel after AI summarization and will not be stored in any external database or shared with third parties.',
    mS3h:          '■ Inquiry Fee (¥500)',
    mS3b:          'This fee is charged to prevent spam and support ongoing maintenance. Payments are processed securely through Stripe. Refunds are generally not available after payment is completed.',
    mS4h:          '■ Disclaimer',
    mS4b:          'This service is not an official Waseda Moodle service. The developer is not responsible for any interruption of functionality due to changes in university systems. Use this service at your own discretion and risk.',
    mAgree:        'Agree and Open Form',
    mClose:        'Close',
    mFooter:       'Not affiliated with Waseda University or Moodle Project',
    hTitle:        '📬 Contact / Feedback',
    hSub:          'Send us your feedback and feature requests for the Better Waseda Moodle Kai extension.',
    hNote:         '※ Independent personal project — not affiliated with Waseda University or Moodle',
    fTitle:        '📝 Your Message',
    lName:         'Name',
    lNameOpt:      '(optional)',
    lAffilLabel:   'Affiliation (Faculty / Graduate School)',
    lAffilPH:      'e.g. School of Human Sciences',
    lEmail:        'Email Address',
    lEmailPH:      'xxx@waseda.jp',
    lContent:      'Message / Feature Request',
    lContentPH:    'Please describe your request in detail...',
    lContentMax:   '(max 2000 characters)',
    fPayTitle:     '💳 Inquiry Fee (¥500)',
    fPayNote:      'This fee helps prevent spam and cover maintenance costs. If you have a coupon code, you can submit for free.',
    tabCard:       'Pay by Card',
    tabCoupon:     'Coupon Code',
    couponPH:      'Enter coupon code',
    couponApply:   'Apply',
    couponOk:      '✅ Coupon applied — you can submit for free!',
    couponErr:     '❌ Invalid coupon code',
    submitFree:    'Submit (Free)',
    submit500:     'Submit (¥500)',
    sending:       'Sending...',
    errRequired:   'Email address and message are required.',
    errEmail:      'Please enter a valid email address.',
    errInit:       'Payment initialization failed. Please reload the page.',
    errNetwork:    'A network error occurred.',
    errGeneral:    'Submission failed. Please try again later.',
    sTitle:        'Thank you!',
    sBody:         'Your message has been received. We will use your feedback to make Waseda Moodle more convenient for everyone.',
    sNote:         '※ This service is an independent personal project unaffiliated with Waseda University or Moodle Project.',
    dTitle:        '☕ Support the Developer (Optional Donation)',
    dBody:         'Better Waseda Moodle Kai is completely free and independently developed. Your support goes toward feature development and server maintenance costs.',
    dBtn:          'Donate',
    dThanks:       '✅ Thank you so much!',
    dDisclaimer:   '※ This service is an independent personal project unaffiliated with Waseda University or Moodle Project.<br>※ Donations are entirely voluntary and come with no benefits or privileges.<br>※ Refunds are generally not available after payment (subject to Stripe\'s refund policy).',
    namePH:        'Taro Waseda',
  }
};

// ─── 言語管理 ──────────────────────────────────────────
var currentLang = (navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en';

function setLang(lang) {
  currentLang = lang;
  var s = I18N[lang];
  document.documentElement.lang = lang;
  document.title = s.pageTitle;

  // モーダル
  document.getElementById('m-title').textContent = s.mTitle;
  document.getElementById('m-s1h').textContent = s.mS1h;
  document.getElementById('m-s1b').innerHTML = s.mS1b;
  document.getElementById('m-s2h').textContent = s.mS2h;
  document.getElementById('m-s2b').textContent = s.mS2b;
  document.getElementById('m-s3h').textContent = s.mS3h;
  document.getElementById('m-s3b').textContent = s.mS3b;
  document.getElementById('m-s4h').textContent = s.mS4h;
  document.getElementById('m-s4b').textContent = s.mS4b;
  document.getElementById('m-agree').textContent = s.mAgree;
  document.getElementById('m-close').textContent = s.mClose;
  document.getElementById('m-footer').textContent = s.mFooter;

  // フォーム
  document.getElementById('h-title').textContent = s.hTitle;
  document.getElementById('h-sub').textContent = s.hSub;
  document.getElementById('h-note').textContent = s.hNote;
  document.getElementById('f-title').textContent = s.fTitle;

  document.getElementById('l-name').innerHTML = s.lName + ' <span class="optional">' + s.lNameOpt + '</span>';
  document.getElementById('inp-name').placeholder = s.namePH;
  document.getElementById('l-affil').innerHTML = s.lAffilLabel + ' <span class="optional">' + s.lNameOpt + '</span>';
  document.getElementById('inp-affiliation').placeholder = s.lAffilPH;
  document.getElementById('l-email').innerHTML = s.lEmail + ' <span class="req">*</span>';
  document.getElementById('inp-email').placeholder = s.lEmailPH;
  document.getElementById('l-content').innerHTML = s.lContent + ' <span class="req">*</span>' + s.lContentMax;
  document.getElementById('inp-content').placeholder = s.lContentPH;

  document.getElementById('f-pay-title').textContent = s.fPayTitle;
  document.getElementById('f-pay-note').textContent = s.fPayNote;
  document.getElementById('tab-card-label').textContent = s.tabCard;
  document.getElementById('tab-coupon-label').textContent = s.tabCoupon;
  document.getElementById('inp-coupon').placeholder = s.couponPH;
  document.getElementById('btn-apply-label').textContent = s.couponApply;
  document.getElementById('btn-submit-label').textContent = couponValid && activeTab === 'coupon' ? s.submitFree : s.submit500;

  // 完了・寄付
  document.getElementById('s-title').textContent = s.sTitle;
  document.getElementById('s-body').textContent = s.sBody;
  document.getElementById('s-note').textContent = s.sNote;
  document.getElementById('d-title').textContent = s.dTitle;
  document.getElementById('d-body').textContent = s.dBody;
  document.getElementById('d-btn-label').textContent = s.dBtn;
  document.getElementById('d-disclaimer').innerHTML = s.dDisclaimer;

  // 言語ボタンのスタイル切替
  document.getElementById('btn-ja').style.background = lang === 'ja' ? '#8b1a2a' : '#fff';
  document.getElementById('btn-ja').style.color      = lang === 'ja' ? '#fff' : '#8b1a2a';
  document.getElementById('btn-en').style.background = lang === 'en' ? '#8b1a2a' : '#fff';
  document.getElementById('btn-en').style.color      = lang === 'en' ? '#fff' : '#8b1a2a';
}

// ─── モーダル ───────────────────────────────────────────
function agreeAndOpen() {
  document.getElementById('disclaimer-modal').style.display = 'none';
  document.getElementById('main-content').classList.remove('hidden');
  initStripe();
  initPaymentIntent();
}

// ─── Stripe ────────────────────────────────────────────
var stripe, cardElement, paymentIntentClientSecret;

function initStripe() {
  stripe = Stripe(STRIPE_KEY);
  var elements = stripe.elements();
  cardElement = elements.create('card', {
    style: { base: { fontSize: '16px', color: '#1a1a1a', '::placeholder': { color: '#aaa' } } }
  });
  cardElement.mount('#card-element');
  cardElement.on('change', function(e) {
    document.getElementById('card-errors').textContent = e.error ? e.error.message : '';
  });
}

async function initPaymentIntent() {
  try {
    var res = await fetch(API_BASE + '/api/create-payment-intent', { method: 'POST' });
    var data = await res.json();
    paymentIntentClientSecret = data.clientSecret;
  } catch(e) { console.warn('PaymentIntent init failed:', e); }
}

// ─── 文字数 ────────────────────────────────────────────
document.getElementById('inp-content').addEventListener('input', function() {
  document.getElementById('char-count').textContent = this.value.length;
});

// ─── タブ ──────────────────────────────────────────────
var activeTab = 'stripe';

document.getElementById('tab-btn-stripe').addEventListener('click', function() { setTab('stripe'); });
document.getElementById('tab-btn-coupon').addEventListener('click', function() { setTab('coupon'); });

function setTab(tab) {
  activeTab = tab;
  document.getElementById('tab-btn-stripe').classList.toggle('active', tab === 'stripe');
  document.getElementById('tab-btn-coupon').classList.toggle('active', tab === 'coupon');
  document.getElementById('tab-stripe').classList.toggle('active', tab === 'stripe');
  document.getElementById('tab-coupon').classList.toggle('active', tab === 'coupon');
  updateSubmitLabel();
}

// ─── クーポン ──────────────────────────────────────────
var couponValid = false;

document.getElementById('btn-apply-coupon').addEventListener('click', function() {
  var code = document.getElementById('inp-coupon').value.trim();
  var statusEl = document.getElementById('coupon-status');
  var s = I18N[currentLang];
  if (code === VALID_COUPON) {
    couponValid = true;
    statusEl.textContent = s.couponOk;
    statusEl.className = 'coupon-status ok';
  } else {
    couponValid = false;
    statusEl.textContent = s.couponErr;
    statusEl.className = 'coupon-status err';
  }
  updateSubmitLabel();
});

function updateSubmitLabel() {
  var s = I18N[currentLang];
  document.getElementById('btn-submit-label').textContent =
    (activeTab === 'coupon' && couponValid) ? s.submitFree : s.submit500;
}

// ─── 送信 ──────────────────────────────────────────────
document.getElementById('btn-submit').addEventListener('click', async function() {
  var s = I18N[currentLang];
  var name        = document.getElementById('inp-name').value.trim();
  var affiliation = document.getElementById('inp-affiliation').value.trim();
  var email       = document.getElementById('inp-email').value.trim();
  var content     = document.getElementById('inp-content').value.trim();
  var errorEl     = document.getElementById('form-error');
  var submitBtn   = document.getElementById('btn-submit');
  errorEl.textContent = '';

  if (!email || !content) { errorEl.textContent = s.errRequired; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errorEl.textContent = s.errEmail; return; }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span>' + s.sending;

  var useCoupon = (activeTab === 'coupon' && couponValid);
  var paymentIntentId = null;

  if (!useCoupon) {
    if (!stripe || !paymentIntentClientSecret) {
      errorEl.textContent = s.errInit;
      submitBtn.disabled = false;
      updateSubmitLabel();
      return;
    }
    var result = await stripe.confirmCardPayment(paymentIntentClientSecret, {
      payment_method: { card: cardElement }
    });
    if (result.error) {
      errorEl.textContent = result.error.message;
      submitBtn.disabled = false;
      updateSubmitLabel();
      return;
    }
    paymentIntentId = result.paymentIntent.id;
  }

  try {
    var res = await fetch(API_BASE + '/api/submit-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || '（未入力 / Not provided）',
        affiliation: affiliation || '（未入力 / Not provided）',
        email, content,
        paymentIntentId: useCoupon ? undefined : paymentIntentId,
        couponCode: useCoupon ? document.getElementById('inp-coupon').value.trim() : undefined
      })
    });
    var data = await res.json();
    if (data.success) {
      document.getElementById('form-view').classList.add('hidden');
      document.getElementById('success-view').classList.remove('hidden');
    } else {
      errorEl.textContent = data.error || s.errGeneral;
      submitBtn.disabled = false;
      updateSubmitLabel();
    }
  } catch(e) {
    errorEl.textContent = s.errNetwork;
    submitBtn.disabled = false;
    updateSubmitLabel();
  }
});

// ─── 寄付 ──────────────────────────────────────────────
var selectedDonateAmount = 200;

document.querySelectorAll('.amount-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    selectedDonateAmount = parseInt(btn.dataset.amount);
    document.querySelectorAll('.amount-btn').forEach(function(b) { b.classList.toggle('selected', b === btn); });
    document.getElementById('btn-donate').innerHTML =
      '☕ ¥' + selectedDonateAmount.toLocaleString() + ' <span id="d-btn-label">' + I18N[currentLang].dBtn + '</span>';
  });
});

document.getElementById('btn-donate').addEventListener('click', async function() {
  var s = I18N[currentLang];
  var btn = document.getElementById('btn-donate');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="border-top-color:#1a237e;border-color:rgba(26,35,126,0.2);"></span>' + s.sending;

  try {
    var res = await fetch(API_BASE + '/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: selectedDonateAmount, type: 'donation' })
    });
    var data = await res.json();
    if (data.clientSecret && stripe) {
      var result = await stripe.confirmCardPayment(data.clientSecret, { payment_method: { card: cardElement } });
      if (result.error) {
        alert(result.error.message);
      } else {
        btn.textContent = s.dThanks;
        btn.style.background = '#4caf50'; btn.style.color = '#fff';
        setTimeout(function() {
          btn.innerHTML = '☕ ¥' + selectedDonateAmount.toLocaleString() + ' <span id="d-btn-label">' + s.dBtn + '</span>';
          btn.style.background = '#fff'; btn.style.color = '#1a237e'; btn.disabled = false;
        }, 4000);
        return;
      }
    }
  } catch(e) { alert(s.errNetwork); }

  btn.innerHTML = '☕ ¥' + selectedDonateAmount.toLocaleString() + ' <span id="d-btn-label">' + s.dBtn + '</span>';
  btn.disabled = false;
});

// ─── 初期化 ────────────────────────────────────────────
setLang(currentLang);
