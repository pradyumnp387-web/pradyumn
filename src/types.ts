/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Persona {
  CLASSIC = 'classic'
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  timestamp: number;
}

export interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  persona: Persona;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  persona: Persona;
  targetLanguage: string;
  isTranslating: boolean;
  isTyping: boolean;
}

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
];
