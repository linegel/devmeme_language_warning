import { OpenAI } from 'openai';
import * as languageService from '../services/language';

// Mock OpenAI
jest.mock('openai', () => {
  const mockCompletionsCreate = jest.fn();
  const mockOpenAI = jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: mockCompletionsCreate,
        },
      },
    };
  });
  
  // Store the mock function for easy access in tests
  // Use any type to avoid TypeScript errors
  (mockOpenAI as any).mockCompletionsCreate = mockCompletionsCreate;
  
  return {
    OpenAI: mockOpenAI,
    default: mockOpenAI,
  };
});

// Get access to the mock
const mockOpenAIModule = jest.requireMock('openai');
const mockCompletionsCreate = (mockOpenAIModule.OpenAI as any).mockCompletionsCreate;

// Mock the language service
jest.mock('../services/language', () => ({
  isEnglish: jest.fn(),
  setOpenAIClient: jest.fn(),
}));

// Import our function to test after mocking dependencies
import { analyzeImage, setOpenAIClient } from '../services/image';

describe('Image Analysis', () => {
  let mockOpenAIInstance: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Create a new instance of the mock
    mockOpenAIInstance = new mockOpenAIModule.OpenAI();
    // Set the mock client
    setOpenAIClient(mockOpenAIInstance);
  });
  
  it('should correctly analyze an image with English text', async () => {
    // Mock OpenAI to return a valid JSON response with English text
    mockCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"text":"Hello world","isEnglish":true}',
          },
        },
      ],
    });
    
    const result = await analyzeImage('http://example.com/image.jpg');
    
    expect(mockCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4-vision-preview',
        messages: expect.any(Array),
      })
    );
    expect(result).toEqual({ text: 'Hello world', isEnglish: true });
  });
  
  it('should correctly analyze an image with non-English text', async () => {
    // Mock OpenAI to return a valid JSON response with non-English text
    mockCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"text":"Bonjour le monde","isEnglish":false}',
          },
        },
      ],
    });
    
    const result = await analyzeImage('http://example.com/image.jpg');
    
    expect(result).toEqual({ text: 'Bonjour le monde', isEnglish: false });
  });
  
  it('should handle empty text in images', async () => {
    // Mock OpenAI to return a valid JSON response with no text
    mockCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"text":"","isEnglish":true}',
          },
        },
      ],
    });
    
    const result = await analyzeImage('http://example.com/image.jpg');
    
    expect(result).toEqual({ text: '', isEnglish: true });
  });
  
  it('should handle invalid JSON responses', async () => {
    // Mock OpenAI to return an invalid JSON response
    mockCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'This is not valid JSON',
          },
        },
      ],
    });
    
    // Mock the language service to say it's English
    (languageService.isEnglish as jest.Mock).mockResolvedValue(true);
    
    const result = await analyzeImage('http://example.com/image.jpg');
    
    expect(languageService.isEnglish).toHaveBeenCalledWith('This is not valid JSON');
    expect(result).toEqual({ text: 'This is not valid JSON', isEnglish: true });
  });
  
  it('should handle API errors gracefully', async () => {
    // Mock OpenAI to throw an error
    mockCompletionsCreate.mockRejectedValue(
      new Error('API error')
    );
    
    const result = await analyzeImage('http://example.com/image.jpg');
    
    // Should default to empty text and English to avoid bad behavior
    expect(result).toEqual({ text: '', isEnglish: true });
  });
}); 