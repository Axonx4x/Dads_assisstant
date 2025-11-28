
import { GoogleGenAI, Modality } from "@google/genai";
import { loadFromStorage, saveToStorage } from './storage';

// Cache the quote for the day to save API calls and keep it consistent
const STORAGE_KEY_QUOTE = 'daily_quote_data';

interface QuoteData {
  date: string;
  text: string;
}

// --- API KEY HELPER ---
// This ensures the app works in AI Studio, Local (Vite), and Vercel/Netlify
const getApiKey = (): string | undefined => {
  // 1. Check for Vite (Standard for local React dev)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  
  // 2. Check for standard process.env (AI Studio, Next.js, etc.)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }

  // 3. Fallback (Hardcoded for Dad's App usage)
  return 'AIzaSyDp44IF2SW_MJXVWpnmWqoPRe3a39CJL44';
};

const API_KEY = getApiKey();

export const getDailyMotivation = async (financialContext?: string): Promise<string> => {
  if (!API_KEY) {
    return "Good morning! (AI capabilities offline - Please configure API Key)";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a personal assistant for Isaac (Dad).
      
      Context:
      ${financialContext || 'Normal day.'}
      
      Generate a Daily Briefing (max 50 words).
      Include:
      1. A short, encouraging Bible verse.
      2. A brief comment on the financial status (if provided).
      3. A quick health or productivity tip.
      
      Tone: Warm, professional, son-to-father (Chris).`,
    });

    const text = response.text || "Have a blessed day, Dad! Stay hydrated and focused. Love, Chris";
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Trust in the Lord with all your heart. Remember to take breaks today! Love, Chris";
  }
};

export const getWelcomeBriefing = async (context: string): Promise<string> => {
  if (!API_KEY) return "";

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are 'Chris AI', the advanced OS for Isaac's device.
      
      Real-time Data:
      ${context}
      
      Generate a spoken briefing script (approx 3-4 sentences).
      Requirements:
      1. Start with "Welcome back, Isaac." or "Systems online."
      2. Mention the current financial balance clearly.
      3. Mention the most urgent task or weather condition.
      4. End with a short motivational quote or bible verse.
      
      Tone: Sci-fi, capable, yet warm and encouraging. Do not use markdown.`,
    });
    return response.text || "Welcome back, Isaac. Financials checked. Systems online.";
  } catch (e) {
    return "Welcome back. Systems online.";
  }
};

export const getAIAdvice = async (context: string, userQuery: string): Promise<string> => {
  if (!API_KEY) {
    return "I need an API key to access my brain! Please configure it in the settings.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are 'Chris AI', a helpful, wise, and calm personal assistant for Isaac (Dad).
      
      Current Context:
      ${context}
      
      User's Question: "${userQuery}"
      
      Provide a short, practical, and decisive answer (max 60 words). If suggesting a decision, explain why briefly. Be encouraging.`,
    });

    return response.text || "I'm having trouble thinking right now, but I trust your judgement!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I couldn't connect to the server. Try again later.";
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  if (!API_KEY) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is a good, natural male voice
          },
        },
      },
    });

    // Extract base64 audio string
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    // Return null to signal the app to use fallback TTS
    return null;
  }
};
