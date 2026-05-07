# SillyTavern LLMLingua-2 Compressor

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) extension that compresses chat logs and freeform text using [LLMLingua-2](https://huggingface.co/spaces/microsoft/llmlingua-2) style prompt compression — stripping prose, filler, and redundant narrative while keeping every name, fact, and event intact.

The compression runs entirely through your already-configured SillyTavern API, so no extra services or accounts are required.

---

## Features

- **Chat message selection** — pick any range of messages from the active chat by start/end ID
- **Custom text input** — paste any freeform text you want compressed
- **Configurable compression ratio** — 10 % (extreme) to 90 % (light trim), persisted between sessions
- **Custom prompt override** — replace the built-in LLMLingua-2 prompt with your own
- **Word-count statistics** — see original vs. compressed size after each run
- **Copy & Download** — grab the result to clipboard or save as a `.txt` file

---

## Installation

### Via SillyTavern Extension Installer (recommended)

1. In SillyTavern open **Extensions → Manage Extensions → Install Extension**
2. Paste this repository URL and click **Install**:
   ```
   https://github.com/kolacheee/SillyTavern-LLMLingua-extension
   ```
3. The extension appears in your Extensions panel as **LLMLingua-2 Compressor** and is ready to use immediately — no restart needed.

### Manual

Clone or download this repository into your SillyTavern `data/default-user/extensions/` folder (or wherever your user extension directory is), then reload the SillyTavern page.

---

## Quick Start

1. Open a chat in SillyTavern
2. Go to **Extensions** and expand **LLMLingua-2 Compressor**
3. Click **Open Compressor**
4. Leave the message IDs at `0` → last message and click **Compress**
5. Download or copy the result

See [USER_GUIDE.md](USER_GUIDE.md) for detailed usage instructions.

---

## Requirements

- SillyTavern (any recent version)
- Any chat-completion or text-completion API configured in SillyTavern (OpenAI, Claude, local models via Ollama/llama.cpp, etc.)

---

## License

[MIT](LICENSE)
