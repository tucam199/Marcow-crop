import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { GlobalSettings, Character, PageData } from "./types";

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
  hasKey: boolean | null;
  handleSelectKey: () => Promise<void>;
  resetKey: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<GlobalSettings>({
    aspectRatio: "1:1",
    artStyle: "Manga",
    script: "",
  });
  const [characters, setCharacters] = useState<Character[]>([]);
  const [page, setPage] = useState<PageData>({
    imageUrl: null,
    isGenerating: false,
    characterRefIds: [],
  });

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

  return (
    <AppContext.Provider
      value={{
        settings,
        setSettings,
        characters,
        setCharacters,
        page,
        setPage,
        hasKey,
        handleSelectKey,
        resetKey,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within AppProvider");
  return context;
};
