// api/stock-alert.js
// 毎時30分 Vercel Cron → 在庫不足をLINE通知
export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const LINE_TOKEN = process.env.LINE_TOKEN;
  const LINE_GROUP = process.env.LINE_GROUP_ID;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  try {
    const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, { headers });
    const products = prodRes.ok ? await prodRes.json() : [];

    const LOW_STOCK = 3;
    const lowStock = products.filter(p => p.stock !== null && p.stock <= LOW_STOCK && p.stock >= 0);

    if (lowStock.length === 0) {
      return res.status(200).json({ ok: true, message: '在庫問題なし' });
    }

    const now = new Date();
    const lines = [
      '🔴【花立山養鰻】在庫不足アラート',
      `📅 ${now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
      '',
      ...lowStock.map(p => `　・${p.name}（残${p.stock}個）`),
      '',
      '⚡ 早めの補充をご確認ください',
    ];

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_GROUP,
        messages: [{ type: 'text', text: lines.join('\n') }],
      }),
    });

    const lineData = await lineRes.json();
    res.status(200).json({ ok: true, lineData, lowStock: lowStock.length });
  } catch (e) {
    console.log('在庫アラートエラー:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
