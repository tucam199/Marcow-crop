import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
  }

  // Server-side credentials (NOT exposed to client)
  const validAccounts = [
    {
      username: process.env.AUTH_USER1_USERNAME,
      password: process.env.AUTH_USER1_PASSWORD,
    },
    {
      username: process.env.AUTH_USER2_USERNAME,
      password: process.env.AUTH_USER2_PASSWORD,
    },
  ];

  const matchedAccount = validAccounts.find(
    (acc) => acc.username && acc.password && acc.username === username && acc.password === password
  );

  if (!matchedAccount) {
    return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
  }

  // Generate a signed token (HMAC) so we can verify later without state
  const secret = process.env.AUTH_SECRET || 'marcow-default-secret-change-me';
  const payload = JSON.stringify({ username, ts: Date.now() });
  const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return res.status(200).json({
    success: true,
    token: `${Buffer.from(payload).toString('base64')}.${token}`,
    username,
  });
}
