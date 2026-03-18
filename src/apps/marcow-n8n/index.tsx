import React from 'react';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import CenterCanvas from './components/CenterCanvas';
import { useAppContext } from '../../AppContext';
import { Loader2 } from 'lucide-react';

export default function MarcowN8nApp() {
  const { page } = useAppContext();

  return (
    <div className="h-screen w-full flex bg-[#FAF9F6] text-[#2D2D2D] font-sans overflow-hidden relative">
      <LeftSidebar />
      <CenterCanvas />
      <RightSidebar />

      {/* Auto Processing Global Overlay */}
      {page.isAutoProcessing && (
        <div className="fixed inset-0 z-[999] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full border border-stone-200 animate-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-[#D97757]/20 rounded-full blur-xl animate-pulse"></div>
              <div className="w-20 h-20 bg-stone-50 rounded-full border-4 border-white shadow-lg flex items-center justify-center relative z-10">
                <Loader2 className="w-10 h-10 text-[#D97757] animate-spin" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-stone-800">Đang xử lý tự động</h3>
              <p className="text-sm text-stone-500 font-medium leading-relaxed">
                {page.autoProcessMessage || "Vui lòng đợi trong giây lát..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
