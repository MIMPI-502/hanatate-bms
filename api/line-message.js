export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { message } = req.body;
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.LINE_TOKEN,
    },
    body: JSON.stringify({
      to: process.env.LINE_GROUP_ID,
      messages: [{ type: 'text', text: message }],
    }),
  });
  const data = await response.json();
  res.json({ ok: response.ok, data });
}
