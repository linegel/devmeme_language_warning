import { Bot, Context } from 'grammy';
import * as languageService from '../services/language';
import * as imageService from '../services/image';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock our service modules
jest.mock('../services/language', () => ({
  isEnglish: jest.fn(),
  translateText: jest.fn(),
  setOpenAIClient: jest.fn(),
}));

jest.mock('../services/image', () => ({
  analyzeImage: jest.fn(),
  setOpenAIClient: jest.fn(),
}));

// Create command handlers storage that we can access in our tests
const commandHandlers: Record<string, Function> = {};
let channelPostHandler: Function | undefined;

// Mock the Bot class from grammy
jest.mock('grammy', () => {
  // Create a mock implementation that captures handlers
  const mockBot = {
    command: jest.fn().mockImplementation((command, handler) => {
      commandHandlers[command] = handler;
      return mockBot;
    }),
    on: jest.fn().mockImplementation((event, handler) => {
      if (event === 'channel_post') {
        channelPostHandler = handler;
      }
      return mockBot;
    }),
    catch: jest.fn().mockReturnThis(),
    start: jest.fn(),
  };
  
  return {
    Bot: jest.fn().mockImplementation(() => mockBot),
    Context: jest.fn(),
  };
});

// Mock OpenAI - The key fix is here
jest.mock('openai', () => {
  const mockedCompletionsCreate = jest.fn();

  // Create a constructor function that can be used with 'new'
  function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: mockedCompletionsCreate,
        },
      },
    };
  }
  
  // Allow it to be used as a default import
  MockOpenAI.default = MockOpenAI;
  
  return {
    __esModule: true,
    default: MockOpenAI,
    OpenAI: MockOpenAI
  };
});

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn().mockResolvedValue({
  json: jest.fn().mockResolvedValue({})
}));

// Setup environment for the index.ts module
const env = process.env;
process.env.TELEGRAM_BOT_TOKEN = 'fake-token';
process.env.OPENAI_API_KEY = 'fake-api-key';

