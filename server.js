require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const cors    = require('cors');
const Anthropic = require('@anthropic-ai/sdk').default ?? require('@anthropic-ai/sdk');

const app    = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const path     = require('path');
const nodemailer = require('nodemailer');

// Gmailトランスポーター
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

app.use(cors());
app.use(express.json());

// ルートアクセス時に caresite.html を返す（static より先に定義）
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'caresite.html'));
});

app.use(express.static('.'));

// チャットボットのシステムプロンプト
const SYSTEM_PROMPT = `あなたは「よりそいケアデザイン」のAI案内スタッフです。
介護特化型のAIホームページ制作サービスについて、丁寧・親しみやすく案内してください。

【会社情報】
サービス名：よりそいケアデザイン
キャッチコピー：そのやさしさ、きちんと伝わっていますか？
対象：介護事業所（訪問介護・デイサービス・グループホームなど）

【提供サービス】
1. ホームページ作成 — 介護業界特化・最短1週間で公開
2. 追加ページ作成 — 既存サイトへのページ追加
3. 採用ページ作成 — 介護人材の採用強化に特化

【料金プラン】
■ 月額管理費：15,000円（税込）
  ・初回5ページまで無料制作（トップ・サービス・会社概要・お問い合わせ・自由枠）
  ・ドメイン・サーバー管理含む
  ・スマホ対応・SSL対応
  ・月1回修正対応
  ※月額管理費に含まれるのは上記のみです

■ 追加ページ作成：1ページあたり10,000円（税込）
  ・スタッフ紹介・よくある質問・ブログなど6ページ目以降の追加ページ

■ 採用ページ作成：15,000円/式（税込）
  ・採用専用ページ一式（求人情報・スタッフの声・応募フォームなど）

■ 初期費用・制作費：0円（初回5ページまで）

料金について質問された場合は、月額管理費・追加ページ費用・採用ページ費用がそれぞれ別であることを必ず明確に伝えてください。

【ご利用の流れ】
1. 無料相談 → 2. ヒアリング・内容確認 → 3. AI制作・デザイン → 4. 確認・修正 → 5. 公開（最短1週間）

【強み】
- 介護業界を熟知したスタッフが丁寧にヒアリング
- AIがデザインに落とし込む → 低コスト・高品質
- 事業所の本物の写真を活用して信頼感を演出
- ご家族にも求職者にも選ばれるページ設計

【営業時間・連絡先】
- 営業時間：平日9:00〜17:00
- 電話番号：050-1793-4141
- メールアドレス：yorisoi.care.design@gmail.com

【よくある質問と回答】
Q: ホームページ制作は本当に無料ですか？
A: はい、初回5ページまでの制作費は無料です。月額管理費15,000円のみでご利用いただけます。初期費用を抑えて安心してスタートしていただけます。

Q: パソコンやホームページの知識がなくても大丈夫ですか？
A: はい、問題ありません。専門的な内容はすべてこちらで対応いたしますので、初めての方でも安心してご利用いただけます。ヒアリングをもとに、わかりやすくご提案いたします。

Q: どのくらいでホームページは完成しますか？
A: 内容にもよりますが、最短1週間で公開が可能です。お急ぎの場合もできる限り柔軟に対応いたしますので、お気軽にご相談ください。

Q: 修正はどこまで対応してもらえますか？
A: 月額管理費内で月1回の軽微な修正に対応しています。

【回答ルール】
- サービス内容を聞かれたときは、必ず各サービスの料金も一緒に答えること
- 料金を案内するときは、月額管理費・追加ページ・採用ページがそれぞれ**別の費用**であることを明確に伝えること
- 「月額15,000円で追加ページも作れる」という誤解を与えないこと
- 回答は簡潔に箇条書きでまとめること
- 日本語で回答すること`;

// お問い合わせフォーム送信エンドポイント
app.post('/api/contact', async (req, res) => {
  const { name, company, email, tel, message } = req.body;

  if (!name || !company || !message || (!email && !tel)) {
    return res.status(400).json({ error: '必須項目が不足しています。' });
  }

  const mailOptions = {
    from: `"よりそいケアデザイン お問い合わせ" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    replyTo: email || '',
    subject: `【お問い合わせ】${company} ${name}様`,
    text: [
      `■ お名前：${name}`,
      `■ 会社名・事業所名：${company}`,
      `■ メールアドレス：${email || '未入力'}`,
      `■ 電話番号：${tel || '未入力'}`,
      `■ お問い合わせ内容：\n${message}`,
    ].join('\n'),
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error('メール送信エラー:', err.message);
    res.status(500).json({ error: 'メール送信に失敗しました。' });
  }
});

// チャットAPIエンドポイント
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages が必要です' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    });

    res.json({ content: response.content[0].text });
  } catch (err) {
    console.error('Claude API エラー:', err.message);
    res.status(500).json({ error: 'AIの応答に失敗しました。しばらくしてからお試しください。' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
  console.log(`スマホからのアクセス: http://192.168.3.5:${PORT}`);
});
