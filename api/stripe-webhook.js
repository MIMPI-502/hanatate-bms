// api/stripe-webhook.js
// Stripe月次決済Webhook受信 → Supabaseに記録 → LINE通知
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const LINE_GROUP = process.env.LINE_GROUP_ID || 'C0f63a7aae27293a3238a1ce22d7a8d50';

  let event;
  try {
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'invalid json' });
  }

  const type = event.type || '';

  // 決済成功
  if (type === 'invoice.payment_succeeded') {
    const inv = event.data?.object;
    const amount = inv?.amount_paid || 0;
    const customer = inv?.customer_email || inv?.customer || '不明';
    const subscriptionId = inv?.subscription || '';

    // Supabaseに記録
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/subscrip_charges`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 'stripe_' + inv.id,
          member_name: customer,
          plan: 'stripe',
          amount: Math.round(amount / 100),
          status: 'paid',
          charge_date: new Date().toISOString().slice(0, 10),
          stripe_subscription_id: subscriptionId,
          created_at: new Date().toISOString()
        })
      });
    } catch (e) { console.error('supabase error', e); }

    // LINE通知
    try {
      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
        body: JSON.stringify({
          to: LINE_GROUP,
          messages: [{ type: 'text', text: `✅ サブスク決済完了
顧客: ${customer}
金額: ¥${Math.round(amount/100).toLocaleString()}
日時: ${new Date().toLocaleString('ja-JP')}` }]
        })
      });
    } catch (e) { console.error('line error', e); }
  }

  // 決済失敗
  if (type === 'invoice.payment_failed') {
    const inv = event.data?.object;
    const customer = inv?.customer_email || '不明';
    try {
      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
        body: JSON.stringify({
          to: LINE_GROUP,
          messages: [{ type: 'text', text: `⚠️ サブスク決済失敗
顧客: ${customer}
対応が必要です` }]
        })
      });
    } catch (e) {}
  }

  res.status(200).json({ received: true });
}
