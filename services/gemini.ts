
import { GoogleGenAI } from "@google/genai";
import { loadFromStorage, saveToStorage } from './storage';

// Cache the quote for the day to save API calls and keep it consistent
const STORAGE_KEY_QUOTE = 'daily_quote_data';

interface QuoteData {
  date: string;
  text: string;
}

export const getDailyMotivation = async (): Promise<string> => {
  const today = new Date().toDateString();
  const cached = loadFromStorage<QuoteData | null>(STORAGE_KEY_QUOTE, null);

  if (cached && cached.date === today) {
    return cached.text;
  }

  // Fallback if no API key is present
  if (!process.env.API_KEY) {
    return "Good morning, Dad! Tackle today with strength and grace. Simple steps lead to big journeys.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "You are a personal assistant for a hardworking father named Isaac. Generate a short Daily Briefing (under 40 words). Include a very short encouraging Bible verse and a practical productivity or health tip for the day. Tone: Warm, professional, son-to-father. Sign it 'Love, Chris'.",
    });

    const text = response.text || "Have a blessed day, Dad! Stay hydrated and focused. Love, Chris";
    saveToStorage(STORAGE_KEY_QUOTE, { date: today, text });
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Trust in the Lord with all your heart. Remember to take breaks today! Love, Chris";
  }
};

export const getWelcomeBriefing = async (context: string): Promise<string> => {
  if (!process.env.API_KEY) return "";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are 'Chris AI', the advanced OS for Isaac's device.
      
      Context Data:
      ${context}
      
      Generate a spoken briefing (approx 3-4 sentences).
      Structure:
      1. A short, powerful motivational quote or Bible verse.
      2. A quick financial pulse check (mention the balance).
      3. A summary of the most critical status (weather or tasks).
      4. End with "Systems online."
      
      Tone: Sci-fi, capable, yet warm and encouraging.`,
    });
    return response.text || "Welcome back, Isaac. Financials checked. Systems online.";
  } catch (e) {
    return "Welcome back. Systems online.";
  }
};

export const getAIAdvice = async (context: string, userQuery: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "I need an internet connection and API key to help you decide, Dad!";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  if (!process.env.API_KEY) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: { parts: [{ text }] },
      config: {
        responseModalities: ['AUDIO'],
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
    return null;
  }
};
