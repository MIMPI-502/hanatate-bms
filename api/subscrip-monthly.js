// api/subscrip-monthly.js
// 毎月1日 Vercel Cron で自動実行 → 発送リスト作成・LINE送信
export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const LINE_GROUP = process.env.LINE_GROUP_ID || 'C0f63a7aae27293a3238a1ce22d7a8d50';

  // アクティブ会員取得
  let members = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/subscrip_members?status=eq.active&select=*`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    members = await r.json();
  } catch (e) {
    return res.status(500).json({ error: 'supabase error' });
  }

  const PLAN = { ume: { label: '梅プラン', price: 4500, content: '蒲焼2尾' }, take: { label: '竹プラン', price: 8000, content: '蒲焼4尾' } };
  const today = new Date().toLocaleDateString('ja-JP');
  const total = members.reduce((s, m) => s + (PLAN[m.plan]?.price || 0), 0);

  // 発送リスト作成
  const list = members.map((m, i) =>
    `${i+1}. ${m.name}\n   ${PLAN[m.plan]?.label}（${PLAN[m.plan]?.content}）\n   ${m.address || '住所未登録'}`
  ).join('\n\n');

  const msg = `🐟 【月次サブスク発送リスト】\n${today}\n会員数: ${members.length}名\n月間売上: ¥${total.toLocaleString()}\n\n${list}\n\n発送をよろしくお願いします🙏`;

  // LINE送信
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to: LINE_GROUP, messages: [{ type: 'text', text: msg }] })
    });
  } catch (e) { console.error('line error', e); }

  // 月次ログ記録
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/subscrip_monthly_logs`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'log_' + Date.now(), month: today.slice(0,7), member_count: members.length, total_amount: total, created_at: new Date().toISOString() })
    });
  } catch (e) {}

  res.status(200).json({ success: true, members: members.length, total });
}
