import React, { useState, useRef, useEffect } from "react";
import { useAppContext } from "../AppContext";
import { generateScriptFromImage } from "../services/gemini";
import MartrendModal from "./MartrendModal";
import {
  Settings,
  BookOpen,
  ChevronDown,
  Upload,
  Loader2,
  X,
  TrendingUp,
} from "lucide-react";

const ART_STYLES = [
  {
    id: "Manga",
    name: "Manga",
    description: "Phong cách truyện tranh Nhật Bản đen trắng truyền thống",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80"
  },
  {
    id: "Manga color",
    name: "Manga color",
    description: "Truyện tranh Nhật Bản có màu sắc rực rỡ",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80"
  },
  {
    id: "Thỏ Bảy Màu",
    name: "Thỏ Bảy Màu",
    description: "Phong cách hoạt hình Việt Nam hài hước, nét vẽ đơn giản",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTabyxGeDx6rsWbyW5hn_BJb2fLafqArtgXLg&s"
  },
  {
    id: "Western Comic",
    name: "Western Comic",
    description: "Truyện tranh siêu anh hùng Âu Mỹ đậm chất hành động",
    image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&q=80"
  },
  {
    id: "Webtoon",
    name: "Webtoon",
    description: "Truyện tranh cuộn dọc Hàn Quốc, màu sắc tươi sáng",
    image: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=400&q=80"
  },
  {
    id: "3D Cartoon",
    name: "3D Cartoon",
    description: "Phong cách hoạt hình 3D giống Pixar/Disney",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80"
  },
  {
    id: "Noir",
    name: "Noir",
    description: "Đen trắng tương phản cao, phong cách trinh thám u ám",
    image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&q=80"
  },
  {
    id: "Watercolor",
    name: "Watercolor",
    description: "Nét vẽ màu nước nhẹ nhàng, nghệ thuật",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80"
  },
  {
    id: "Cyberpunk",
    name: "Cyberpunk",
    description: "Tương lai viễn tưởng, đèn neon rực rỡ",
    image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&q=80"
  },
  {
    id: "Oil Painting",
    name: "Oil Painting",
    description: "Phong cách tranh sơn dầu cổ điển",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80"
  }
];
const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1", iconClass: "w-[16px] h-[16px]" },
  { id: "4:3", label: "4:3", iconClass: "w-[18px] h-[14px]" },
  { id: "9:16", label: "9:16", iconClass: "w-[12px] h-[20px]" },
  { id: "16:9", label: "16:9", iconClass: "w-[20px] h-[12px]" },
];

