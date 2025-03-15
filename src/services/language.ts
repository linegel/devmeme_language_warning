import * as langdetect from 'langdetect';
import OpenAI from 'openai';

// This function would be initialized with the actual OpenAI client in production
let openaiClient: any;

export function setOpenAIClient(client: any) {
  openaiClient = client;
}

/**
 * Detect if text is in English
 * @param text Text to analyze
 * @returns True if English, False otherwise
 */
export async function isEnglish(text: string): Promise<boolean> {
  try {
    // First try with langdetect (faster)
    const detections = langdetect.detect(text);
    if (detections && detections.length > 0 && detections[0].lang === 'en') {
      return true;
    }
    
    // If not clearly English or langdetect fails, verify with OpenAI
    const response = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a language detection assistant. Respond with only 'english' or 'non-english'." },
        { role: "user", content: `Is this text in English? Answer with only 'english' or 'non-english': ${text}` }
      ],
      max_tokens: 10,
    });
    
    const result = response.choices[0].message.content?.trim().toLowerCase() || '';
    return result.includes('english');
  } catch (error) {
    console.error('Error detecting language:', error);
    // Default to English in case of error to avoid unnecessary translations
    return true;
  }
}

/**
 * Translate text to English
 * @param text Text to translate
 * @returns Translated text
 */
export async function translateText(text: string): Promise<string> {
  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a translation assistant. Translate the text to English." },
        { role: "user", content: `Translate this text to English: ${text}` }
      ],
      max_tokens: 1000,
    });
    
    return response.choices[0].message.content?.trim() || 'Translation error';
  } catch (error) {
    console.error('Error translating text:', error);
    return 'Error translating text.';
  }
} 