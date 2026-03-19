import React, { useRef, useState } from "react";
import { BookOpen, Share2, Settings, UserCircle, LogOut, Camera, Image as ImageIcon, CheckCircle, Workflow, X } from "lucide-react";
import { useAppContext } from "../AppContext";

interface AppSelectorProps {
  onSelect: (app: 'marcow' | 'marcow_n8n') => void;
}

export default function AppSelector({ onSelect }: AppSelectorProps) {
  const { userProfile, setUserProfile, setIsAuthenticated, directoryHandle, setDirectoryHandle, showToast } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isN8nModalOpen, setIsN8nModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingAvatar, setEditingAvatar] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (isEditProfileModalOpen) {
          setEditingAvatar(dataUrl);
        } else {
          setUserProfile((prev) => ({ ...prev, avatarUrl: dataUrl }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="h-screen w-full flex items-center justify-center text-[#2D2D2D] font-sans p-6 relative"
      style={{
        backgroundImage: "url('/bgg2.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarSelect}
        accept="image/*"
        className="hidden"
      />
      {/* Top Bar for User Profile */}
      <div className="absolute top-6 right-8 z-30">
        <div className="relative">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex items-center gap-3 bg-white border border-stone-200 hover:border-[#D97757] hover:shadow-md transition-all px-3 py-2 rounded-full group"
          >
            <img 
              src={userProfile.avatarUrl} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full object-cover border border-stone-100"
            />
            <span className="text-sm font-semibold text-stone-700 pr-2 group-hover:text-[#D97757] transition-colors">
              {userProfile.name}
            </span>
          </button>

          {isSettingsOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsSettingsOpen(false)}
              />
              <div className="absolute top-full right-0 mt-3 w-64 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3">
                  <button
                    onClick={() => {
                      setEditingAvatar(userProfile.avatarUrl);
                      setEditingName(userProfile.name);
                      setIsEditProfileModalOpen(true);
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-[#D97757] rounded-xl transition-colors"
                  >
                    <div className="p-1.5 bg-stone-100 rounded-lg"><UserCircle className="w-4 h-4" /></div> Thay đổi thông tin
                  </button>
                  <label className="w-full flex items-start justify-between gap-3 px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-3">
                        <div className="p-1.5 bg-stone-100 rounded-lg"><ImageIcon className="w-4 h-4" /></div> Lưu ảnh tự động
                      </span>
                      {userProfile.autoSaveImages && directoryHandle?.name && (
                        <span className="text-[10px] text-stone-400 mt-1 truncate max-w-[140px] ml-10" title={directoryHandle.name}>
                          Thư mục: {directoryHandle.name}
                        </span>
                      )}
                    </div>
                    <div className="relative inline-block w-10 flex-shrink-0 align-middle select-none transition duration-200 ease-in mt-1">
                      <input 
                        type="checkbox" 
                        checked={userProfile.autoSaveImages}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            try {
                              if ('showDirectoryPicker' in window) {
                                const dirHandle = await (window as any).showDirectoryPicker();
                                setDirectoryHandle(dirHandle);
                                setUserProfile(prev => ({ ...prev, autoSaveImages: true }));
                                showToast(`Đã bật lưu tự động vào: ${dirHandle.name}`, 'success');
                              } else {
                                setUserProfile(prev => ({ ...prev, autoSaveImages: true }));
                                showToast("Đã bật lưu tự động (Thư mục Downloads)", 'success');
                              }
                            } catch (error) {
                              console.error(error);
                              setUserProfile(prev => ({ ...prev, autoSaveImages: false }));
                              setDirectoryHandle(null);
                              showToast("Đã chọn hủy hoặc trình duyệt không hỗ trợ.", 'info');
                            }
                          } else {
                            setUserProfile(prev => ({ ...prev, autoSaveImages: false }));
                            setDirectoryHandle(null);
                            showToast("Đã tắt lưu ảnh tự động", 'info');
                          }
                        }}
                        className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-stone-300" 
                        style={{
                          right: userProfile.autoSaveImages ? '0' : '1.25rem',
                          borderColor: userProfile.autoSaveImages ? '#10B981' : '#E5E7EB',
                          background: userProfile.autoSaveImages ? '#10B981' : '#fff'
                        }}
                      />
                      <div className="toggle-label block overflow-hidden h-5 rounded-full bg-stone-200 cursor-pointer" style={{ backgroundColor: userProfile.autoSaveImages ? '#D1FAE5' : '#E5E7EB'}}></div>
                    </div>
                  </label>
                  
                  <div className="h-px bg-stone-100 my-2" />

                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsN8nModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#1877F2] hover:bg-[#1877F2]/10 rounded-xl transition-colors"
                  >
                    <div className="p-1.5 bg-[#1877F2]/10 rounded-lg"><Workflow className="w-4 h-4" /></div> Xem quy trình n8n
                  </button>
                  
                  <div className="h-px bg-stone-100 my-2" />

                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <div className="p-1.5 bg-red-100 rounded-lg"><LogOut className="w-4 h-4" /></div> Đăng xuất
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl relative z-20">
        <div className="text-center mb-10">
          <img 
            src="https://matbao.in/wp-content/uploads/2026/03/marcow.png" 
            alt="Logo" 
            className="h-12 object-contain mx-auto mb-6"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => onSelect('marcow')}
            className="w-full flex flex-col items-center justify-center p-8 bg-white border border-stone-200 rounded-3xl cursor-pointer hover:border-[#D97757] hover:bg-stone-50 transition-all group hover:-translate-y-1 text-left h-full"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform overflow-hidden">
              <img src="/macdinh.png" alt="Marcow Comic" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-xl font-semibold text-stone-800 mb-3 group-hover:text-[#D97757] transition-colors">
              Marcow Comic
            </h3>
            <p className="text-stone-500 text-sm leading-relaxed text-center">
              Tạo trang truyện tranh cơ bản bằng sức mạnh của AI. Không hỗ trợ đăng bài mạng xã hội trực tiếp.
            </p>
          </button>

          <button
            onClick={() => onSelect('marcow_n8n')}
            className="group flex flex-col items-center p-8 bg-white border-2 border-stone-200 rounded-3xl hover:border-[#1877F2] transition-all hover:-translate-y-1 text-left h-full"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform overflow-hidden">
              <img src="/n8n.png" alt="Marcow Comic n8n" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-xl font-semibold text-stone-800 mb-3 group-hover:text-[#1877F2] transition-colors flex items-center gap-2">
              Marcow Comic <span className="text-xs px-2 py-0.5 bg-[#1877F2]/10 text-[#1877F2] rounded-full">n8n</span>
            </h3>
            <p className="text-stone-500 text-sm leading-relaxed text-center">
              Phiên bản cao cấp tích hợp luồng N8N. Hỗ trợ tạo nội dung tự động và đăng bài thẳng lên nền tảng Facebook.
            </p>
          </button>
        </div>
      </div>

      {isN8nModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200">
            <div className="flex items-center justify-between px-8 py-5 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800 tracking-tight">Quy trình tự động hóa N8N</h3>
                  <p className="text-xs font-medium text-[#1877F2] uppercase tracking-wider mt-0.5">Prototype Flow Overview</p>
                </div>
              </div>
              <button
                onClick={() => setIsN8nModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-white rounded-full transition-all border border-transparent hover:border-stone-200 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-white flex-1 relative">
              
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#1877F2]/5 rounded-bl-full pointer-events-none"></div>
              
              <div className="max-w-3xl mx-auto space-y-12 relative z-10">
                {/* Intro */}
                <div className="text-center space-y-3">
                  <h4 className="text-2xl font-bold text-stone-800">Cách hoạt động của Marcow Comic n8n</h4>
                  <p className="text-stone-500 leading-relaxed max-w-xl mx-auto">
                    Một quy trình tự động khép kín từ lúc ấn nút đến lúc bài viết xuất hiện trên fanpage Facebook của bạn.
                  </p>
                </div>

                {/* Nodes Display */}
                <div className="flex flex-col gap-8">
                  {/* Webhook Node */}
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0 group-hover:scale-105 transition-transform border-[3px] border-white ring-2 ring-indigo-50">
                      <Workflow className="w-7 h-7" />
                    </div>
                    <div className="flex-1 bg-stone-50 border border-stone-200 p-6 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md uppercase tracking-wider">Bước 1</span>
                        <h5 className="text-lg font-bold text-stone-800">Tiếp nhận Webhook</h5>
                      </div>
                      <p className="text-stone-600 text-sm leading-relaxed mb-3">
                        Giao diện Marcow-n8n sẽ gom ảnh comic vừa vẽ xong (đã nén), caption nội dung bài viết và ID Fanpage để gửi thẳng tới đầu nối Webhook của n8n.
                      </p>
                      <div className="bg-stone-800 text-stone-300 text-xs p-3 rounded-xl font-mono">
                        POST <span className="text-green-400">/webhook/antigravity-fb-post</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-0.5 h-8 bg-gradient-to-b from-indigo-200 to-blue-200 ml-8 border-l-[3px] border-dotted border-indigo-300/50"></div>

                  {/* Facebook API Node */}
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1877F2] to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0 group-hover:scale-105 transition-transform border-[3px] border-white ring-2 ring-blue-50">
                      <Share2 className="w-7 h-7" />
                    </div>
                    <div className="flex-1 bg-blue-50/30 border border-blue-100 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                      <div className="absolute right-[-20%] top-[-20%] w-32 h-32 bg-[#1877F2]/10 rounded-full blur-2xl"></div>
                      <div className="flex items-center gap-2 mb-2 relative z-10">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-md uppercase tracking-wider">Bước 2</span>
                        <h5 className="text-lg font-bold text-[#1877F2]">Facebook API Node</h5>
                      </div>
                      <p className="text-stone-600 text-sm leading-relaxed relative z-10">
                        Sử dụng <strong>Facebook Graph API</strong>, n8n chuyển trực tiếp tệp tin nhị phân (Binary) đính kèm nội dung chữ lên máy chủ Facebook và ra lệnh lên bài.
                      </p>
                      <ul className="mt-4 space-y-2 text-xs font-medium text-stone-500 relative z-10">
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Xác thực User/Page Access Token</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Đăng ảnh chất lượng cao lên Album Fanpage</li>
                      </ul>
                    </div>
                  </div>

                  <div className="w-0.5 h-8 bg-gradient-to-b from-blue-200 to-green-200 ml-8 border-l-[3px] border-dotted border-blue-300/50"></div>

                  {/* Complete Node */}
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-green-200 shrink-0 group-hover:scale-105 transition-transform border-[3px] border-white ring-2 ring-green-50">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <div className="flex-1 bg-stone-50 border border-stone-200 p-6 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-md uppercase tracking-wider">Bước 3</span>
                         <h5 className="text-lg font-bold text-stone-800">Hoàn tất & Trả kết quả</h5>
                      </div>
                      <p className="text-stone-600 text-sm leading-relaxed mb-3">
                        Facebook trả về ID của bài viết vừa đăng. Trả phản hồi thành công (HTTP 200 OK) về cho ứng dụng Marcow Comic báo hiệu quá trình xuất bản thành công 100%.
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 bg-green-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 w-full animate-pulse"></div>
                        </div>
                        <span className="text-green-600 text-xs font-bold">100% DONE</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="px-8 py-5 border-t border-stone-100 bg-stone-50 flex justify-end">
              <button
                onClick={() => setIsN8nModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 font-medium rounded-xl shadow-sm transition-colors text-sm"
              >
                Đã hiểu quy trình
              </button>
            </div>
          </div>
        </div>
      )}

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-500">
                <LogOut className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">Đăng xuất</h3>
              <p className="text-stone-500 text-sm">Bạn có chắc chắn muốn đăng xuất không? Bạn sẽ cần nhập mật khẩu để vào lại.</p>
            </div>
            
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex gap-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium rounded-xl transition-colors text-sm"
              >
                Hủy
              </button>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98] text-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-stone-800 mb-6 text-center">Thay đổi thông tin</h3>
              <div className="flex flex-col items-center gap-4 mb-2">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img 
                    src={editingAvatar} 
                    alt="Avatar" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-stone-100"
                  />
                  <div className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6" />
                  </div>
                </div>
                <div className="w-full mt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5 ml-1">Tên người dùng</label>
                  <input 
                    type="text" 
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 text-stone-800 text-sm font-medium rounded-xl focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] block p-3 outline-none transition-all"
                    placeholder="Nhập tên của bạn"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex gap-3">
              <button
                onClick={() => setIsEditProfileModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium rounded-xl transition-colors text-sm"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setUserProfile(prev => ({ ...prev, name: editingName || prev.name, avatarUrl: editingAvatar }));
                  setIsEditProfileModalOpen(false);
                  showToast("Cập nhật thông tin thành công!", 'success');
                }}
                className="flex-1 px-4 py-2.5 bg-[#D97757] hover:bg-[#C66545] text-white font-medium rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98] text-sm"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
