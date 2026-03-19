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
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server' });
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
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: error.message || 'Gemini API call failed' });
  }
}
