import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

  app.use(express.json({ limit: '10mb' }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ===== AUTH ROUTES (server-side, secure) =====
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" });
    }

    const validAccounts = [
      { username: process.env.AUTH_USER1_USERNAME, password: process.env.AUTH_USER1_PASSWORD },
      { username: process.env.AUTH_USER2_USERNAME, password: process.env.AUTH_USER2_PASSWORD },
    ];

    const matched = validAccounts.find(
      (acc) => acc.username && acc.password && acc.username === username && acc.password === password
    );

    if (!matched) {
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }

    const secret = process.env.AUTH_SECRET || "marcow-default-secret-change-me";
    const payload = JSON.stringify({ username, ts: Date.now() });
    const token = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return res.status(200).json({
      success: true,
      token: `${Buffer.from(payload).toString("base64")}.${token}`,
      username,
    });
  });

  app.post("/api/verify", (req, res) => {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ valid: false });

    try {
      const secret = process.env.AUTH_SECRET || "marcow-default-secret-change-me";
      const [payloadBase64, signature] = token.split(".");
      if (!payloadBase64 || !signature) return res.status(401).json({ valid: false });

      const payload = Buffer.from(payloadBase64, "base64").toString("utf-8");
      const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      if (signature !== expected) return res.status(401).json({ valid: false });

      const data = JSON.parse(payload);
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (Date.now() - data.ts > maxAge) return res.status(401).json({ valid: false, reason: "Token expired" });

      return res.status(200).json({ valid: true, username: data.username });
    } catch {
      return res.status(401).json({ valid: false });
    }
  });

  // ===== GEMINI PROXY (server-side, keeps API key hidden) =====
  app.post("/api/gemini", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    const { action, model, contents, config: genConfig } = req.body;
    if (!action || !model || !contents) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model,
        contents,
        config: genConfig || undefined,
      });

      // Check for image in response
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        const hasImage = parts.some((p: any) => p.inlineData);
        if (hasImage) {
          return res.status(200).json({ candidates: response.candidates });
        }
      }

      return res.status(200).json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // ===== FACEBOOK POST PROXY (server-side, keeps FB token hidden) =====
  app.post("/api/fb-post", async (req, res) => {
    const fbTargetId = process.env.FB_TARGET_ID;
    const fbAccessToken = process.env.FB_ACCESS_TOKEN;

    if (!fbTargetId || !fbAccessToken) {
      return res.status(500).json({ error: "Facebook credentials not configured" });
    }

    try {
      const { message, imageBase64 } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Missing message" });
      }

      const formData = new FormData();
      formData.append("message", message);
      formData.append("target_id", fbTargetId);
      formData.append("access_token", fbAccessToken);

      if (imageBase64) {
        const binaryStr = atob(imageBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "image/jpeg" });
        formData.append("data", blob, "comic-page.jpg");
      }

      const webhookUrl = "https://n8n.tbsupellex.com/webhook/antigravity-fb-post";
      const webhookRes = await fetch(webhookUrl, { method: "POST", body: formData });

      if (webhookRes.ok) {
        const data = await webhookRes.text();
        return res.status(200).json({ success: true, data });
      } else {
        const errorText = await webhookRes.text();
        return res.status(webhookRes.status).json({ error: errorText });
      }
    } catch (error: any) {
      console.error("FB Post Error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/apify/start", async (req, res) => {
    const { url, urls, startDate, endDate } = req.body;
    const token = process.env.APIFY_API_TOKEN;
    
    if (!token) {
      return res.status(400).json({ error: "Chưa cấu hình APIFY_API_TOKEN trong Settings > Secrets." });
    }

    try {
      // Xử lý urls cực kỳ an toàn
      let cleanStartUrls: any[] = [];
      const targetUrls = Array.isArray(urls) ? urls : (url ? [url] : []);
      
      for (const item of targetUrls) {
        let u = "";
        if (typeof item === 'string') u = item;
        else if (item && typeof item === 'object' && item.url) u = item.url;
        
        // Làm sạch toàn bộ dấu ngoặc kép hoặc khoảng trắng dư thừa mầm bệnh
        u = u.replace(/[\"\'\[\]]/g, '').trim();
        
        if (u.startsWith('http')) {
          cleanStartUrls.push({ url: u });
        }
      }

      if (cleanStartUrls.length === 0) {
        return res.status(400).json({ error: "Vui lòng cung cấp ít nhất 1 đường link Fanpage hợp lệ." });
      }

      // Dựa theo schema của apify~facebook-posts-scraper
      const input: any = {
        startUrls: cleanStartUrls,
        resultsLimit: 15,
      };

      if (startDate) {
        input.oldestPostDate = startDate;
      }

      console.log("Sending request to Apify with input:", JSON.stringify(input));

      const response = await fetch(`https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Apify API Error:", response.status, errorText);
        throw new Error(`Lỗi từ Apify (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      
      res.json({ runId: data.data.id });
    } catch (e: any) {
      console.error("Start Apify Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/apify/status/:runId", async (req, res) => {
    const { runId } = req.params;
    const token = process.env.APIFY_API_TOKEN;
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
  });

  app.get("/api/apify/results/:datasetId", async (req, res) => {
    const { datasetId } = req.params;
    const { startDate, endDate } = req.query;
    const token = process.env.APIFY_API_TOKEN;
    try {
      let response;
      let retries = 3;
      
      while (retries > 0) {
        response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
        if (response.ok) {
          break;
        }
        
        if (response.status >= 500) {
          console.log(`Apify API returned ${response.status}, retrying in 2s... (${retries} retries left)`);
          retries--;
          await new Promise(r => setTimeout(r, 2000));
        } else {
          break;
        }
      }

      if (!response || !response.ok) {
        const errorText = await response?.text() || "Unknown error";
        throw new Error(`Lỗi lấy dữ liệu (${response?.status}): ${errorText}`);
      }
      
      const items = await response.json();
      
      const posts: any[] = [];
      let filteredOutByDate = 0;

      items.forEach((item: any) => {
        // Filter by date range
        if (startDate || endDate) {
          const postDate = new Date(item.time || item.date || item.createdAt);
          if (!isNaN(postDate.getTime())) {
            if (startDate && postDate < new Date(startDate as string)) {
              filteredOutByDate++;
              return;
            }
            if (endDate && postDate > new Date((endDate as string) + 'T23:59:59Z')) {
              filteredOutByDate++;
              return;
            }
          }
        }

        // Extract images and create post objects
        let postImages: string[] = [];

        // Aggressive extraction from 'media' array
        if (item.media && Array.isArray(item.media)) {
          item.media.forEach((mediaItem: any) => {
            if (typeof mediaItem === 'string' && mediaItem.startsWith('http')) {
              postImages.push(mediaItem);
            } else if (typeof mediaItem === 'object' && mediaItem !== null) {
              if (mediaItem.image) postImages.push(mediaItem.image);
              if (mediaItem.url) postImages.push(mediaItem.url);
              if (mediaItem.thumbnail) postImages.push(mediaItem.thumbnail);
              if (mediaItem.src) postImages.push(mediaItem.src);
            }
          });
        }

        // Extract images from attachments (fallback)
        if (item.attachments && Array.isArray(item.attachments)) {
          item.attachments.forEach((att: any) => {
            if (att.media && att.media.image) postImages.push(att.media.image);
            else if (att.type === 'photo' && att.url) postImages.push(att.url);
            else if (att.url) postImages.push(att.url);
          });
        }
        
        // Fallback: Check direct properties
        if (item.image) postImages.push(item.image);
        if (item.images && Array.isArray(item.images)) {
          item.images.forEach((img: string) => postImages.push(img));
        }
        if (item.photo) postImages.push(item.photo);
        if (item.photos && Array.isArray(item.photos)) {
          item.photos.forEach((photo: any) => {
             if (typeof photo === 'string') postImages.push(photo);
             else if (photo.url) postImages.push(photo.url);
          });
        }

        // Filter valid images only (exclude web links, post links, etc.)
        const uniquePostImages = [...new Set(postImages)].filter(url => {
          if (typeof url !== 'string' || url.length < 5) return false;
          // Chặn các link trỏ tiếp tới video/reel của facebook
          if (url.includes('/video/') || url.includes('/videos/') || url.includes('/reel/')) return false;
          // Loại bỏ các đường link không phải file ảnh tĩnh (như link bài viết, link trang của facebook)
          if (url.includes('facebook.com/') && !url.includes('scontent') && !url.includes('fbcdn')) {
            return false; 
          }
          if (url.includes('l.facebook.com')) return false;
          return true;
        });
        
        // Nếu không tìm thấy ảnh nào thoả mãn, bỏ qua bài viết này
        if (uniquePostImages.length === 0) return;

        // Chỉ lấy ảnh đầu tiên đẹp nhất để tránh 1 bài sinh ra nhiều post trùng chữ
        const firstValidImageUrl = uniquePostImages[0];

        posts.push({
          imageUrl: firstValidImageUrl,
          text: item.text || item.message || '',
          likes: item.likes || item.likesCount || 0,
          comments: item.comments || item.commentsCount || 0,
          shares: item.shares || item.sharesCount || 0,
          postUrl: item.url || item.postUrl || '',
          date: item.time || item.date || item.createdAt || ''
        });
      });
      
      // Lọc trùng lặp bài viết (dựa theo postUrl để loại bỏ hoàn toàn việc 1 bài xuất hiện 2 lần)
      const uniquePosts = posts.filter((post, index, self) =>
        index === self.findIndex((t) => t.postUrl === post.postUrl && t.postUrl !== '') ||
        (post.postUrl === '' && index === self.findIndex((t) => t.imageUrl === post.imageUrl))
      );
      
      console.log(`Found ${uniquePosts.length} posts from ${items.length} items (Filtered out by date: ${filteredOutByDate})`);
      
      res.json({ 
        posts: uniquePosts,
        debug: {
          totalItems: items.length,
          filteredOutByDate,
          sampleItem: items.length > 0 ? items[0] : null,
          sampleMedia: items.length > 0 ? items[0].media : null
        }
      });
    } catch (e: any) {
      console.error("Get Results Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
