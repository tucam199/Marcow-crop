import React, { useState } from "react";
import { useAppContext } from "../AppContext";

export default function Login() {
  const { setIsAuthenticated } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store the secure token (not plain credentials)
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authUser", data.username);
        setIsAuthenticated(true);
        setError("");
      } else {
        setError(data.error || "Sai tài khoản hoặc mật khẩu");
      }
    } catch (err) {
      setError("Không thể kết nối đến server. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#FAF9F6] text-[#2D2D2D] font-sans relative">
      <div 
        className="absolute inset-[100px] rounded-[32px] overflow-hidden hidden md:block"
        style={{ 
          backgroundImage: "url('/bgg.png')",
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      />
      <div 
        className="absolute inset-4 rounded-[16px] overflow-hidden block md:hidden"
        style={{ 
          backgroundImage: "url('/bgg.png')",
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      />
      <div className="w-full max-w-sm p-8 bg-white border border-stone-200 shadow-xl rounded-2xl flex flex-col gap-6 relative z-10">
        <div className="text-center">
          <img 
            src="https://matbao.in/wp-content/uploads/2026/03/marcow.png" 
            alt="Logo" 
            className="h-10 object-contain mx-auto mb-4"
          />
          <h2 className="text-xl font-semibold text-stone-800">Đăng nhập</h2>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg text-center">
              {error}
            </div>
          )}
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] transition-all"
              placeholder="Nhập tên đăng nhập"
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] transition-all"
              placeholder="Nhập mật khẩu"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full bg-[#D97757] hover:bg-[#C66545] text-white font-medium py-3 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Đang xác thực..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
