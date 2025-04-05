# YouTube Audio Search Extension

This Chrome extension allows you to extract audio from YouTube videos, convert it to text, and search within that text. When you find what you're looking for, the extension can jump to the exact timestamp in the video.

## Features

- Extract audio from YouTube videos
- Convert speech to text (simulated in this demo version)
- Search within the transcript
- Jump to specific timestamps in the video
- View the full transcript with timestamps

## Installation

Since this extension is not published to the Chrome Web Store, you'll need to install it in developer mode:

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your Chrome toolbar

## Usage

1. Navigate to any YouTube video
2. Click the extension icon in your Chrome toolbar
3. Click "Transcribe Video" to generate a transcript
4. Once transcription is complete, you can:
   - Search for specific words or phrases
   - Click on any timestamp to jump to that point in the video
   - View the full transcript

## Technical Notes

This demo version uses a simulated transcript for demonstration purposes. In a production version, you would integrate with a proper speech-to-text API like:

- Google Cloud Speech-to-Text
- Microsoft Azure Speech Services
- Amazon Transcribe

The extension currently captures a short segment of audio (up to 30 seconds) for demonstration. A full implementation would process the entire video.

## Privacy

This extension processes audio locally and does not send any data to external servers in this demo version. A production version using cloud speech-to-text APIs would need to send audio data to those services.

## License

MIT
