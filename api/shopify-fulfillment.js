export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const fulfillment = req.body;
    const orderId = fulfillment.order_id;
    const trackingNumber = fulfillment.tracking_number || '未登録';
    const trackingCompany = fulfillment.tracking_company || '';
    const lineItems = fulfillment.line_items || [];
    const productName = lineItems[0]?.name || '不明';

    // Supabaseのec_ordersのステータスを「発送済み」に更新
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    await fetch(`${supabaseUrl}/rest/v1/ec_orders?memo=ilike.*${orderId}*`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ status: '発送済み', alert: false }),
    });

    // LINEに発送通知
    const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const message = `📦【花立山養鰻】発送完了\n📅 ${now}\n\n商品：${productName}\n配送会社：${trackingCompany}\n追跡番号：${trackingNumber}`;

    await fetch(`https://${req.headers.host}/api/line-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    console.log('フルフィルメント処理エラー:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
