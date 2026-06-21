export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const order = req.body;

    const uniqueId =
      'EC-' + Date.now().toString().slice(-6) + '-' +
      Math.random().toString(36).slice(2, 5) + '-' +
      (order.id || order.order_number || '');

    const newOrder = {
      id: uniqueId,
      customer: order.billing_address?.name || order.customer?.first_name
        ? `${order.customer?.last_name || ''} ${order.customer?.first_name || ''}`.trim()
        : (order.billing_address?.name || '不明'),
      type: 'EC',
      product: order.line_items?.[0]?.name || '',
      qty: order.line_items?.[0]?.quantity || 1,
      amount: parseFloat(order.total_price || 0),
      status: '未対応',
      stock: true,
      payment: order.financial_status === 'paid',
      assigned: null,
      ship_date: '',
      created: new Date().toLocaleString('ja-JP'),
      alert: true,
      memo: `Shopify注文番号: ${order.order_number || order.id || ''}`,
    };

    const response = await fetch(process.env.SUPABASE_URL + '/rest/v1/ec_orders', {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + process.env.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(newOrder),
    });

    const data = await response.json();
    console.log('Supabase status:', response.status, JSON.stringify(data));

    if (response.ok) {
      await fetch('https://' + req.headers.host + '/api/line-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:
            `🛒【花立山養鰻】Shopify新規注文\n` +
            `📅 ${new Date().toLocaleString('ja-JP')}\n\n` +
            `顧客：${newOrder.customer}\n` +
            `商品：${newOrder.product}\n` +
            `金額：¥${newOrder.amount.toLocaleString()}`,
        }),
      }).catch((e) => console.log('LINE通知エラー:', e.message));
    }

    res.status(response.ok ? 200 : 400).json({ ok: response.ok, data });
  } catch (e) {
    console.log('Webhook処理エラー:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
