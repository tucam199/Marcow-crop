# Luồng Hệ thống: Từ Martrend tới Đăng bài lên Facebook (n8n)

Tài liệu này mô tả chi tiết quy trình luồng dữ liệu của AI Comic & Meme Studio, từ lúc người dùng chọn ảnh gợi ý (Martrend) cho tới khi một bức ảnh hoàn thiện được đăng tải lên Facebook.

---

## Bước 1: Chọn Tệp/Ảnh Gợi Ý (Martrend Modal)
1. Người dùng mở bảng **Martrend**.
2. Người dùng nhấp chọn một bức ảnh/meme đang thịnh hành (cùng ngữ cảnh bài viết nếu có).
3. Hệ thống sẽ tải ảnh này qua mạng (dưới dạng Blob) và chuyển sang định dạng Base64.

## Bước 2: Sinh Kịch Bản Truyện (Left Sidebar)
1. Hàm `generateScriptFromImage` được gọi, gửi bức ảnh (Base64) và thông tin nhân vật lên mô hình **Gemini 3.1 Pro Preview**.
2. AI phân tích hình ảnh và trả về một cấu trúc JSON chi tiết (bao gồm *scene*, *action*, *expression*, *dialogue*) dành cho thiết kế các khung truyện manga/comic.
   - *Lưu ý:* Ở bước này KHÔNG sinh ra content dành cho mạng xã hội (Post Caption) để giữ sự tập trung vào kịch bản ảnh.
3. Kịch bản JSON này được lưu vào trạng thái `settings.script` và hiển thị trên giao diện cột trái.

## Bước 3: Tạo Trang Truyện Truyện (Right Sidebar)
Khi người dùng bấm nút **"Tạo trang truyện"**:
1. **Dịch Kịch Bản thành Lời Nhắc Ảnh (Prompting):** 
   - Hàm `generateImagePromptsFromJson` gửi kịch bản JSON, phong cách vẽ, và các nhân vật tham chiếu lên AI.
   - AI dịch ngữ cảnh thành các câu lệnh tiếng Anh chuyên ngành nhiếp ảnh (Image Generation Prompts).
2. **Sinh Hình Ảnh (Image Generation):**
   - Vận dụng các Prompt vừa sinh, hệ thống gọi `generatePanelImage` qua dịch vụ **Gemini 3.1 Flash Image**.
   - Trả về sản phẩm là hình ảnh trang truyện hoàn chỉnh dưới định dạng chuỗi Base64.

## Bước 4: Sinh Content Gợi Ý (Post Caption)
Ngay sau khi bức ảnh ở Bước 3 được sinh ra thành công:
1. Hàm `generatePostCaptionFromImage` được tự động nối tiếp.
2. Nó gửi chính **Bức ảnh truyện vừa được vẽ** (cùng với kịch bản gốc) lên **Gemini 3.1 Pro Preview**.
3. AI đóng vai vào một "Social Media Creator" để viết ra Content Gợi Ý (ngắn gọn, hài hước, phong cách Gen-Z, chơi chữ) phù hợp tuyệt đối với hình ảnh vừa tạo.
4. Content này được lưu vào trạng thái `page.postCaption` và được hiển thị ở ô **Content Gợi Ý** bên màn hình thiết kế trung tâm.

## Bước 5: Đăng Lên Facebook Qua N8N (Center Canvas)
Khi người dùng ấn **"Đăng lên Facebook"**:
1. **Tiền Xử Lý Ảnh:**
   - Để tránh lỗi Payload quá giới hạn lưu lượng của Facebook hoặc n8n (Error 413), trình duyệt dùng tính năng Canvas xử lý bức tranh lại (Compressing).
   - Resize ảnh sao cho cạnh lớn nhất không vượt quá `1200px` và nén dưới dạng tệp `JPEG` chất lượng `80%`.
2. **Chuẩn Bị Payload:**
   - Lấy Content Gợi Ý từ `page.postCaption`.
   - Lấy thông tin bảo mật `EAAJ5v...` (access_token) và `61580780799750` (target_id) từ **Biến Môi Trường (Environment Variables - `.env`)**.
   - Gom cục ảnh nén, tiêu đề content, token, target ID nhét chung vào một `FormData`.
3. **Bắn Webhook:**
   - Hệ thống tiến hành POST payload trên vào thẳng Gateway của bạn: `https://n8n.tbsupellex.com/webhook/antigravity-fb-post`.
   - Webhook n8n nhận dữ liệu và thực thi logic Graph API của Meta để xuất bản bài Post với đầy đủ (Hình Ảnh + Content).

---

> *Bất cứ lúc nào bạn cần sửa giao diện/Prompt, hãy đối chiếu các thành phần (LeftSidebar.tsx, RightSidebar.tsx, CenterCanvas.tsx, gemini.ts) tương ứng ở tài liệu này để bảo toàn tính toàn vẹn của luồng API nhé.*
