# Telegram Language Monitor Bot

A Telegram bot that monitors channel messages for non-English content. When it detects a message in a language other than English (including text in images), it translates the content to English and sends a reminder to use English only.

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

## Installation

### 1. Clone the repository and install dependencies

```bash
git clone https://github.com/yourusername/tg-bot-language.git
cd tg-bot-language
npm install
```

### 2. Configure environment variables

Create a `.env` file based on the provided `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file and add your Telegram Bot token and OpenAI API key:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

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

## Testing

The bot includes a comprehensive test suite to ensure functionality works as expected. To run the tests:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

### Test Coverage

The test suite is set up to generate coverage reports. After running the tests, you can view the coverage report in the `coverage` directory.

## Adding the Bot to a Channel

1. Create a bot via BotFather on Telegram
2. Add the bot to your channel as an administrator
3. Give the bot permission to post messages
4. Start the bot using the instructions above

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

## License

MIT 