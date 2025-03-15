declare module 'langdetect' {
  export interface LanguageDetection {
    lang: string;
    prob: number;
  }
  
  export function detect(text: string): LanguageDetection[];
} 