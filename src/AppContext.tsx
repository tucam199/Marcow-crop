import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { GlobalSettings, Character, PageData, UserProfile } from "./types";
import { CheckCircle, Info } from "lucide-react";

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface AppState {
  settings: GlobalSettings;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  page: PageData;
  setPage: React.Dispatch<React.SetStateAction<PageData>>;
  isAuthenticated: boolean;
  authChecked: boolean;
  setIsAuthenticated: (value: boolean) => void;
  selectedApp: 'marcow' | 'marcow_n8n' | null;
  setSelectedApp: (value: 'marcow' | 'marcow_n8n' | null) => void;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  directoryHandle: any;
  setDirectoryHandle: React.Dispatch<any>;
  hasKey: boolean | null;
  handleSelectKey: () => Promise<void>;
  resetKey: () => void;
  showToast: (msg: string, type?: 'success' | 'info') => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedApp, setSelectedApp] = useState<'marcow' | 'marcow_n8n' | null>(() => {
    return localStorage.getItem("selectedApp") as 'marcow' | 'marcow_n8n' | null;
  });
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [toastConfig, setToastConfig] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      name: "Tuta",
      avatarUrl: "https://ui-avatars.com/api/?name=Tuta&background=D97757&color=fff",
      autoSaveImages: false,
    };
  });
  const [settings, setSettings] = useState<GlobalSettings>({
    aspectRatio: "1:1",
    artStyle: "Thỏ Bảy Màu",
    script: "",
    dialogues: [""],
    postCaption: "",
  });
  const [characters, setCharacters] = useState<Character[]>([]);
  const [page, setPage] = useState<PageData>({
    imageUrl: null,
    isGenerating: false,
    characterRefIds: [],
  });

  // Verify auth token on app load
  useEffect(() => {
    async function verifyAuth() {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setAuthChecked(true);
        return;
      }
      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.valid) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
        }
      } catch {
        // If server is unreachable, keep the token but don't authenticate
        // so the user can retry
      }
      setAuthChecked(true);
    }
    verifyAuth();
  }, []);

  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    async function checkKey() {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        setHasKey(true);
      }
    }
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const resetKey = () => {
    setHasKey(false);
  };

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToastConfig({ message: msg, type });
    setTimeout(() => {
      setToastConfig(null);
    }, 3000);
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        setSettings,
        characters,
        setCharacters,
        page,
        setPage,
        isAuthenticated,
        authChecked,
        setIsAuthenticated: (val) => {
          setIsAuthenticated(val);
          if (!val) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("authUser");
            setSelectedApp(null);
            localStorage.removeItem("selectedApp");
          }
        },
        selectedApp,
        setSelectedApp: (val) => {
          setSelectedApp(val);
          if (val) localStorage.setItem("selectedApp", val);
          else localStorage.removeItem("selectedApp");
        },
        userProfile,
        setUserProfile,
        directoryHandle,
        setDirectoryHandle,
        hasKey,
        handleSelectKey,
        resetKey,
        showToast,
      }}
    >
      {children}
      {toastConfig && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${toastConfig.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
            {toastConfig.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Info className="w-5 h-5 text-blue-500" />}
            <span className="text-sm font-medium pr-2">{toastConfig.message}</span>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within AppProvider");
  return context;
};
