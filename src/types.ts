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
}

export interface PageData {
  imageUrl: string | null;
  isGenerating: boolean;
  characterRefIds: string[];
  originalScript?: string;
  generatedJson?: string;
}
