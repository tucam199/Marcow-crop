// Gemini API calls are made DIRECTLY from the browser
// The API key is fetched from /api/get-config (requires authentication)
// This avoids Vercel's 10s serverless function timeout

import { GoogleGenAI } from "@google/genai";

let cachedApiKey: string | null = null;

async function getGeminiApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");
  }

  const response = await fetch("/api/get-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: "Unknown error" }));
    if (response.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
    }
    throw new Error(errData.error || "Không thể lấy cấu hình API");
  }

  const data = await response.json();
  cachedApiKey = data.geminiKey;
  return cachedApiKey!;
}

// Clear cached key (e.g., when user logs out or key becomes invalid)
export function clearCachedApiKey() {
  cachedApiKey = null;
}

async function callGeminiDirect(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  const apiKey = await getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: params.model,
    contents: params.contents,
    config: params.config || undefined,
  });

  return response;
}

export async function generateScriptFromImage(
  image: { mimeType: string; data: string },
  characters?: { id: string; name: string; image: string; isSelected: boolean }[],
  textContext?: string
) {
  const selectedCharacters = characters?.filter(c => c.isSelected).map(c => c.name) || [];
  const characterNames = selectedCharacters.length > 0 ? selectedCharacters : ["Character 1", "Character 2"];
  
  const textContextPrompt = textContext ? `\n\n[NỘI DUNG BÀI VIẾT GỐC (ĐỂ THAM KHẢO LÀM CỐT TRUYỆN)]\n${textContext}` : '';

  const prompt = `Phân tích hình ảnh này và tạo kịch bản truyện tranh.${textContextPrompt}

LƯU Ý TỐI QUAN TRỌNG VỀ ĐỊNH DANH VÀ MIÊU TẢ NHÂN VẬT:
- BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC tự đặt tên nhân vật dựa trên ngoại hình hoặc loài vật (VÍ DỤ: CẤM DÙNG "CHARACTER_BULL", "CHARACTER_BEAR", "BULL", "BEAR", "BOY", "GIRL").
- BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC miêu tả ngoại hình, giống loài, hay trang phục của nhân vật trong bất kỳ trường dữ liệu nào (scene, action, expression). Ví dụ: Cấm viết "Character 1, a bull dressed in Middle Eastern attire, is walking". Bạn XÓA HOÀN TOÀN phần miêu tả ngoại hình và CHỈ tập trung vào hành động.
- Để miêu tả nhân vật, bạn CHỈ ĐƯỢC PHÉP mô tả 'trạng thái', 'biểu cảm' và 'hành động' của định danh nhân vật đó (Ví dụ chuẩn: "Character 1 is walking precariously across the bridge"). 
- BẠN CHỈ ĐƯỢC PHÉP sử dụng các định danh sau đây cho các nhân vật xuất hiện trong ảnh: ${characterNames.map(n => `"${n}"`).join(", ")}.
- Nếu trong ảnh có 2 nhân vật, hãy gọi chúng là "${characterNames[0] || "Character 1"}" và "${characterNames[1] || "Character 2"}".

[CẤU TRÚC JSON TIÊU CHUẨN (SCHEMA)]
Bạn BẮT BUỘC phải trả về kết quả tuân thủ chính xác cấu trúc JSON sau, không được thêm bớt các key:

{
  "request_type": "generate_panels",
  "global_settings": {
     "aspect_ratio": "[Tỷ lệ khung hình: 1:1, 4:3, hoặc 16:9]",
     "character_refs": [${characterNames.map(n => `"${n}"`).join(", ")}]
  },
  "panels": [
    {
      "panel_id": [Số thứ tự khung truyện, bắt đầu từ 1],
      "characters_involved": ["[Danh sách nhân vật CÓ MẶT trong khung này, CHỈ DÙNG các định danh đã cho ở trên]"],
      "scene": "[Mô tả ngắn gọn bối cảnh nền, tuyệt đối bỏ qua ngoại hình/loài của nhân vật]",
      "action": "[Mô tả chi tiết hành động vật lý, tư thế của từng nhân vật]",
      "expression": "[Mô tả chi tiết biểu cảm khuôn mặt của từng nhân vật]",
      "dialogue": "[Nội dung hội thoại text]"
    }
  ]
}

[ĐỊNH DẠNG ĐẦU RA]
Chỉ trả về duy nhất một khối mã định dạng JSON hợp lệ. Không kèm theo bất kỳ văn bản giải thích, chào hỏi hay bình luận nào bên ngoài khối JSON.`;

  const response = await callGeminiDirect({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        { inlineData: image },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json"
    }
  });

  return response.text;
}

