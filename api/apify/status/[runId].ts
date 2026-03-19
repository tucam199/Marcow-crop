import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { runId } = req.query;
  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    return res.status(400).json({ error: 'APIFY_API_TOKEN not configured' });
  }

  try {
    const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lỗi kiểm tra trạng thái (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    res.json({
      status: data.data.status,
      datasetId: data.data.defaultDatasetId
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
