// api/alert-check.js
// 毎時0分 Vercel Cron → 未対応アラート・在庫不足をLINE通知
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
    const [ecRes, wsRes, prodRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/ec_orders?select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/ws_orders?select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, { headers }),
    ]);

    const ecOrders = ecRes.ok ? await ecRes.json() : [];
    const wsOrders = wsRes.ok ? await wsRes.json() : [];
    const products = prodRes.ok ? await prodRes.json() : [];

    const now = new Date();
    const unhandled = ecOrders.filter(o => o.status === '未対応');
    const oldUnhandled = unhandled.filter(o => {
      if (!o.created) return false;
      const created = new Date(o.created);
      return (now - created) > 24 * 60 * 60 * 1000;
    });

    const LOW_STOCK = 3;
    const lowStock = products.filter(p => p.stock !== null && p.stock <= LOW_STOCK && p.stock >= 0);

    const lines = [];

    if (oldUnhandled.length > 0) {
      lines.push('⚠️【花立山養鰻】24時間超・未対応アラート');
      lines.push(`📋 未対応件数：${oldUnhandled.length}件`);
      oldUnhandled.slice(0, 5).forEach(o => {
        lines.push(`　・${o.customer}（${o.product}）`);
      });
      if (oldUnhandled.length > 5) lines.push(`　...他${oldUnhandled.length - 5}件`);
    }

    if (lowStock.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push('🔴【花立山養鰻】在庫不足アラート');
      lowStock.forEach(p => {
        lines.push(`　・${p.name}（残${p.stock}個）`);
      });
    }

    if (lines.length === 0) {
      return res.status(200).json({ ok: true, message: 'アラートなし' });
    }

    lines.push('');
    lines.push(`🕐 ${now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);

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
    res.status(200).json({ ok: true, lineData, alerts: lines.length });
  } catch (e) {
    console.log('アラートチェックエラー:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