export async function generateImagePromptsFromJson(
  script: string,
  artStyle: string,
  aspectRatio: string,
  characters: { id: string; name: string }[]
) {
  const characterRefs = characters.map((c, i) => `[REF_IMG_0${i + 1}] cho nhân vật "${c.name}"`).join(", ");

  const prompt = `Bạn là một chuyên gia Prompt Engineering hệ thống chuyên chuyển đổi các yêu cầu thiết kế truyện tranh (Manga/Comic) từ ngôn ngữ tự nhiên tiếng Việt thành các 'Image Generation Prompts' tối ưu bằng tiếng Anh.
Nhiệm vụ của bạn là nhận một chuỗi dữ liệu JSON (hoặc văn bản có cấu trúc) mô tả các khung truyện (panels), phong cách, nhân vật, và bối cảnh. Sau đó, bạn phải dịch, tổ chức lại và xuất ra một cấu trúc JSON chứa các prompt chuẩn xác để hệ thống backend gọi API tạo ảnh.

Yêu cầu bắt buộc:
- Luôn dịch các mô tả bối cảnh, biểu cảm, tư thế sang tiếng Anh chuyên ngành nhiếp ảnh/truyện tranh.
- Giữ nguyên cấu trúc phong cách (Art Style) ở đầu mỗi prompt.
- Tách biệt phần hội thoại (Dialogue) ra khỏi prompt tạo ảnh.

Thông tin đầu vào:
- Art Style: ${artStyle}
- Aspect Ratio: --ar ${aspectRatio}
- Character Refs: ${characterRefs || "Không có"}
- Kịch bản gốc:
${script}

Công thức chuẩn cho image_api_prompt:
[art_style], character [character_ref], [character_pose], [character_expression], [scene_context], highly detailed, cinematic lighting, 8k resolution [aspect_ratio]

Mẫu JSON AI Studio cần trả về:
{
  "project_status": "success",
  "total_panels": 2,
  "panels": [
    {
      "panel_id": 1,
      "image_api_prompt": "Japanese Manga, black and white ink, character [REF_IMG_01], holding head with both hands, extremely panicked expression, sweating, messy office background with a blue computer screen, highly detailed, cinematic lighting, 8k resolution --ar 4:3",
      "text_bubble_overlay": "Trời ơi, bay màu cái ổ cứng rồi!",
      "in_painting_prompt": null
    },
    {
      "panel_id": 2,
      "image_api_prompt": "Japanese Manga, black and white ink, character [REF_IMG_01], lying flat on the floor, exhausted expression, soul leaving the body, messy office background, top-down shot, highly detailed --ar 4:3",
      "text_bubble_overlay": "Hết cứu...",
      "in_painting_prompt": null
    }
  ]
}

Xử lý logic cho tính năng "Custom Vùng Riêng" (In-painting):
Nếu kịch bản có yêu cầu "Masking" hoặc "in-paint" cho một vùng cụ thể (ví dụ: mask_area: "áo sơ mi", new_request: "đổi thành áo thun siêu nhân"), hãy tạo in_painting_prompt riêng cho vùng đó.
Ví dụ in_painting_prompt: "Superman t-shirt, highly detailed, matching the existing Japanese Manga black and white ink style".

Chỉ trả về duy nhất một khối mã định dạng JSON hợp lệ. Không kèm theo bất kỳ văn bản giải thích nào.`;

  const response = await callGeminiDirect({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  return response.text;
}

export async function generatePanelImage(
  prompt: string,
  aspectRatio: string,
  referenceImages?: {
    name?: string;
    image: { mimeType: string; data: string };
  }[],
) {
  const parts: any[] = [];

  if (referenceImages && referenceImages.length > 0) {
    referenceImages.forEach((ref) => {
      if (ref.name) {
        parts.push({ text: `Reference image for character "${ref.name}":` });
      }
      parts.push({ inlineData: ref.image });
    });
  }

  parts.push({ text: prompt });

  const response = await callGeminiDirect({
    model: "gemini-3.1-flash-image-preview",
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "1K",
      },
    },
  });

  // Extract image from candidates
  if (response.candidates) {
    for (const part of response.candidates[0]?.content?.parts || []) {
      if ((part as any).inlineData) {
        const inlineData = (part as any).inlineData;
        return `data:${inlineData.mimeType};base64,${inlineData.data}`;
      }
    }
  }
  throw new Error("No image generated");
}

export async function generatePostCaptionFromImage(
  imageDataUrl: string,
  script?: string
) {
  const match = imageDataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) return "";
  const mimeType = match[1];
  const data = match[2];

  const scriptPrompt = script ? `\n\n[KỊCH BẢN THAM KHẢO]\n${script}` : "";
  const prompt = `Bạn là một nhà sáng tạo nội dung mạng xã hội (Social Media Creator) sành điệu (Gen-Z), hài hước và rất bắt trend. Dựa vào bức ảnh truyện tranh vừa được tạo ở trên${scriptPrompt}, hãy viết một Nội dung chữ (Post caption) siêu thu hút để Đăng Bài Lên Facebook. BẮT BUỘC: Viết siêu ngắn gọn (1-3 dòng), đánh trúng tâm lý, vui nhộn, chơi chữ sắc sảo, trêu đùa, hoặc cực kỳ triết lý và liên quan mật thiết đến tình huống trong bức ảnh. Thêm 1-2 emoji hợp lý. KẾT QUẢ TRẢ VỀ CHỈ CHỨA NỘI DUNG CAPTION, KHÔNG GIẢI THÍCH, KHÔNG CHÀO HỎI, KHÔNG BAO GỒM DẤU NGOẶC KÉP QUANH KẾT QUẢ.`;

  const response = await callGeminiDirect({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        { inlineData: { mimeType, data } },
        { text: prompt }
      ]
    }
  });

  return response.text;
}
