import React, { useRef } from "react";
import { useAppContext } from "../AppContext";
import { generatePanelImage, generateImagePromptsFromJson } from "../services/gemini";
import { Wand2, Loader2, Image as ImageIcon, Upload, Trash2 } from "lucide-react";

export default function RightSidebar() {
  const { settings, characters, setCharacters, page, setPage, resetKey } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const [prefix, data] = dataUrl.split(",");
        const mimeType = prefix.match(/:(.*?);/)?.[1] || "image/png";

        const newCharId = `char-${Date.now()}-${Math.random()}`;

        setCharacters((prev) => [
          ...prev,
          {
            id: newCharId,
            name: `Character ${prev.length + 1}`,
            image: { mimeType, data },
          },
        ]);

        setPage((prev) => {
          if (prev.characterRefIds.length < 3) {
            return {
              ...prev,
              characterRefIds: [...prev.characterRefIds, newCharId],
            };
          }
          return prev;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!settings.script.trim()) {
      alert("Vui lòng nhập kịch bản truyện ở cột bên trái trước.");
      return;
    }

    setPage((prev) => ({ ...prev, isGenerating: true }));

    try {
      const selectedChars = characters.filter((c) =>
        page.characterRefIds.includes(c.id),
      );

      // 1. Generate the JSON prompts from the script
      const generatedJsonStr = await generateImagePromptsFromJson(
        settings.script,
        settings.artStyle,
        settings.aspectRatio,
        selectedChars
      );

      let stylePrompt = settings.artStyle;
      if (settings.artStyle === "Thỏ Bảy Màu") {
        stylePrompt = `Vietnamese comic style "Thỏ Bảy Màu" (Seven-Color Rabbit). Characteristics: 2D vector illustration, flat vibrant solid colors with no gradients or complex shading, thick consistent black outlines, simple and minimalist cartoonish character designs, dot eyes or very simple shapes for eyes, minimalist facial features, cute and slightly derpy or highly expressive faces, bright and cheerful color palette, clean and simple backgrounds.`;
      }

      let prompt = `A full comic book page with multiple panels. Art Style: ${stylePrompt}.\n\n`;

      if (selectedChars.length > 0) {
        prompt += `CRITICAL CHARACTER CONSISTENCY INSTRUCTION:\n`;
        prompt += `You are provided with ${selectedChars.length} reference image(s) for the main character(s). You MUST use these reference images to design the characters in the comic. Their appearance (face, hair, clothing, colors) MUST match the reference images as closely as possible.\n`;
        selectedChars.forEach((c, index) => {
          prompt += `- Reference Image ${index + 1} is for the character named "${c.name}". Whenever "${c.name}" or "[${c.name.toUpperCase().replace(/\s+/g, "_")}]" is mentioned in the script, you MUST draw the person from Reference Image ${index + 1}.\n`;
        });
        prompt += `\n`;
      }

      prompt += `Story/Script Prompts (JSON):\n${generatedJsonStr}\n\n`;

      prompt += `The image MUST be a complete comic page layout containing multiple panels that tell the story based on the JSON prompts above. Include speech bubbles and comic book formatting. High quality, detailed comic book page.`;

      const referenceImages = selectedChars.map((c) => ({
        name: c.name,
        image: c.image,
      }));

      const imageUrl = await generatePanelImage(
        prompt,
        settings.aspectRatio,
        referenceImages.length > 0 ? referenceImages : undefined,
      );

      setPage((prev) => ({ 
        ...prev, 
        imageUrl, 
        isGenerating: false,
        originalScript: settings.script,
        generatedJson: generatedJsonStr
      }));
    } catch (error: any) {
      console.error("Failed to generate image:", error);
      if (
        error?.message?.includes("Requested entity was not found") ||
        error?.message?.includes("PERMISSION_DENIED") ||
        error?.message?.includes("403")
      ) {
        resetKey();
      } else {
        alert("Tạo ảnh thất bại. Vui lòng kiểm tra API key và thử lại.");
      }
      setPage((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  return (
    <div className="w-[340px] border-l border-stone-200 bg-[#FAF9F6] p-6 flex flex-col gap-8 overflow-y-auto shrink-0">
      <div className="flex-1">
        <h2 className="text-base font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-[#D97757]" />
          Nhân vật tham chiếu
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          Tải lên và chọn tối đa 3 nhân vật để giữ tính nhất quán.
        </p>

        <div className="space-y-4">
          {characters.map((char) => {
            const isSelected = page.characterRefIds.includes(char.id);
            return (
              <div
                key={char.id}
                className={`flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm transition-all ${
                  isSelected
                    ? "border-[#D97757] ring-1 ring-[#D97757] bg-[#D97757]/5"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-center pl-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (isSelected) {
                        setPage({
                          ...page,
                          characterRefIds: page.characterRefIds.filter(
                            (id) => id !== char.id,
                          ),
                        });
                      } else {
                        if (page.characterRefIds.length >= 3) {
                          alert("Bạn chỉ có thể chọn tối đa 3 nhân vật.");
                          return;
                        }
                        setPage({
                          ...page,
                          characterRefIds: [...page.characterRefIds, char.id],
                        });
                      }
                    }}
                    className="w-5 h-5 accent-[#D97757] text-[#D97757] border-stone-300 rounded focus:ring-[#D97757] cursor-pointer"
                  />
                </div>
                <div className="relative shrink-0">
                  <img
                    src={`data:${char.image.mimeType};base64,${char.image.data}`}
                    alt={char.name}
                    className="w-12 h-12 rounded-lg object-cover bg-stone-100 border border-stone-200"
                  />
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                  <input
                    type="text"
                    value={char.name}
                    onChange={(e) =>
                      setCharacters(
                        characters.map((c) =>
                          c.id === char.id
                            ? { ...c, name: e.target.value }
                            : c,
                        ),
                      )
                    }
                    className="bg-transparent border-none text-sm font-medium text-stone-800 focus:outline-none focus:ring-0 px-1 placeholder:text-stone-400 w-full truncate"
                    placeholder="Tên nhân vật..."
                  />
                </div>
                <button
                  onClick={() => {
                    setCharacters(characters.filter((c) => c.id !== char.id));
                    setPage({
                      ...page,
                      characterRefIds: page.characterRefIds.filter(
                        (id) => id !== char.id,
                      ),
                    });
                  }}
                  className="text-stone-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Xóa nhân vật"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-stone-300 hover:border-[#D97757] hover:bg-[#D97757]/5 rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-all group bg-white"
          >
            <div className="p-2 bg-stone-50 rounded-full group-hover:bg-[#D97757]/10 transition-colors">
              <Upload className="w-5 h-5 text-stone-400 group-hover:text-[#D97757]" />
            </div>
            <span className="text-sm font-medium text-stone-500 group-hover:text-[#D97757]">
              Tải ảnh nhân vật
            </span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>
      </div>

      <div className="pt-2 flex flex-col gap-3 mt-auto">
        <button
          onClick={handleGenerate}
          disabled={page.isGenerating}
          className="w-full bg-[#D97757] hover:bg-[#C66545] disabled:bg-[#D97757]/60 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.98]"
        >
          {page.isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Wand2 className="w-5 h-5" />
          )}
          {page.isGenerating ? "Đang tạo trang..." : "Tạo trang truyện"}
        </button>
      </div>
    </div>
  );
}
