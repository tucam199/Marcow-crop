import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify auth token
  const { token } = req.body || {};
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const secret = process.env.AUTH_SECRET || 'marcow-default-secret-change-me';
    const [payloadBase64, signature] = token.split('.');

    if (!payloadBase64 || !signature) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const payload = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const data = JSON.parse(payload);
    const tokenAge = Date.now() - data.ts;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (tokenAge > maxAge) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Token valid — return the API key
    const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    return res.status(200).json({ geminiKey });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
