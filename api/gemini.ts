import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 60, // Allow up to 60 seconds for AI generation
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY chưa được cấu hình trên Vercel. Vào Settings > Environment Variables để thêm.' });
  }

  const { action, model, contents, config: genConfig } = req.body;

  if (!action || !model || !contents) {
    return res.status(400).json({ error: 'Missing required fields: action, model, contents' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: genConfig || undefined,
    });

    // For image generation, return the full candidates
    if (response.candidates?.[0]?.content?.parts) {
      const parts = response.candidates[0].content.parts;
      const hasImage = parts.some((p: any) => p.inlineData);

      if (hasImage) {
        return res.status(200).json({
          candidates: response.candidates,
        });
      }
    }

    // For text generation, return the text
    return res.status(200).json({
      text: response.text,
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error?.message || error);
    const errorMsg = error?.message || 'Gemini API call failed';
    if (errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID")) {
      return res.status(401).json({ error: "API Key Gemini không hợp lệ. Vui lòng tạo key mới tại https://aistudio.google.com/apikey" });
    }
    if (errorMsg.includes("quota") || errorMsg.includes("429")) {
      return res.status(429).json({ error: "Đã hết quota API Gemini. Vui lòng chờ hoặc nâng cấp plan." });
    }
    return res.status(500).json({ error: errorMsg });
  }
}
