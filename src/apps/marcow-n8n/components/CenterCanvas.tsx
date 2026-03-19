import React, { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../../AppContext";
import { Loader2, Download, X, Info, Copy, Check, ChevronDown, HelpCircle, Send, MessageCircle, LogOut, ArrowLeft } from "lucide-react";

const InteractiveDots = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    const dots: { x: number, y: number, baseX: number, baseY: number }[] = [];
    const spacing = 20;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = canvas.width = parent.clientWidth;
      height = canvas.height = parent.clientHeight;
      
      dots.length = 0;
      for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
          dots.push({ x, y, baseX: x, baseY: y });
        }
      }
    };

    window.addEventListener('resize', resize);
    setTimeout(resize, 0);

    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#d6d3d1';

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        
        const dx = mouse.x - dot.baseX;
        const dy = mouse.y - dot.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const maxDist = 120;
        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          // Pull towards mouse
          const targetX = dot.baseX + dx * force * 0.6;
          const targetY = dot.baseY + dy * force * 0.6;
          
          dot.x += (targetX - dot.x) * 0.2;
          dot.y += (targetY - dot.y) * 0.2;
        } else {
          dot.x += (dot.baseX - dot.x) * 0.1;
          dot.y += (dot.baseY - dot.y) * 0.1;
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
};

