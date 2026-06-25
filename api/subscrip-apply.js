// api/subscrip-apply.js
// 申込フォームからの送信を受け取り、Supabaseに登録してLINE通知
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const LINE_GROUP = process.env.LINE_GROUP_ID || 'C0f63a7aae27293a3238a1ce22d7a8d50';

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch(e) { return res.status(400).json({ error: 'invalid json' }); }

  const { name, email, tel, address, plan, postal } = body;
  if (!name || !email || !plan) return res.status(400).json({ error: '必須項目が不足しています' });

  const PLAN = { ume: { label: '梅プラン', price: 4500, content: '蒲焼2尾' }, take: { label: '竹プラン', price: 8000, content: '蒲焼4尾' } };
  const planInfo = PLAN[plan] || PLAN.ume;
  const id = 'sub_' + Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const fullAddress = postal ? `〒${postal} ${address}` : address;

  // Supabaseに登録
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/subscrip_members`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ id, name, email, tel: tel||'', plan, address: fullAddress||'', start_date: today, status: 'active', charge_count: 0, created_at: new Date().toISOString() })
    });
    if (!r.ok) {
      const e = await r.json();
      return res.status(500).json({ error: 'DB登録エラー', detail: e });
    }
  } catch(e) {
    return res.status(500).json({ error: 'DB接続エラー' });
  }

  // LINE通知
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({
        to: LINE_GROUP,
        messages: [{ type: 'text', text: `🎉 新規サブスク申込！\n\nお名前: ${name}\nプラン: ${planInfo.label}（¥${planInfo.price.toLocaleString()}/月）\nメール: ${email}\n電話: ${tel||'未記入'}\n住所: ${fullAddress||'未記入'}\n\n申込日: ${today}` }]
      })
    });
  } catch(e) { console.error('line error', e); }

  res.status(200).json({ success: true, message: '申込完了' });
}
