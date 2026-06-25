export default async function handler(req, res) {
  const token = process.env.LINE_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;

  // GETでもテスト送信できるようにする
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: '【テスト】LINE通知動作確認 ' + new Date().toLocaleString('ja-JP') }],
      }),
    });
    const data = await response.json();
    res.status(200).json({ 
      ok: response.ok,
      status: response.status,
      lineResponse: data,
      tokenStart: token ? token.substring(0,10) + '...' : 'なし',
      groupId: groupId || 'なし'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
