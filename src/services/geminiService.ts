import { GoogleGenAI } from "@google/genai";
import { Persona } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const PERSONA_PROMPTS: Record<Persona, string> = {
  [Persona.CLASSIC]: "You are SHIRBHATE::CORE, a highly capable, professional, and accurate intelligence. Provide concise and helpful answers."
};

export async function chat(
  message: string,
  history: { role: 'user' | 'model'; content: string }[],
  persona: Persona,
  targetLanguage: string,
  translate: boolean
) {
  let systemInstruction = PERSONA_PROMPTS[persona];
  
  if (translate && targetLanguage !== 'en') {
    systemInstruction += ` IMPORTANT: After your primary response, provide a highly natural, culturally localized translation in ${targetLanguage}. Do not use literal word-for-word translation; instead, focus on how a native speaker would express the same thought in that context. Format it strictly as: ---TRANSLATION--- [Translated Text]`;
  }

  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction,
      temperature: 0.8,
    }
  });

  return response.text;
}

export async function generateImage(prompt: string) {
  const model = "gemini-2.5-flash-image";
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateVideo(prompt: string, apiKey: string) {
  // Use a fresh instance with the custom API key as per rules
  const videoAi = new GoogleGenAI({ apiKey });
  
  let operation = await videoAi.models.generateVideos({
    model: 'veo-3.1-lite-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await videoAi.operations.getVideosOperation({ operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) return null;

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function translateText(text: string, targetLanguage: string) {
  const model = "gemini-2.0-pro-exp-02-05"; // Upgraded to more advanced reasoning model for translation
  const response = await ai.models.generateContent({
    model,
    contents: `Translate the following text to ${targetLanguage}: "${text}"`,
    config: {
      systemInstruction: "You are an expert polyglot translator. Your goal is to provide highly accurate, culturally nuanced, and natural-sounding translations. Do not just translate literally; capture the intent, tone, and context. Only output the translated text itself, no explanations.",
    }
  });
  return response.text;
}

export async function detectLanguage(text: string) {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Detect the language of the following text. Just return the language name (e.g., "Spanish", "French", "Japanese", "Hindi"). If it's English, return "English". Text: "${text}"`,
    config: {
      systemInstruction: "You are a language identification expert. Only output the name of the language. Nothing else.",
    }
  });
  return response.text.trim();
}
