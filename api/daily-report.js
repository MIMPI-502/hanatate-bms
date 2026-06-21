export default async function handler(req, res) {
  try {
    const headers = {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + process.env.SUPABASE_ANON_KEY,
    };

    const [ecRes, wsRes] = await Promise.all([
      fetch(process.env.SUPABASE_URL + '/rest/v1/ec_orders?select=*', { headers }),
      fetch(process.env.SUPABASE_URL + '/rest/v1/ws_orders?select=*', { headers }),
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
    const unhandled = ecOrders.filter((o) => o.alert);

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
      '✅ 自動Cron稼働確認（毎朝8時送信）',
    ].filter((l) => l !== undefined);

    const lineRes = await fetch('https://' + req.headers.host + '/api/line-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: lines.join('\n') }),
    });
    const lineData = await lineRes.json();

    res.status(200).json({ ok: true, lineData });
  } catch (e) {
    console.log('日次レポートCronエラー:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
