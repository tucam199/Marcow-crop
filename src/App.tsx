import { AppProvider, useAppContext } from "./AppContext";
import Login from "./components/Login";
import AppSelector from "./components/AppSelector";
import MarcowApp from "./apps/marcow";
import MarcowN8nApp from "./apps/marcow-n8n";

function AppContent() {
  const { hasKey, handleSelectKey, isAuthenticated, authChecked, selectedApp, setSelectedApp } = useAppContext();

  if (!authChecked) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FAF9F6] text-[#2D2D2D]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#D97757] border-t-transparent rounded-full animate-spin" />
          <span className="text-stone-500 text-sm">Đang xác thực...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!selectedApp) {
    return <AppSelector onSelect={setSelectedApp} />;
  }

  if (hasKey === null) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FAF9F6] text-[#2D2D2D]">
        Đang tải...
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FAF9F6] text-[#2D2D2D] font-sans">
        <div className="max-w-md p-8 bg-white border border-stone-200 shadow-sm rounded-2xl text-center">
          <h1 className="text-2xl font-serif font-medium mb-4 text-stone-800">
            Yêu cầu API Key
          </h1>
          <p className="text-stone-500 mb-6">
            Ứng dụng này sử dụng mô hình Gemini 3.1 Flash Image chất lượng cao.
            Bạn cần chọn một API key từ dự án Google Cloud có trả phí để tiếp
            tục.
            <br />
            <br />
            <a
              href="https://ai.google.dev/gemini-api/docs/billing"
              target="_blank"
              rel="noreferrer"
              className="text-[#D97757] hover:underline"
            >
              Tìm hiểu thêm về thanh toán
            </a>
          </p>
          <button
            onClick={handleSelectKey}
            className="bg-[#D97757] hover:bg-[#C66545] text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-sm"
          >
            Chọn API Key
          </button>
        </div>
      </div>
    );
  }

  if (selectedApp === 'marcow') {
    return <MarcowApp />;
  }

  return <MarcowN8nApp />;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
