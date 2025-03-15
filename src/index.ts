import { Bot, Context } from 'grammy';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import * as langdetect from 'langdetect';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env file');
}

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not defined in .env file');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Initialize the Telegram bot
const bot = new Bot(TELEGRAM_BOT_TOKEN);

// Configure logging
console.log('Bot initializing...');

/**
 * Detect if text is in English
 * @param text Text to analyze
 * @returns True if English, False otherwise
 */
async function isEnglish(text: string): Promise<boolean> {
  try {
    // First try with langdetect (faster)
    const detections = langdetect.detect(text);
    if (detections && detections.length > 0 && detections[0].lang === 'en') {
      return true;
    }
    
    // If not clearly English or langdetect fails, verify with OpenAI
    const response = await openai.chat.completions.create({
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
async function translateText(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
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

/**
 * Analyze image using OpenAI vision model to detect text and language
 * @param imageUrl URL of the image to analyze
 * @returns Object with detected text and whether it's in English
 */
async function analyzeImage(imageUrl: string): Promise<{ text: string; isEnglish: boolean }> {
  try {
    // Use a single GPT-4 Vision call to both extract text and determine language
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extract any text in this image and determine if it's in English. Respond in JSON format with the following structure: {\"text\": \"extracted text\", \"isEnglish\": true/false}. If there is no text, set text to empty string and isEnglish to true." 
            },
            { type: "image_url", image_url: { url: imageUrl } }
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });
    
    const responseContent = response.choices[0].message.content?.trim() || '{"text":"","isEnglish":true}';
    
    try {
      const result = JSON.parse(responseContent);
      return {
        text: result.text || '',
        isEnglish: result.isEnglish === false ? false : true // Default to true if not explicitly false
      };
    } catch (parseError) {
      console.error('Error parsing JSON response from OpenAI:', parseError);
      // If response is not valid JSON, extract at least the text
      if (responseContent.length > 0 && !responseContent.includes('NO_TEXT_FOUND')) {
        // Make a second attempt to determine language
        const isTextEnglish = await isEnglish(responseContent);
        return { text: responseContent, isEnglish: isTextEnglish };
      }
      return { text: '', isEnglish: true };
    }
  } catch (error) {
    console.error('Error analyzing image with OpenAI:', error);
    return { text: '', isEnglish: true };
  }
}

// Handle start command
bot.command('start', async (ctx: Context) => {
  await ctx.reply("Hi! I'll monitor messages and provide translations for non-English content.");
});

// Handle help command
bot.command('help', async (ctx: Context) => {
  await ctx.reply("I automatically detect non-English messages and translate them to English.");
});

// Handle channel messages
bot.on('channel_post', async (ctx: Context) => {
  const message = ctx.update.channel_post;
  
  // Skip if message is undefined
  if (!message) {
    console.log('Received empty channel post');
    return;
  }
  
  // Handle text messages
  if (message.text) {
    const text = message.text;
    
    // Check if the text is not in English
    const english = await isEnglish(text);
    if (!english) {
      const translation = await translateText(text);
      await ctx.api.sendMessage(
        message.chat.id,
        `Translation: ${translation}\n\nPlease, refrain from usage of any language except English`,
        { reply_to_message_id: message.message_id }
      );
    }
  }
  
  // Handle images
  if (message.photo && message.photo.length > 0) {
    // Get the best quality photo (last in array)
    const photo = message.photo[message.photo.length - 1];
    
    // Get the file URL
    const fileInfo = await ctx.api.getFile(photo.file_id);
    if (!fileInfo.file_path) {
      console.error('No file path found for image');
      return;
    }
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Analyze the image with OpenAI vision
    const { text, isEnglish } = await analyzeImage(fileUrl);
    
    // If text was extracted and it's not in English, translate it
    if (text && !isEnglish) {
      const translation = await translateText(text);
      await ctx.api.sendMessage(
        message.chat.id,
        `Translation: ${translation}\n\nPlease, refrain from usage of any language except English`,
        { reply_to_message_id: message.message_id }
      );
    }
  }
});

// Error handling
bot.catch((err: Error) => {
  console.error('Bot error:', err);
});

// Start the bot
bot.start();
console.log('Bot started successfully!'); 