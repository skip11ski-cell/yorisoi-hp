const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, company, email, tel, message } = req.body;

  if (!name || !company || !message || (!email && !tel)) {
    return res.status(400).json({ error: '必須項目が不足しています。' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

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
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('メール送信エラー:', err.message);
    res.status(500).json({ error: 'メール送信に失敗しました。' });
  }
};
