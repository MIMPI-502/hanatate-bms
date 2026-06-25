export default async function handler(req, res) {
  // LINEからのWebhookを受信してグループIDを取得
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true });
  }
  
  const events = req.body?.events || [];
  
  for (const event of events) {
    const source = event.source;
    if (source?.type === 'group') {
      console.log('LINE Group ID:', source.groupId);
    }
    if (source?.type === 'room') {
      console.log('LINE Room ID:', source.roomId);
    }
  }
  
  res.status(200).json({ ok: true });
}
