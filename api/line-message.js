export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { message } = req.body;
  const token = process.env.LINE_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;

  if (!token) return res.status(400).json({ ok: false, error: 'LINE_TOKEN未設定' });
  if (!groupId) return res.status(400).json({ ok: false, error: 'LINE_GROUP_ID未設定' });
  if (!message) return res.status(400).json({ ok: false, error: 'メッセージが空です' });

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: message }],
      }),
    });
    const data = await response.json();
    res.status(200).json({ 
      ok: response.ok, 
      status: response.status,
      data,
      tokenLength: token.length,
      groupId: groupId
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
