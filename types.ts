export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

export enum GeminiModel {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
}

export interface ChatSession {
  id: string;
  messages: Message[];
  model: GeminiModel;
}