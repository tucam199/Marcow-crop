import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fbTargetId = process.env.FB_TARGET_ID;
  const fbAccessToken = process.env.FB_ACCESS_TOKEN;

  if (!fbTargetId || !fbAccessToken) {
    return res.status(500).json({ error: 'Facebook credentials not configured on server' });
  }

  try {
    // Forward the request body to the webhook, injecting server-side credentials
    const { message, imageBase64 } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    // Create the form data for the webhook
    const formData = new FormData();
    formData.append('message', message);
    formData.append('target_id', fbTargetId);
    formData.append('access_token', fbAccessToken);

    // Convert base64 image to blob if provided
    if (imageBase64) {
      const binaryStr = atob(imageBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });
      formData.append('data', blob, 'comic-page.jpg');
    }

    const webhookUrl = 'https://n8n.tbsupellex.com/webhook/antigravity-fb-post';
    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    if (webhookRes.ok) {
      const data = await webhookRes.text();
      return res.status(200).json({ success: true, data });
    } else {
      const errorText = await webhookRes.text();
      return res.status(webhookRes.status).json({ error: errorText });
    }
  } catch (error: any) {
    console.error('FB Post Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to post to Facebook' });
  }
}
