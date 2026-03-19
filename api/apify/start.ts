import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, urls, startDate } = req.body;
  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    return res.status(400).json({ error: 'Chưa cấu hình APIFY_API_TOKEN trong Settings > Secrets.' });
  }

  try {
    let cleanStartUrls: any[] = [];
    const targetUrls = Array.isArray(urls) ? urls : (url ? [url] : []);

    for (const item of targetUrls) {
      let u = '';
      if (typeof item === 'string') u = item;
      else if (item && typeof item === 'object' && item.url) u = item.url;

      u = u.replace(/[\"\'\[\]]/g, '').trim();

      if (u.startsWith('http')) {
        cleanStartUrls.push({ url: u });
      }
    }

    if (cleanStartUrls.length === 0) {
      return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất 1 đường link Fanpage hợp lệ.' });
    }

    const input: any = {
      startUrls: cleanStartUrls,
      resultsLimit: 15,
    };

    if (startDate) {
      input.oldestPostDate = startDate;
    }

    const response = await fetch(`https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lỗi từ Apify (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    res.json({ runId: data.data.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
