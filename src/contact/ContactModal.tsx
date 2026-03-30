import React, { FC, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Alert,
  Collapse,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import FavoriteIcon from "@mui/icons-material/Favorite";

const API_BASE = "https://bwm-backend.vercel.app"; // デプロイ後のURLに合わせて変更

// ─── お問い合わせフォーム ───────────────────────────────────────
const ContactForm: FC<{ onClose: () => void }> = ({ onClose }) => {
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async () => {
    if (!name || !affiliation || !email || !message) {
      setResult({ type: "error", text: "すべての必須項目を入力してください。" });
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, affiliation, email, message, coupon: coupon || undefined }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({ type: "success", text: data.message });
      } else if (data.checkout_url) {
        // Stripe決済ページを新しいタブで開く
        window.open(data.checkout_url, "_blank");
        setResult({
          type: "success",
          text: "決済ページを開きました。支払い完了後、お問い合わせが送信されます。",
        });
      } else {
        setResult({ type: "error", text: data.error || "エラーが発生しました。" });
      }
    } catch {
      setResult({ type: "error", text: "通信エラーが発生しました。ネットワーク接続を確認してください。" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* ── 注意書き ── */}
      <Alert severity="info" sx={{ mb: 2, fontSize: "0.82rem" }}>
        このお問い合わせフォームは <strong>Better Waseda Moodle 改</strong> に関する要望専用です。
        Waseda Moodle 自体・授業・学校に関するお問い合わせには対応できません。
        <br />
        本サービスは早稲田大学・大学事務局・Moodle とは一切関係のない非公式ツールです。
      </Alert>

      <TextField
        label="お名前 *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="dense"
        size="small"
      />
      <TextField
        label="所属（学部・研究科など） *"
        value={affiliation}
        onChange={(e) => setAffiliation(e.target.value)}
        fullWidth
        margin="dense"
        size="small"
      />
      <TextField
        label="メールアドレス *"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        margin="dense"
        size="small"
      />
      <TextField
        label="ご要望・お問い合わせ内容 *"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        fullWidth
        multiline
        minRows={4}
        margin="dense"
        size="small"
        placeholder="機能追加のご要望、バグ報告、改善提案などをお書きください。"
      />

      <Divider sx={{ my: 2 }} />

      {/* ── クーポン or 支払い ── */}
      <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
        送信には <strong>¥500</strong> の手数料が必要です。クーポンコードをお持ちの場合は無料で送信できます。
      </Typography>
      <TextField
        label="クーポンコード（お持ちの場合）"
        value={coupon}
        onChange={(e) => setCoupon(e.target.value)}
        fullWidth
        margin="dense"
        size="small"
        placeholder="クーポンコードを入力"
      />

      <Collapse in={!!result}>
        {result && (
          <Alert severity={result.type} sx={{ mt: 2 }}>
            {result.text}
          </Alert>
        )}
      </Collapse>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
        >
          {coupon ? "無料で送信" : "¥500 で送信"}
        </Button>
      </Box>
    </Box>
  );
};

// ─── 寄付フォーム ─────────────────────────────────────────────
const DonationForm: FC = () => {
  const [amount, setAmount] = useState<number | null>(null);
  const [donorName, setDonorName] = useState("");
  const [donorMessage, setDonorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const AMOUNTS = [500, 1000, 3000, 5000];

  const handleDonate = async () => {
    if (!amount) {
      setResult({ type: "error", text: "金額を選択してください。" });
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, name: donorName, message: donorMessage }),
      });
      const data = await res.json();

      if (data.checkout_url) {
        window.open(data.checkout_url, "_blank");
        setResult({
          type: "success",
          text: "決済ページを開きました。ご支援ありがとうございます！",
        });
      } else {
        setResult({ type: "error", text: data.error || "エラーが発生しました。" });
      }
    } catch {
      setResult({ type: "error", text: "通信エラーが発生しました。" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, fontSize: "0.82rem" }}>
        いただいた応援は Waseda Moodle をより使いやすくするための開発・維持費用に活用されます。
        <br />
        本サービスは早稲田大学・大学事務局・Moodle とは一切関係のない非公式ツールです。
      </Alert>

      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
        金額を選択してください
      </Typography>
      <ToggleButtonGroup
        value={amount}
        exclusive
        onChange={(_, v) => v !== null && setAmount(v)}
        sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}
      >
        {AMOUNTS.map((a) => (
          <ToggleButton key={a} value={a} sx={{ minWidth: 80 }}>
            ¥{a.toLocaleString()}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <TextField
        label="お名前（任意・Slackに表示されます）"
        value={donorName}
        onChange={(e) => setDonorName(e.target.value)}
        fullWidth
        margin="dense"
        size="small"
        placeholder="匿名"
      />
      <TextField
        label="応援メッセージ（任意）"
        value={donorMessage}
        onChange={(e) => setDonorMessage(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        margin="dense"
        size="small"
      />

      <Collapse in={!!result}>
        {result && (
          <Alert severity={result.type} sx={{ mt: 2 }}>
            {result.text}
          </Alert>
        )}
      </Collapse>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleDonate}
          disabled={loading || !amount}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : <FavoriteIcon />
          }
        >
          ¥{(amount || 0).toLocaleString()} 応援する
        </Button>
      </Box>
    </Box>
  );
};

// ─── メインモーダル ────────────────────────────────────────────
type Tab = "contact" | "donation";

export const ContactModal: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [tab, setTab] = useState<Tab>("contact");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          {tab === "contact" ? "📬 お問い合わせ・ご要望" : "💝 開発を応援する"}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* タブ切り替え */}
      <Box sx={{ px: 3, pb: 1 }}>
        <ToggleButtonGroup
          value={tab}
          exclusive
          onChange={(_, v) => v && setTab(v)}
          size="small"
          fullWidth
        >
          <ToggleButton value="contact">📬 お問い合わせ</ToggleButton>
          <ToggleButton value="donation">💝 応援（寄付）</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <DialogContent>
        {tab === "contact" && <ContactForm onClose={onClose} />}
        {tab === "donation" && <DonationForm />}
      </DialogContent>
    </Dialog>
  );
};
