export interface Character {
  id: string;
  name: string;
  image: {
    mimeType: string;
    data: string;
  };
}

export interface GlobalSettings {
  aspectRatio: string;
  artStyle: string;
  script: string;
  dialogues: string[];
  postCaption?: string;
}

export interface PageData {
  imageUrl: string | null;
  isGenerating: boolean;
  characterRefIds: string[];
  originalScript?: string;
  generatedJson?: string;
  postCaption?: string;
  isAutoGeneratingImage?: boolean;
  isAutoPostingFB?: boolean;
  isAutoProcessing?: boolean;
  autoProcessMessage?: string;
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  autoSaveImages: boolean;
}
