'use strict';

const API_BASE = 'https://better-waseda-moodlekai.vercel.app';
const STRIPE_KEY = 'pk_live_51TEHmODedaFhOLE3hcwZx5kqlwCYYeJdYcvBlNPgwHmmQTDf8K2Eocpz2ED2vr39fwVgUR8Dunoaoe6cNrapc3q7000JQQANdb';
const VALID_COUPON = 'test_betterwasedamoodle_kiminobusato_19980303_hokkaido_humanscience_1J23F072_3826C052';

// ─── Stripe 初期化 ───────────────────────────────────────
let stripe, cardElement, paymentIntentClientSecret;

function initStripe() {
  stripe = Stripe(STRIPE_KEY);
  const elements = stripe.elements();
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
    const res = await fetch(API_BASE + '/api/create-payment-intent', { method: 'POST' });
    const data = await res.json();
    paymentIntentClientSecret = data.clientSecret;
  } catch(e) { console.warn('PaymentIntent init failed:', e); }
}

// ─── モーダル ────────────────────────────────────────────
document.getElementById('btn-agree').addEventListener('click', function() {
  document.getElementById('disclaimer-modal').style.display = 'none';
  document.getElementById('main-content').classList.remove('hidden');
  initStripe();
  initPaymentIntent();
});

document.getElementById('btn-close-modal').addEventListener('click', function() {
  window.close();
  history.back();
});

// ─── 文字数カウンター ────────────────────────────────────
document.getElementById('inp-content').addEventListener('input', function() {
  document.getElementById('char-count').textContent = this.value.length;
});

// ─── タブ切り替え ────────────────────────────────────────
var activeTab = 'stripe';

document.getElementById('tab-btn-stripe').addEventListener('click', function() {
  setTab('stripe');
});
document.getElementById('tab-btn-coupon').addEventListener('click', function() {
  setTab('coupon');
});

function setTab(tab) {
  activeTab = tab;
  document.getElementById('tab-btn-stripe').classList.toggle('active', tab === 'stripe');
  document.getElementById('tab-btn-coupon').classList.toggle('active', tab === 'coupon');
  document.getElementById('tab-stripe').classList.toggle('active', tab === 'stripe');
  document.getElementById('tab-coupon').classList.toggle('active', tab === 'coupon');
  updateSubmitLabel();
}

// ─── クーポン ────────────────────────────────────────────
var couponValid = false;

document.getElementById('btn-apply-coupon').addEventListener('click', function() {
  var code = document.getElementById('inp-coupon').value.trim();
  var statusEl = document.getElementById('coupon-status');
  if (code === VALID_COUPON) {
    couponValid = true;
    statusEl.textContent = '✅ クーポンコードが適用されました（無料で送信できます）';
    statusEl.className = 'coupon-status ok';
  } else {
    couponValid = false;
    statusEl.textContent = '❌ クーポンコードが正しくありません';
    statusEl.className = 'coupon-status err';
  }
  updateSubmitLabel();
});

function updateSubmitLabel() {
  var btn = document.getElementById('btn-submit');
  btn.textContent = (activeTab === 'coupon' && couponValid) ? '送信する（無料）' : '送信する（¥500）';
}

// ─── フォーム送信 ────────────────────────────────────────
document.getElementById('btn-submit').addEventListener('click', async function() {
  var name = document.getElementById('inp-name').value.trim();
  var affiliation = document.getElementById('inp-affiliation').value.trim();
  var email = document.getElementById('inp-email').value.trim();
  var content = document.getElementById('inp-content').value.trim();
  var errorEl = document.getElementById('form-error');
  var submitBtn = document.getElementById('btn-submit');

  errorEl.textContent = '';

  if (!email || !content) {
    errorEl.textContent = 'メールアドレスとお問い合わせ内容は必須です。';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorEl.textContent = 'メールアドレスの形式が正しくありません。';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span>送信中...';

  var useCoupon = (activeTab === 'coupon' && couponValid);
  var paymentIntentId = null;

  if (!useCoupon) {
    if (!stripe || !paymentIntentClientSecret) {
      errorEl.textContent = '決済の初期化に失敗しました。ページを再読み込みしてください。';
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
        name: name || '（未入力）',
        affiliation: affiliation || '（未入力）',
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
      errorEl.textContent = data.error || '送信に失敗しました。しばらく後にお試しください。';
      submitBtn.disabled = false;
      updateSubmitLabel();
    }
  } catch(e) {
    errorEl.textContent = 'ネットワークエラーが発生しました。';
    submitBtn.disabled = false;
    updateSubmitLabel();
  }
});

// ─── 寄付 ────────────────────────────────────────────────
var selectedDonateAmount = 200;

document.querySelectorAll('.amount-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    selectedDonateAmount = parseInt(btn.dataset.amount);
    document.querySelectorAll('.amount-btn').forEach(function(b) {
      b.classList.toggle('selected', b === btn);
    });
    document.getElementById('btn-donate').textContent =
      '☕ ¥' + selectedDonateAmount.toLocaleString() + ' を寄付する';
  });
});

document.getElementById('btn-donate').addEventListener('click', async function() {
  var btn = document.getElementById('btn-donate');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="border-top-color:#1a237e;border-color:rgba(26,35,126,0.2);"></span>処理中...';

  try {
    var res = await fetch(API_BASE + '/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: selectedDonateAmount, type: 'donation' })
    });
    var data = await res.json();
    if (data.clientSecret && stripe) {
      var result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardElement }
      });
      if (result.error) {
        alert('決済に失敗しました: ' + result.error.message);
      } else {
        btn.textContent = '✅ ありがとうございます！';
        btn.style.background = '#4caf50';
        btn.style.color = '#fff';
        setTimeout(function() {
          btn.textContent = '☕ ¥' + selectedDonateAmount.toLocaleString() + ' を寄付する';
          btn.style.background = '#fff';
          btn.style.color = '#1a237e';
          btn.disabled = false;
        }, 4000);
        return;
      }
    }
  } catch(e) {
    alert('ネットワークエラーが発生しました。');
  }

  btn.disabled = false;
  btn.textContent = '☕ ¥' + selectedDonateAmount.toLocaleString() + ' を寄付する';
});
