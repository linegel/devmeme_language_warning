import OpenAI from 'openai';
import { isEnglish } from './language';

// This function would be initialized with the actual OpenAI client in production
let openaiClient: any;

export function setOpenAIClient(client: any) {
  openaiClient = client;
}

/**
 * Analyze image using OpenAI vision model to detect text and language
 * @param imageUrl URL of the image to analyze
 * @returns Object with detected text and whether it's in English
 */
export async function analyzeImage(imageUrl: string): Promise<{ text: string; isEnglish: boolean }> {
  try {
    // Use a single GPT-4 Vision call to both extract text and determine language
    const response = await openaiClient.chat.completions.create({
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