export default function LeftSidebar() {
  const { settings, setSettings, resetKey } = useAppContext();
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isMartrendOpen, setIsMartrendOpen] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const scriptFileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectMartrendImage = async (imageUrl: string, textContext?: string) => {
    setIsMartrendOpen(false);
    setIsGeneratingScript(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target?.result as string;
          const [prefix, data] = dataUrl.split(",");
          const mimeType = prefix.match(/:(.*?);/)?.[1] || "image/png";

          const scriptJson = await generateScriptFromImage({ mimeType, data }, settings.characters, textContext);
          setSettings((prev) => ({ ...prev, script: scriptJson }));
        } catch (error: any) {
          console.error("Failed to generate script:", error);
          if (
            error?.message?.includes("Requested entity was not found") ||
            error?.message?.includes("PERMISSION_DENIED") ||
            error?.message?.includes("403")
          ) {
            resetKey();
          } else {
            alert("Tạo kịch bản thất bại. Vui lòng kiểm tra API key và thử lại.");
          }
        } finally {
          setIsGeneratingScript(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Failed to fetch image:", error);
      alert("Không thể tải hình ảnh. Vui lòng thử lại.");
      setIsGeneratingScript(false);
    }
  };

  const handleScriptImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGeneratingScript(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target?.result as string;
          const [prefix, data] = dataUrl.split(",");
          const mimeType = prefix.match(/:(.*?);/)?.[1] || "image/png";

          const scriptJson = await generateScriptFromImage({ mimeType, data }, settings.characters);
          setSettings((prev) => ({ ...prev, script: scriptJson }));
        } catch (error: any) {
          console.error("Failed to generate script:", error);
          if (
            error?.message?.includes("Requested entity was not found") ||
            error?.message?.includes("PERMISSION_DENIED") ||
            error?.message?.includes("403")
          ) {
            resetKey();
          } else {
            alert("Tạo kịch bản thất bại. Vui lòng kiểm tra API key và thử lại.");
          }
        } finally {
          setIsGeneratingScript(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      setIsGeneratingScript(false);
    }
  };

  useEffect(() => {
    // No longer need click outside for dropdown since we use a modal
  }, []);

  return (
    <div className="w-[340px] border-r border-stone-200 bg-[#FAF9F6] p-6 flex flex-col gap-8 overflow-y-auto shrink-0">
      {/* Logo Container */}
      <div className="w-full flex justify-between items-center shrink-0">
        <img 
          src="https://matbao.in/wp-content/uploads/2026/03/marcow.png" 
          alt="Logo" 
          className="h-7 object-contain"
        />
        <button 
          onClick={() => setIsMartrendOpen(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#D97757] bg-[#D97757]/5 hover:bg-[#D97757]/10 px-3 py-1.5 rounded-lg transition-colors border border-[#D97757]/20"
        >
          <TrendingUp className="w-4 h-4" />
          Martrend
        </button>
      </div>

      <MartrendModal 
        isOpen={isMartrendOpen} 
        onClose={() => setIsMartrendOpen(false)} 
        onSelectImage={handleSelectMartrendImage} 
      />

      {isStyleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h3 className="text-xl font-semibold text-stone-800">Chọn phong cách vẽ</h3>
              <button
                onClick={() => setIsStyleModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {ART_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setSettings({ ...settings, artStyle: style.id });
                      setIsStyleModalOpen(false);
                    }}
                    className={`flex flex-col text-left rounded-xl overflow-hidden border-2 transition-all ${
                      settings.artStyle === style.id
                        ? "border-[#D97757] ring-4 ring-[#D97757]/10"
                        : "border-stone-100 hover:border-stone-300 hover:shadow-md"
                    }`}
                  >
                    <img 
                      src={style.image} 
                      alt={style.name} 
                      className="w-full h-32 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="p-4 bg-white flex-1">
                      <span className={`block text-sm font-semibold mb-1 ${settings.artStyle === style.id ? "text-[#D97757]" : "text-stone-800"}`}>
                        {style.name}
                      </span>
                      <span className="block text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {style.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div>
        <h2 className="text-base font-semibold text-stone-800 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#D97757]" />
            Kịch bản truyện
          </div>
        </h2>
        <input
          type="file"
          ref={scriptFileInputRef}
          onChange={handleScriptImageUpload}
          accept="image/*"
          className="hidden"
        />
        <div className="relative">
          <textarea
            value={settings.script}
            onChange={(e) => setSettings({ ...settings, script: e.target.value })}
            disabled={isGeneratingScript}
            placeholder="Nhập kịch bản truyện của bạn vào đây. Mô tả các sự kiện, hội thoại và hành động. AI sẽ tạo ra một trang truyện hoàn chỉnh dựa trên kịch bản này..."
            className="w-full bg-white border border-stone-200 rounded-xl p-4 pb-14 text-sm text-stone-800 focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] outline-none resize-none h-[320px] placeholder:text-stone-400 leading-relaxed disabled:bg-stone-50 disabled:text-stone-500"
          />
          <div className="absolute bottom-4 right-4 bg-white rounded-lg">
            <button
              onClick={() => scriptFileInputRef.current?.click()}
              disabled={isGeneratingScript}
              className="flex items-center gap-1.5 text-xs font-medium text-[#D97757] bg-[#D97757]/10 hover:bg-[#D97757]/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Ảnh tham khảo"
            >
              {isGeneratingScript ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {isGeneratingScript ? "Đang xử lý..." : "Ảnh tham khảo"}
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-stone-200" />

      <div>
        <h2 className="text-base font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#D97757]" />
          Cài đặt trang
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-3">
              Phong cách vẽ
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStyleModalOpen(true)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-4 pr-10 py-3 text-sm text-stone-800 focus:outline-none flex items-center justify-between transition-colors hover:border-[#D97757]"
              >
                <span className="truncate font-medium">{settings.artStyle}</span>
              </button>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-400">
                <ChevronDown className="w-5 h-5 transition-transform" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-3">
              Tỉ lệ khung hình
            </label>
            <div className="flex items-center gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() =>
                    setSettings({ ...settings, aspectRatio: ratio.id })
                  }
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl border transition-all ${
                    settings.aspectRatio === ratio.id
                      ? "bg-[#D97757]/10 border-[#D97757] text-[#D97757] font-medium shadow-sm"
                      : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                  }`}
                >
                  <div className={`border-2 rounded-[3px] ${ratio.iconClass} ${settings.aspectRatio === ratio.id ? 'border-[#D97757]' : 'border-stone-400'}`} />
                  <span className="text-[11px]">{ratio.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