describe('Telegram Bot', () => {
  let mockContext: any;
  
  beforeAll(() => {
    // Set up default mock implementations
    (imageService.analyzeImage as jest.Mock).mockImplementation(async () => {
      return { text: '', isEnglish: true };
    });
    
    // Load the bot initialization code which will register handlers
    jest.isolateModules(() => {
      require('../index');
    });
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default responses for mocks
    (languageService.isEnglish as jest.Mock).mockResolvedValue(true);
    (languageService.translateText as jest.Mock).mockResolvedValue('Hello world');
    (imageService.analyzeImage as jest.Mock).mockResolvedValue({ text: '', isEnglish: true });
    
    // Setup mock context
    mockContext = {
      reply: jest.fn().mockResolvedValue(undefined),
      api: {
        sendMessage: jest.fn().mockResolvedValue(undefined),
        getFile: jest.fn().mockResolvedValue({ file_path: 'path/to/file.jpg' }),
      },
      update: {
        channel_post: {
          message_id: 123,
          chat: { id: 456 },
          text: 'Hello world',
          photo: [
            { file_id: 'small_photo_id' },
            { file_id: 'medium_photo_id' },
            { file_id: 'large_photo_id' },
          ],
        },
      },
    };
  });
  
  afterAll(() => {
    // Restore the original environment
    process.env = env;
  });
  
  describe('Command Handlers', () => {
    it('should respond to /start command', async () => {
      // Get the start command handler
      const startHandler = commandHandlers['start'];
      expect(startHandler).toBeDefined();
      
      // Call the handler
      await startHandler(mockContext);
      
      // Check that the correct response was sent
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining("I'll monitor messages")
      );
    });
    
    it('should respond to /help command', async () => {
      // Get the help command handler
      const helpHandler = commandHandlers['help'];
      expect(helpHandler).toBeDefined();
      
      // Call the handler
      await helpHandler(mockContext);
      
      // Check that the correct response was sent
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('automatically detect')
      );
    });
  });
  
  describe('Channel Post Handlers', () => {
    it('should check text messages for English language', async () => {
      // Get the channel post handler
      expect(channelPostHandler).toBeDefined();
      
      // Mock the language service for this test
      (languageService.isEnglish as jest.Mock).mockResolvedValue(false);
      
      // Call the handler
      await channelPostHandler!(mockContext);
      
      // Check that the language service was called correctly
      expect(languageService.isEnglish).toHaveBeenCalledWith('Hello world');
      expect(languageService.translateText).toHaveBeenCalledWith('Hello world');
      
      // Check that the correct message was sent
      expect(mockContext.api.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('Translation: Hello world'),
        expect.objectContaining({ reply_to_message_id: 123 })
      );
    });
    
    it('should not translate English text messages', async () => {
      // Mock the language service to return that the text is English
      (languageService.isEnglish as jest.Mock).mockResolvedValue(true);
      
      // Call the handler
      await channelPostHandler!(mockContext);
      
      // Check that the language service was called
      expect(languageService.isEnglish).toHaveBeenCalledWith('Hello world');
      
      // Check that translation was not attempted
      expect(languageService.translateText).not.toHaveBeenCalled();
      expect(mockContext.api.sendMessage).not.toHaveBeenCalled();
    });
    
    it('should analyze images for text and language', async () => {
      // Create a context with an image but no text
      const photoContext = {
        ...mockContext,
        update: {
          channel_post: {
            message_id: 123,
            chat: { id: 456 },
            photo: [
              { file_id: 'small_photo_id' },
              { file_id: 'large_photo_id' },
            ],
          },
        },
      };
      
      // Mock the image service to return non-English text
      (imageService.analyzeImage as jest.Mock).mockResolvedValue({
        text: 'Bonjour le monde',
        isEnglish: false,
      });
      
      // Call the handler
      await channelPostHandler!(photoContext);
      
      // Check that the file was retrieved
      expect(photoContext.api.getFile).toHaveBeenCalledWith('large_photo_id');
      
      // Check that the image was analyzed
      expect(imageService.analyzeImage).toHaveBeenCalledWith(
        expect.stringContaining('api.telegram.org/file/bot')
      );
      
      // Check that the text was translated
      expect(languageService.translateText).toHaveBeenCalledWith('Bonjour le monde');
      
      // Check that the correct message was sent
      expect(photoContext.api.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('Translation: Hello world'),
        expect.objectContaining({ reply_to_message_id: 123 })
      );
    });
    
    it('should not translate images with English text', async () => {
      // Create a context with an image but no text
      const photoContext = {
        ...mockContext,
        update: {
          channel_post: {
            message_id: 123,
            chat: { id: 456 },
            photo: [
              { file_id: 'small_photo_id' },
              { file_id: 'large_photo_id' },
            ],
          },
        },
      };
      
      // Mock the image service to return English text
      (imageService.analyzeImage as jest.Mock).mockResolvedValue({
        text: 'Hello world',
        isEnglish: true,
      });
      
      // Call the handler
      await channelPostHandler!(photoContext);
      
      // Check that the file was retrieved
      expect(photoContext.api.getFile).toHaveBeenCalledWith('large_photo_id');
      
      // Check that the image was analyzed
      expect(imageService.analyzeImage).toHaveBeenCalled();
      
      // Check that translation was not attempted
      expect(languageService.translateText).not.toHaveBeenCalled();
      expect(photoContext.api.sendMessage).not.toHaveBeenCalled();
    });
    
    it('should handle empty or undefined messages', async () => {
      // Create a context with no channel post
      const emptyContext = {
        ...mockContext,
        update: {},
      };
      
      // Call the handler
      await channelPostHandler!(emptyContext);
      
      // Check that no services were called
      expect(languageService.isEnglish).not.toHaveBeenCalled();
      expect(languageService.translateText).not.toHaveBeenCalled();
      expect(emptyContext.api.sendMessage).not.toHaveBeenCalled();
    });
  });
}); 