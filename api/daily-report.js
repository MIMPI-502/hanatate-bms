export default async function handler(req, res) {
  // 日本時間8時のみ実行（手動実行は除く）
  const now = new Date();
  const jstHour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
  if (req.query.force !== '1' && jstHour !== 8) {
    return res.status(200).json({ ok: true, skipped: true, jstHour, message: '実行時間外' });
  }
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const LINE_TOKEN = process.env.LINE_TOKEN;
    const LINE_GROUP_ID = process.env.LINE_GROUP_ID;

    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    };

    const [ecRes, wsRes] = await Promise.all([
      fetch(SUPABASE_URL + '/rest/v1/ec_orders?select=*', { headers }),
      fetch(SUPABASE_URL + '/rest/v1/ws_orders?select=*', { headers }),
    ]);
    const ecOrders = ecRes.ok ? await ecRes.json() : [];
    const wsOrders = wsRes.ok ? await wsRes.json() : [];

    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

    const todayShip = ecOrders.filter(
      (o) => o.ship_date === todayStr && !['発送済み', '完了'].includes(o.status)
    );
    const wsShip = wsOrders.filter(
      (w) => w.ship_date === todayStr && w.delivery_status !== '仕入確定'
    );
    const unhandled = ecOrders.filter((o) => o.status === '未対応');

    const dateLabel = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo',
    });

    const lines = [
      '🌅【花立山養鰻】おはようございます',
      `📅 ${dateLabel}`,
      '',
      `📦 本日の発送予定：${todayShip.length}件`,
      ...todayShip.map((o) => `　・${o.customer}（${o.product}）`),
      `🏢 本日の納品予定：${wsShip.length}件`,
      ...wsShip.map((w) => `　・${w.client}（${w.product}）`),
      `⚠️ 要対応：${unhandled.length}件`,
      unhandled.length > 0
        ? `　${unhandled.slice(0, 3).map((o) => o.customer).join('、')}${unhandled.length > 3 ? '...' : ''}`
        : '',
      '',
      '✅ 自動日次レポート（毎朝8時）',
    ].filter((l) => l !== undefined);

    // 直接LINE APIに送信
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + LINE_TOKEN,
      },
      body: JSON.stringify({
        to: LINE_GROUP_ID,
        messages: [{ type: 'text', text: lines.join('\n') }],
      }),
    });

    const lineData = await lineRes.json();
    res.status(200).json({ ok: true, lineData });
  } catch (e) {
    console.log('日次レポートCronエラー:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
