
export interface WordReplacement {
  find: string;
  replace: string;
}

export interface BatchItem {
  id: string;
  originalImage: string;
  editedImage?: string;
  originalDescription: string;
  rewrittenDescription?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  faceSwapPrompt?: string;
}

export interface GlobalConfig {
  colorCombination: string;
  textColor: string;
  targetFaceDescription: string;
  wordReplacements: WordReplacement[];
}
