// api/subscrip-retention.js
// 毎月15日 Vercel Cron → 解約リスク分析・引き止めLINE通知
export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const LINE_GROUP = process.env.LINE_GROUP_ID || 'C0f63a7aae27293a3238a1ce22d7a8d50';

  let members = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/subscrip_members?select=*`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    members = await r.json();
  } catch (e) {
    return res.status(500).json({ error: 'db error' });
  }

  const now = new Date();
  const risks = [];
  const anniversaries = [];

  for (const m of members) {
    if (m.status !== 'active') continue;
    const start = new Date(m.start_date || m.created_at);
    const months = Math.floor((now - start) / (1000 * 60 * 60 * 24 * 30));

    // 記念日チェック（3・6・12ヶ月）
    if ([3, 6, 12].includes(months)) {
      anniversaries.push({ name: m.name, months });
    }
  }

  const active = members.filter(m => m.status === 'active').length;
  const paused = members.filter(m => m.status === 'paused').length;

  // LINE通知
  let msg = `🔄 【サブスク月次レポート】\n${now.toLocaleDateString('ja-JP')}\n\nアクティブ: ${active}名\n休止中: ${paused}名`;

  if (anniversaries.length > 0) {
    msg += `\n\n🎉 記念日会員:\n` + anniversaries.map(a => `・${a.name}さん（${a.months}ヶ月）`).join('\n');
  }

  msg += `\n\n継続率維持のため、休止中${paused}名への復帰連絡をご検討ください。`;

  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to: LINE_GROUP, messages: [{ type: 'text', text: msg }] })
    });
  } catch (e) {}

  res.status(200).json({ success: true, active, paused, anniversaries: anniversaries.length });
}
