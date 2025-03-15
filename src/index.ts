import { Bot, Context } from 'grammy';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import { isEnglish, translateText, setOpenAIClient as setLanguageOpenAIClient } from './services/language';
import { analyzeImage, setOpenAIClient as setImageOpenAIClient } from './services/image';

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
// Handle both CommonJS and ES Module versions of the OpenAI package
const openai = new (OpenAI as any)({
  apiKey: OPENAI_API_KEY,
});

// Set the OpenAI client for our services
setLanguageOpenAIClient(openai);
setImageOpenAIClient(openai);

// Initialize the Telegram bot
const bot = new Bot(TELEGRAM_BOT_TOKEN);

// Configure logging
console.log('Bot initializing...');

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
    const { text, isEnglish: isTextEnglish } = await analyzeImage(fileUrl);
    
    // If text was extracted and it's not in English, translate it
    if (text && !isTextEnglish) {
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