export default function CenterCanvas() {
  const { settings, setSettings, page, setPage, characters, setCharacters, setIsAuthenticated, setSelectedApp } = useAppContext();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  useEffect(() => {
    if (page.isAutoPostingFB && page.imageUrl && !page.isGenerating && !isPosting) {
      setTimeout(() => {
        setPage(prev => ({ ...prev, isAutoPostingFB: false }));
        handlePostToFacebook();
      }, 1000);
    }
  }, [page.isAutoPostingFB, page.imageUrl, page.isGenerating, isPosting]);

  const handlePostToFacebook = async () => {
    if (!page.imageUrl) return;
    setIsPosting(true);
    setPostSuccess(false);

    try {
      // Convert image to base64 for sending to server proxy
      const getBase64FromImage = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            
            let width = img.width;
            let height = img.height;
            const maxSize = 1200;
            
            if (width > maxSize || height > maxSize) {
              const ratio = Math.min(maxSize / width, maxSize / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, width, height);
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(img, 0, 0, width, height);
              
              const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
              const base64 = dataUrl.split(",")[1];
              resolve(base64);
            } else {
              reject(new Error("Context Canvas bị lỗi"));
            }
          };
          img.onerror = () => reject(new Error("Không thể tải ảnh từ URL"));
          img.src = url;
        });
      };

      const imageBase64 = await getBase64FromImage(page.imageUrl);
      let postMessage = page.postCaption || page.originalScript || 'Comic page generated with AI Comic & Meme Studio';

      // Call server-side proxy (no FB tokens exposed to client)
      const res = await fetch('/api/fb-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: postMessage, imageBase64 }),
      });

      if (res.ok) {
        setPostSuccess(true);
        setTimeout(() => setPostSuccess(false), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Có lỗi xảy ra khi đăng bài: ${errData.error || 'Unknown'}`);
      }
    } catch (error: any) {
      console.error('Error posting to FB:', error);
      alert(`Có lỗi xảy ra khi kết nối: ${error.message || 'Không rõ nguyên nhân'}\nVui lòng ấn F12 -> Console để xem chi tiết.`);
    } finally {
      setIsPosting(false);
      setPage(prev => ({ ...prev, isAutoProcessing: false }));
    }
  };

  const guideSteps = [
    {
      title: "1. Nhập kịch bản",
      description: "Viết kịch bản chi tiết cho trang truyện của bạn. Mô tả rõ bối cảnh, hành động và biểu cảm của nhân vật. Bạn cũng có thể tải lên một hình ảnh kịch bản viết tay để AI tự động nhận diện.",
      mockup: (
        <div className="w-full h-full bg-white p-6 flex flex-col gap-4">
          <div className="h-4 w-32 bg-stone-200 rounded-md"></div>
          <div className="flex-1 border border-stone-200 rounded-xl p-4 flex flex-col gap-3 relative shadow-sm">
            <div className="h-3 w-full bg-stone-100 rounded"></div>
            <div className="h-3 w-5/6 bg-stone-100 rounded"></div>
            <div className="h-3 w-4/6 bg-stone-100 rounded"></div>
            <div className="absolute bottom-4 right-4 h-8 w-32 bg-[#FAF0E6] rounded-lg flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#D97757]/40"></div>
              <div className="h-2 w-16 bg-[#D97757]/40 rounded"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "2. Chọn nhân vật tham chiếu",
      description: "Tải lên hình ảnh nhân vật của bạn (tối đa 3 nhân vật) để AI giữ được tính nhất quán về khuôn mặt và trang phục trong suốt câu chuyện.",
      mockup: (
        <div className="w-full h-full bg-white p-6 flex flex-col gap-4 justify-center">
          <div className="h-4 w-40 bg-stone-200 rounded-md"></div>
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-stone-300 flex items-center justify-center bg-stone-50">
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                <div className="w-4 h-1 bg-white rounded-full absolute"></div>
                <div className="w-1 h-4 bg-white rounded-full absolute"></div>
              </div>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden relative">
              <div className="absolute bottom-0 w-12 h-12 bg-stone-300 rounded-t-full"></div>
              <div className="absolute top-3 w-6 h-6 bg-stone-300 rounded-full"></div>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden relative">
              <div className="absolute bottom-0 w-10 h-14 bg-stone-300 rounded-t-full"></div>
              <div className="absolute top-4 w-7 h-7 bg-stone-300 rounded-full"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "3. Tùy chỉnh trang",
      description: "Chọn phong cách vẽ (Manga, Webtoon, 3D...) và tỉ lệ khung hình phù hợp với nhu cầu của bạn.",
      mockup: (
        <div className="w-full h-full bg-white p-6 flex flex-col gap-6 justify-center max-w-sm mx-auto">
          <div className="flex flex-col gap-3">
            <div className="h-3 w-24 bg-stone-200 rounded"></div>
            <div className="h-12 w-full border-2 border-stone-100 rounded-xl flex items-center px-4 justify-between">
              <div className="h-3 w-20 bg-stone-300 rounded"></div>
              <div className="h-2 w-3 bg-stone-300 rounded-sm"></div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-3 w-24 bg-stone-200 rounded"></div>
            <div className="flex gap-3">
              <div className="flex-1 h-12 border-2 border-[#D97757] rounded-xl flex items-center justify-center bg-[#D97757]/5">
                <div className="h-3 w-8 bg-[#D97757]/60 rounded"></div>
              </div>
              <div className="flex-1 h-12 border-2 border-stone-100 rounded-xl flex items-center justify-center">
                <div className="h-3 w-8 bg-stone-300 rounded"></div>
              </div>
              <div className="flex-1 h-12 border-2 border-stone-100 rounded-xl flex items-center justify-center">
                <div className="h-3 w-8 bg-stone-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "4. Tạo và tải về",
      description: "Nhấn nút \"Tạo trang truyện\" và chờ AI xử lý. Sau khi hoàn thành, bạn có thể tải trang truyện về máy với nhiều tùy chọn kích thước khác nhau.",
      mockup: (
        <div className="w-full h-full bg-stone-50 p-6 flex items-center justify-center">
          <div className="w-48 h-64 bg-white shadow-md border border-stone-200 rounded-xl p-2 flex flex-col gap-2 relative transform -rotate-2 hover:rotate-0 transition-transform">
             <div className="flex-1 bg-stone-100 rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-stone-200 to-stone-50"></div>
                <div className="absolute bottom-2 left-2 w-8 h-8 bg-white/50 rounded-full"></div>
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/30 rounded-full"></div>
             </div>
             <div className="h-1/3 bg-stone-100 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-bl from-stone-200 to-stone-50"></div>
             </div>
             
             <div className="absolute -right-5 -bottom-5 w-14 h-14 bg-white rounded-full shadow-lg border border-stone-100 flex items-center justify-center text-[#D97757]">
               <Download className="w-6 h-6" />
             </div>
          </div>
        </div>
      )
    }
  ];

  // Determine aspect ratio class for the page
  let aspectClass = "aspect-square"; // 1:1
  if (settings.aspectRatio === "4:3") aspectClass = "aspect-[4/3]";
  if (settings.aspectRatio === "9:16") aspectClass = "aspect-[9/16]";
  if (settings.aspectRatio === "16:9") aspectClass = "aspect-[16/9]";

  const handleDownload = (scaleMultiplier: number, label: string) => {
    if (!page.imageUrl) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scaleMultiplier;
      canvas.height = img.height * scaleMultiplier;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Use better interpolation for scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `comic-page-${label}.png`;
        a.click();
      }
    };
    img.src = page.imageUrl;
    setIsDownloadMenuOpen(false);
  };

  const selectedCharacters = characters.filter(c => page.characterRefIds.includes(c.id));

  let parsedJson = null;
  let isJsonValid = false;
  try {
    if (page.generatedJson) {
      parsedJson = JSON.parse(page.generatedJson);
      isJsonValid = true;
    }
  } catch (e) {
    // Not JSON
  }

  return (
    <div className="flex-1 bg-[#FAF9F6] relative overflow-hidden flex flex-col items-center">
      <InteractiveDots />
      
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <button 
          onClick={() => setIsBackModalOpen(true)}
          className="text-stone-500 hover:text-stone-700 bg-white/50 hover:bg-white px-4 py-2 rounded-xl text-sm font-medium border border-stone-200 shadow-sm transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <button 
          onClick={() => setIsLogoutModalOpen(true)}
          className="text-stone-500 hover:text-red-600 bg-white/50 hover:bg-white px-4 py-2 rounded-xl text-sm font-medium border border-stone-200 shadow-sm transition-all flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>

      <div className="w-full h-full overflow-y-auto z-10 flex flex-col items-center">


        <div className="w-full max-w-4xl mx-auto flex flex-col items-center px-8 pb-12 pt-6 md:px-12 mt-10">
          {page.imageUrl && (
            <div className="w-full flex justify-end mb-6 relative gap-3">
              <button
                onClick={handlePostToFacebook}
                disabled={isPosting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-[0.98]
                  ${postSuccess 
                    ? 'bg-green-50 text-green-600 border border-green-200' 
                    : 'bg-[#1877F2] hover:bg-[#166FE5] text-white border border-transparent hover:shadow-md'
                  }
                  ${isPosting ? 'opacity-80 cursor-not-allowed' : ''}
                `}
              >
                {isPosting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : postSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isPosting ? 'Đang đăng...' : postSuccess ? 'Đã đăng thành công' : 'Đăng lên Facebook'}
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 hover:border-stone-300 text-stone-700 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                Tải truyện về
                <ChevronDown className={`w-4 h-4 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDownloadMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDownloadMenuOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => handleDownload(0.5, "thap")}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 hover:text-[#D97757] transition-colors border-b border-stone-100"
                    >
                      <div className="font-medium">Thấp</div>
                      <div className="text-xs text-stone-500 mt-0.5">~512px (Chia sẻ nhanh)</div>
                    </button>
                    <button
                      onClick={() => handleDownload(1, "trung-binh")}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 hover:text-[#D97757] transition-colors border-b border-stone-100"
                    >
                      <div className="font-medium">Trung bình</div>
                      <div className="text-xs text-stone-500 mt-0.5">~1024px (Tiêu chuẩn)</div>
                    </button>
                    <button
                      onClick={() => handleDownload(2, "net-cang-det")}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 hover:text-[#D97757] transition-colors"
                    >
                      <div className="font-medium">Nét căng đét</div>
                      <div className="text-xs text-stone-500 mt-0.5">~2048px (Chất lượng cao)</div>
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          )}

          {(page.imageUrl || page.isGenerating) && (
            <div className={`flex flex-col md:flex-row w-full gap-5 items-start justify-center ${aspectClass === 'aspect-square' ? 'max-w-3xl' : ''}`}>
              {/* Image Container */}
              <div
                onClick={() => {
                  if (page.imageUrl) setIsInfoModalOpen(true);
                }}
                className={`
                  flex-1 w-full bg-white border rounded-2xl overflow-hidden shadow-md
                  relative shrink-0
                  ${aspectClass}
                  border-stone-200
                  ${page.imageUrl ? 'cursor-pointer hover:ring-2 hover:ring-[#D97757]/50 transition-all' : ''}
                `}
              >
                {/* Image */}
                {page.imageUrl && (
                  <img
                    src={page.imageUrl}
                    alt="Trang truyện tranh"
                    className="w-full h-full object-contain bg-white"
                  />
                )}

                {/* Loading Overlay */}
                {page.isGenerating && (
                  <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-[#D97757] animate-spin mb-6" />
                    <p className="text-lg font-semibold text-stone-800 animate-pulse mb-2">
                      Đang vẽ trang truyện...
                    </p>
                    <p className="text-sm text-stone-500 max-w-sm text-center leading-relaxed">
                      Quá trình này có thể mất một lúc tùy thuộc vào độ phức tạp của
                      kịch bản.
                    </p>
                  </div>
                )}
              </div>

              {/* Caption Box */}
              {!!page.postCaption && page.imageUrl && !page.isGenerating && (
                <div 
                  className="w-full md:w-[380px] bg-white border border-[#D97757]/30 rounded-2xl shadow-sm p-5 flex flex-col gap-4 shrink-0 transition-transform duration-300 animate-in fade-in slide-in-from-right-4 relative"
                >
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                     <div className="w-7 h-7 rounded-full bg-[#D97757]/10 flex items-center justify-center shrink-0">
                       <MessageCircle className="w-3.5 h-3.5 text-[#D97757]" />
                     </div>
                     <h3 className="font-semibold text-stone-800 text-sm leading-tight flex-1">
                       Content Gợi Ý <br />
                       <span className="text-[10px] text-stone-500 font-normal">Cho mạng xã hội</span>
                     </h3>
                  </div>
                  
                  <div className="relative flex-1 flex flex-col group mt-1">
                    <div className="absolute -left-1.5 -top-3 text-[#D97757]/20 font-serif text-3xl leading-none select-none pointer-events-none z-10">"</div>
                    <textarea 
                      value={page.postCaption || ""}
                      onChange={(e) => setPage({ ...page, postCaption: e.target.value })}
                      className="w-full flex-1 bg-transparent border-0 rounded-xl p-1 pt-2 pb-0 text-sm text-stone-700 leading-relaxed outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:bg-stone-50 resize-none h-[180px] z-10"
                    />
                  </div>

                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      await navigator.clipboard.writeText(page.postCaption || "");
                      alert("Đã sao chép Content!");
                    }}
                    className="mt-2 w-full text-[#D97757] hover:text-white bg-[#D97757]/5 hover:bg-[#D97757] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-[#D97757]/50 rounded-xl py-2.5 active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" /> Sao Chép Content
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h3 className="text-xl font-semibold text-stone-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#D97757]" />
                Thông tin trang truyện
              </h3>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Characters */}
              {selectedCharacters.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-stone-800 mb-3">Nhân vật tham chiếu:</h4>
                  <div className="flex flex-wrap gap-4">
                    {selectedCharacters.map(char => (
                      <div key={char.id} className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <img
                          src={`data:${char.image.mimeType};base64,${char.image.data}`}
                          alt={char.name}
                          className="w-12 h-12 rounded-lg object-cover bg-white border border-stone-200"
                        />
                        <span className="text-sm font-medium text-stone-700">{char.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Combined Script */}
              <div>
                <h4 className="text-sm font-semibold text-stone-800 mb-3">Kịch bản truyện:</h4>
                <div className="relative bg-stone-50 rounded-xl border border-stone-200 overflow-hidden group">
                  <div className="max-h-[250px] overflow-y-auto p-4 text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                    <div className="font-bold text-stone-500 mb-2 text-xs uppercase tracking-wider">=== Nội dung gốc ===</div>
                    <div className="mb-6">{page.originalScript || "Trống"}</div>
                    
                    <div className="font-bold text-stone-500 mb-2 text-xs uppercase tracking-wider">=== Kịch bản JSON ===</div>
                    <pre className="font-mono text-xs text-stone-600">
                      {isJsonValid ? JSON.stringify(parsedJson, null, 2) : page.generatedJson || "Trống"}
                    </pre>
                  </div>
                  <button
                    onClick={async () => {
                      const combinedText = `=== NỘI DUNG GỐC ===\n${page.originalScript || "Trống"}\n\n=== KỊCH BẢN JSON ===\n${isJsonValid ? JSON.stringify(parsedJson, null, 2) : page.generatedJson || "Trống"}`;
                      await navigator.clipboard.writeText(combinedText);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white border border-stone-200 rounded-lg shadow-sm hover:bg-stone-50 text-stone-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Sao chép kịch bản"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Guide Modal */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-stone-100 shrink-0">
              <h3 className="text-xl font-semibold text-stone-800 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#D97757]" />
                Hướng dẫn sử dụng
              </h3>
              <button
                onClick={() => {
                  setIsGuideModalOpen(false);
                  setCurrentGuideStep(0);
                }}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center gap-6">
                {/* Code Mockup */}
                <div className="w-full aspect-video bg-stone-100 rounded-xl overflow-hidden border border-stone-200 relative">
                  {guideSteps[currentGuideStep].mockup}
                </div>

                {/* Text Content */}
                <div className="text-center max-w-xl">
                  <h4 className="font-bold text-stone-900 mb-3 text-xl">{guideSteps[currentGuideStep].title}</h4>
                  <p className="text-stone-600 leading-relaxed">{guideSteps[currentGuideStep].description}</p>
                </div>
              </div>
            </div>

            {/* Navigation & Indicators */}
            <div className="p-6 border-t border-stone-100 shrink-0 flex items-center justify-between bg-stone-50/50">
              <button
                onClick={() => setCurrentGuideStep(Math.max(0, currentGuideStep - 1))}
                disabled={currentGuideStep === 0}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Quay lại
              </button>

              <div className="flex items-center gap-2">
                {guideSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentGuideStep(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentGuideStep 
                        ? "w-6 bg-[#D97757]" 
                        : "bg-stone-300 hover:bg-stone-400"
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  if (currentGuideStep === guideSteps.length - 1) {
                    setIsGuideModalOpen(false);
                    setCurrentGuideStep(0);
                  } else {
                    setCurrentGuideStep(Math.min(guideSteps.length - 1, currentGuideStep + 1));
                  }
                }}
                className="px-6 py-2 text-sm font-medium text-white bg-[#D97757] hover:bg-[#c66547] rounded-xl transition-colors shadow-sm"
              >
                {currentGuideStep === guideSteps.length - 1 ? "Bắt đầu ngay" : "Tiếp theo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center p-8 gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-stone-800">Xác nhận đăng xuất</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Bạn có chắc chắn muốn đăng xuất khỏi AI Studio không? Bạn sẽ cần đăng nhập lại để tiếp tục tạo truyện.
              </p>
            </div>
            
            <div className="flex gap-3 p-4 bg-stone-50 border-t border-stone-100">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Modal */}
      {isBackModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center p-8 gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D97757]/10 flex items-center justify-center text-[#D97757] mb-2">
                <ArrowLeft className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-stone-800">Xác nhận quay lại</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Bạn có chắc chắn muốn quay lại bước Chọn Ứng dụng không? Toàn bộ thiết lập và dữ liệu truyện chưa lưu sẽ bị xóa để đảm bảo trải nghiệm mới.
              </p>
            </div>
            
            <div className="flex gap-3 p-4 bg-stone-50 border-t border-stone-100">
              <button
                onClick={() => setIsBackModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  setSettings({
                    aspectRatio: "1:1",
                    artStyle: "Thỏ Bảy Màu",
                    script: "",
                    dialogues: [""],
                    postCaption: "",
                  });
                  setCharacters([]);
                  setPage({
                    imageUrl: null,
                    isGenerating: false,
                    characterRefIds: [],
                  });
                  setSelectedApp(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#D97757] hover:bg-[#c66547] rounded-xl transition-colors shadow-sm"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
