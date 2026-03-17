import React, { useState } from 'react';
import { X, Search, Calendar, Image as ImageIcon, Loader2, Heart, MessageCircle, Share2, ExternalLink } from 'lucide-react';

interface MartrendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, textContext?: string) => void;
}

interface FacebookPost {
  imageUrl: string;
  text: string;
  likes: number;
  comments: number;
  shares: number;
  postUrl: string;
  date: string;
}

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&q=80",
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&q=80",
  "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=400&q=80",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80",
  "https://images.unsplash.com/photo-1580477667995-2b92f696e874?w=400&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80"
];

export default function MartrendModal({ isOpen, onClose, onSelectImage }: MartrendModalProps) {
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [results, setResults] = useState<FacebookPost[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  
  const [fanpageUrls, setFanpageUrls] = useState<string[]>([]);
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);

  React.useEffect(() => {
    const fetchFanpageUrls = async () => {
      if (!isOpen) return;
      setIsLoadingUrls(true);
      try {
        // Fallback mặc định
        let urls: string[] = [
          "https://www.facebook.com/ThoBayMau",
          "https://www.facebook.com/bovagau",
          "https://www.facebook.com/EnComics"
        ];
        
        try {
          // Gọi Webhook n8n để lấy danh sách link động
          const res = await fetch('https://n8n.tbsupellex.com/webhook/71aee092-d6ff-4dc3-9c86-1bddee35ba70');
          if (res.ok) {
            const data = await res.json();
            // Try to extract an array of strings from whatever n8n returned
            let extractedUrls: string[] = [];
            
            if (Array.isArray(data)) {
              extractedUrls = data;
            } else if (data && typeof data === 'object') {
              // Tìm kiếm mảng trong các key phổ biến
              if (Array.isArray(data.urls)) extractedUrls = data.urls;
              else if (Array.isArray(data.data)) extractedUrls = data.data;
              else if (Array.isArray(data.links)) extractedUrls = data.links;
              else if (Array.isArray(data[0]?.urls)) extractedUrls = data[0].urls; // Dạng mảng chứa object
            }

            // Extract string only
            const validUrls = extractedUrls.filter(u => typeof u === 'string' && u.includes('facebook.com'));
            
            if (validUrls.length > 0) {
              urls = validUrls;
            }
          }
        } catch (e) {
          console.warn('Không lấy được dữ liệu từ n8n webhook, dùng link mặc định.', e);
        }
        
        if (urls.length > 0) {
          setFanpageUrls(urls);
          if (selectedUrls.length === 0) {
            // Auto check tất cả khi mới load
            setSelectedUrls(urls);
          }
        }
      } catch (error) {
        console.error('Failed to prepare urls', error);
      } finally {
        setIsLoadingUrls(false);
      }
    };

    fetchFanpageUrls();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScan = async () => {
    if (selectedUrls.length === 0) {
      alert('Vui lòng chọn ít nhất 1 link Fanpage để quét');
      return;
    }
    console.log("--- BẮT ĐẦU QUÉT ---");
    console.log("URLs:", selectedUrls, "Từ:", startDate, "Đến:", endDate);
    
    setIsScanning(true);
    setScanStatus('Đang khởi tạo kết nối với Apify...');
    setResults([]);
    setHasScanned(false);
    
    try {
      // 1. Start the run
      console.log("1. Gọi API /api/apify/start...");
      const startRes = await fetch('/api/apify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: selectedUrls, startDate, endDate })
      });
      const startData = await startRes.json();
      console.log("Kết quả start:", startData);
      
      if (startData.error) throw new Error(startData.error);
      
      const runId = startData.runId;
      setScanStatus('Apify đang cào dữ liệu (có thể mất 1-3 phút)...');
      console.log("2. Bắt đầu chờ Apify chạy xong. Run ID:", runId);
      
      // 2. Poll for completion
      let datasetId = null;
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes max (60 * 3s)

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000)); // Wait 3 seconds between checks
        console.log(`Kiểm tra trạng thái lần ${attempts + 1}...`);
        const statusRes = await fetch(`/api/apify/status/${runId}`);
        const statusData = await statusRes.json();
        console.log("Trạng thái hiện tại:", statusData.status);
        
        if (statusData.error) throw new Error(statusData.error);

        if (statusData.status === 'SUCCEEDED') {
          datasetId = statusData.datasetId;
          console.log("Đã chạy xong! Dataset ID:", datasetId);
          break;
        } else if (statusData.status === 'FAILED' || statusData.status === 'ABORTED') {
          throw new Error('Quá trình quét thất bại trên Apify. Vui lòng kiểm tra log trên Apify Console.');
        }
        attempts++;
      }
      
      if (!datasetId) {
        throw new Error('Quá thời gian chờ (3 phút). Quá trình quét có thể vẫn đang chạy trên Apify.');
      }

      setScanStatus('Đang xử lý và tải hình ảnh về...');
      console.log("3. Đang lấy kết quả từ Dataset...");
      
      // 3. Get results
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const resultsRes = await fetch(`/api/apify/results/${datasetId}?${queryParams.toString()}`);
      if (!resultsRes.ok) {
        const errText = await resultsRes.text();
        throw new Error(`Lỗi lấy dữ liệu (${resultsRes.status}): ${errText}`);
      }
      const resultsData = await resultsRes.json();
      console.log("Dữ liệu trả về từ Backend:", resultsData);
      
      if (resultsData.posts && resultsData.posts.length > 0) {
        console.log(`Thành công! Tìm thấy ${resultsData.posts.length} bài viết.`);
        setResults(resultsData.posts);
      } else {
        console.log("Apify Debug Info:", resultsData.debug);
        if (resultsData.debug && resultsData.debug.filteredOutByDate > 0) {
          // alert(`Không tìm thấy bài viết. Có ${resultsData.debug.filteredOutByDate} bài viết bị loại bỏ do nằm ngoài khoảng thời gian bạn chọn.`);
        } else {
          // alert('Không tìm thấy bài viết nào từ Fanpage này. Vui lòng kiểm tra Console (F12) để xem chi tiết dữ liệu trả về.');
        }
      }
    } catch (error: any) {
      console.error("LỖI TRONG QUÁ TRÌNH QUÉT:", error);
      alert(error.message || 'Có lỗi xảy ra khi quét dữ liệu.');
    } finally {
      console.log("--- KẾT THÚC QUÉT ---");
      setIsScanning(false);
      setScanStatus('');
      setHasScanned(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] md:max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-stone-100 shrink-0 bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-[#D97757]/10 p-2.5 rounded-xl text-[#D97757]">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-800">Martrend</h3>
              <p className="text-xs text-stone-500">Quét hình ảnh từ Fanpage Facebook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Panel: Search Form */}
          <div className="w-full md:w-80 shrink-0 border-r border-stone-100 p-5 flex flex-col gap-5 bg-white overflow-y-auto">
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-stone-700 mb-2">Fanpage Facebook Cần Quét</label>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {isLoadingUrls ? (
                  <p className="text-sm text-stone-500 italic">Đang tải danh sách từ N8N...</p>
                ) : fanpageUrls.length > 0 ? (
                  fanpageUrls.map((u, i) => {
                    const isChecked = selectedUrls.includes(u);
                    return (
                      <label key={i} className={`flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-colors ${isChecked ? 'bg-[#D97757]/5 border-[#D97757]/30' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUrls(prev => [...prev, u]);
                              } else {
                                setSelectedUrls(prev => prev.filter(item => item !== u));
                              }
                            }}
                            className="w-4 h-4 mt-0.5 accent-[#D97757] text-[#D97757] border-stone-300 rounded focus:ring-[#D97757]"
                          />
                          <span className="text-sm text-stone-700 font-medium break-words leading-tight flex-1">{u}</span>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-sm text-stone-500">Không có link khả dụng</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Từ ngày</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] outline-none transition-all"
                />
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Đến ngày</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] outline-none transition-all"
                />
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={isScanning}
              className="w-full bg-[#D97757] hover:bg-[#C66545] disabled:bg-[#D97757]/60 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm mt-auto"
            >
              {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {isScanning ? 'Đang quét...' : 'Quét hình ảnh'}
            </button>
            
            {isScanning && (
              <div className="text-xs text-center text-stone-500 animate-pulse">
                {scanStatus}
              </div>
            )}
          </div>

          {/* Right Panel: Results */}
          <div className="flex-1 bg-stone-50/50 p-5 overflow-y-auto relative">
            {!hasScanned && !isScanning && results.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-3">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-stone-300" />
                </div>
                <p className="text-sm">Nhập link Fanpage và bấm quét để xem kết quả</p>
              </div>
            )}

            {isScanning && results.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
                <p className="text-sm text-stone-500">{scanStatus}</p>
              </div>
            )}

            {hasScanned && !isScanning && results.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-stone-500 space-y-3">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                  <Search className="w-8 h-8 text-stone-300" />
                </div>
                <p className="text-sm font-medium text-stone-700">Không tìm thấy bài viết nào</p>
                <p className="text-xs text-center max-w-xs">
                  Thử kiểm tra lại đường link Fanpage hoặc mở rộng khoảng thời gian tìm kiếm.
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between sticky top-0 bg-stone-50/90 backdrop-blur-sm pb-2 z-10">
                  <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#D97757]" />
                    Kết quả tìm kiếm ({results.length})
                  </h4>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {results.map((post, idx) => (
                    <div key={idx} className="group relative rounded-xl overflow-hidden border border-stone-200 shadow-sm flex flex-col bg-white hover:shadow-md transition-shadow">
                      <div className="aspect-square w-full overflow-hidden relative bg-stone-100">
                        <img 
                          src={post.imageUrl} 
                          alt={`Result ${idx}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f5f5f4/a8a29e?text=Image+Not+Found';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                          <button 
                            onClick={() => onSelectImage(post.imageUrl, post.text)}
                            className="bg-[#D97757] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#C66545] transition-colors w-full text-center shadow-sm transform translate-y-2 group-hover:translate-y-0 duration-200"
                          >
                            Dùng tạo kịch bản
                          </button>
                        </div>
                      </div>
                      <div className="p-3 flex flex-col gap-2 flex-1">
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed" title={post.text}>
                          {post.text || <span className="italic text-stone-400">Không có nội dung</span>}
                        </p>
                        <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-stone-500 font-medium border-t border-stone-50">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1" title="Lượt thích"><Heart className="w-3 h-3 text-red-500"/> {post.likes}</span>
                            <span className="flex items-center gap-1" title="Bình luận"><MessageCircle className="w-3 h-3 text-blue-500"/> {post.comments}</span>
                            <span className="flex items-center gap-1" title="Chia sẻ"><Share2 className="w-3 h-3 text-green-500"/> {post.shares}</span>
                          </div>
                        </div>
                        {post.postUrl && (
                          <a href={post.postUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 mt-1">
                            <ExternalLink className="w-3 h-3"/> Xem bài viết gốc
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
