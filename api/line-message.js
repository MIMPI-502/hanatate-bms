export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { message } = req.body;
  const token = process.env.LINE_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;

  console.log('LINE_TOKEN exists:', !!token, 'length:', token ? token.length : 0);
  console.log('LINE_GROUP_ID:', groupId);

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
  console.log('LINE API status:', response.status, 'response:', JSON.stringify(data));
  res.status(response.ok ? 200 : 400).json({ ok: response.ok, data });
}
