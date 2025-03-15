# Telegram Language Monitor Bot

A Telegram bot that monitors channel messages for non-English content. When it detects a message in a language other than English (including text in images), it translates the content to English and sends a reminder to use English only.

Initially created for [dev meme](https://t.me/dev_meme), shared for all TG channel owners.

## Features

- Monitors text messages in channels for non-English content
- Detects text in images using OpenAI's Vision capabilities
- Translates non-English content to English using OpenAI
- Automatically responds to non-English messages with translations
- Uses both local language detection and OpenAI for accurate language identification

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Telegram Bot token (from BotFather)
- An OpenAI API key with access to GPT-4 Vision API

## Detailed Setup Guide

### Obtaining a Telegram Bot API Token

1. Open Telegram and search for "@BotFather"
2. Start a chat with BotFather by clicking "Start" or sending "/start"
3. Send the command "/newbot" to create a new bot
4. Follow the prompts to name your bot:
   - First, provide a display name for your bot (e.g., "English Channel Monitor")
   - Then, provide a username for your bot (must end with "bot", e.g., "english_monitor_bot")
5. Once created, BotFather will provide you with a token that looks like `123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ`
6. Save this token securely - you'll need it for the `.env` file

### Obtaining an OpenAI API Key

1. Go to [OpenAI's platform](https://platform.openai.com/) or 
2. Sign up or log in to your OpenAI account
3. Navigate to the [API keys section](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Name your key (e.g., "Telegram Bot Key") and click "Create"
6. Copy the generated API key (it starts with "sk-")
7. Save this key securely - you'll need it for the `.env` file and you won't be able to view it again

### Installation

#### 1. Clone the repository and install dependencies

```bash
git clone https://github.com/yourusername/tg-bot-language.git
cd tg-bot-language
npm install
```

#### 2. Configure environment variables

Create a `.env` file based on the provided `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file and add your Telegram Bot token and OpenAI API key:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=your_openai_api_key
```

## Setting Up Your Bot in Telegram

### Adding Your Bot to a Channel

1. Open your Telegram channel
2. Click on the channel name at the top to view channel info
3. Select "Administrators" or "Admins" 
4. Click "Add Admin" or "Add Administrator"
5. Search for your bot by its username (e.g., @english_monitor_bot)
6. Select your bot and assign the following permissions:
   - ✅ Post Messages
   - ✅ Read Messages
   - ✅ Delete Messages (optional, but recommended)
   - ✅ Edit Messages (optional, but recommended)
7. Save the changes

### Configuring Bot Privacy Settings (if needed)

By default, Telegram bots can't see all messages in a group. If your bot needs to monitor all messages:

1. Open your chat with @BotFather
2. Send the command "/mybots"
3. Select your bot from the list
4. Select "Bot Settings"
5. Select "Group Privacy"
6. Select "Turn off" to allow your bot to see all messages

## Usage

### Development mode

```bash
npm run dev
```

### Build and run in production

```bash
npm run build
npm start
```

### Watch mode (for development)

```bash
npm run watch
```

### Running as a Service (Production)

For running the bot continuously on a server, consider using:

- **PM2**: A process manager for Node.js applications
  ```bash
  npm install -g pm2
  pm2 start npm --name "language-bot" -- start
  pm2 save
  pm2 startup
  ```

- **Docker**: For containerized deployment
  - A Dockerfile is included in the repository
  - Build and run with:
    ```bash
    docker build -t tg-language-bot .
    docker run -d --name language-bot --env-file .env tg-language-bot
    ```

## Bot Commands

The bot responds to the following commands:

- `/start` - Displays a welcome message and overview of the bot's functionality
- `/help` - Shows help information and available commands

## Testing

The bot includes a comprehensive test suite to ensure functionality works as expected. To run the tests:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

### Test Structure

The test suite is organized around these key components:

1. **Language Service Tests** (`language.test.ts`)
   - Tests language detection functionality with langdetect
   - Verifies correct fallback behavior when primary detection fails
   - Tests handling of API errors gracefully

2. **Image Analysis Tests** (`image.test.ts`)
   - Tests image analysis using OpenAI's vision model
   - Verifies handling of various text scenarios in images
   - Tests fallback mechanisms for invalid responses
   - Tests error handling for API failures

3. **Bot Logic Tests** (`bot.test.ts`) 
   - Tests command handlers for `/start` and `/help`
   - Tests channel post handling for text messages
   - Tests image processing and translation workflows
   - Tests empty message handling

### Mocking Approach

The tests use Jest's mocking capabilities to isolate units and avoid external dependencies:

- **OpenAI API**: Fully mocked to simulate various responses without actual API calls
- **Langdetect**: Mocked to provide controlled language detection results
- **Telegram Bot API**: Mocked to verify correct interactions and message handling
- **Environment Variables**: Controlled through test setup to ensure predictable behavior

This approach allows for thorough testing of business logic without relying on external services, ensuring tests are fast, reliable, and repeatable.

### Test Coverage

The test suite is set up to generate coverage reports. After running the tests, you can view the coverage report in the `coverage` directory.

## Troubleshooting

### Bot Not Responding in Channel
- Ensure the bot has been added as an administrator
- Verify the bot has the necessary permissions to post messages
- Check that the bot is running (using `npm start` or similar)
- Check the logs for any error messages
- Ensure the bot's privacy mode is disabled if needed

### API Errors
- Verify your OpenAI API key is valid and has sufficient credits
- Check if your Telegram Bot token is correct
- Ensure your environment variables are correctly set in the `.env` file

### Language Detection Issues
- The bot uses a combination of local language detection and OpenAI
- For non-standard text or slang, OpenAI provides better detection
- For images with text, the detection accuracy depends on the clarity of the text

## How it Works

1. The bot listens for all messages in channels where it's an admin
2. When a message is received, it checks if the content is in English
3. For text messages, it analyzes the text directly
4. For images, it uses OpenAI's GPT-4 Vision to:
   - Extract any text present in the image
   - Determine if the extracted text is in English
5. If non-English content is detected, it:
   - Translates the content to English using OpenAI
   - Sends a reply with the translation and a friendly reminder to use English

## Project Structure

- `src/services/` - Core services for language detection and image analysis
- `src/index.ts` - Main bot setup and handler registration
- `src/__tests__/` - Test files for all functionality

## License

MIT 