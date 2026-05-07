# 📦 LLMLingua-2 Compressor — User Guide

> Strip the prose. Keep the story.

This guide covers everything you need to know to get the most out of the LLMLingua-2 Compressor extension for SillyTavern.

---

## 📖 What is LLMLingua-2?

[LLMLingua-2](https://huggingface.co/spaces/microsoft/llmlingua-2) is a research technique from Microsoft for **token-level text compression** — not summarisation. The goal is different from asking an AI to "summarise this":

| Summarisation | LLMLingua-2 Compression |
|---|---|
| Rewrites the content | Prunes the original content |
| Changes wording and perspective | Keeps original phrasing where possible |
| May drop minor details | Keeps every name, fact, and event |
| Good for "what happened?" | Good for "give me everything, smaller" |

Think of it like squeezing water out of a sponge — the sponge keeps its shape, it just takes up less space.

This extension sends your text to **your already-configured SillyTavern API** with a carefully designed LLMLingua-2 style prompt. No extra accounts, no extra services.

---

## 🚀 Opening the Compressor

1. Make sure you have an API connected in SillyTavern (the same one you use for chatting)
2. Click the **Extensions** panel (puzzle-piece icon, top right)
3. Scroll to **LLMLingua-2 Compressor** and expand it
4. Click **Open Compressor**

A dialog will open with everything you need.

---

## 💬 Chat Messages Tab

Use this tab to compress messages directly from your active chat.

### Message IDs — what are they?

Every message in the current chat has an ID, starting from `0` (the very first message) and counting up. The **Chat length** counter in the dialog tells you how many messages exist.

- **Start Message ID** — the first message to include (default: `0`)
- **End Message ID** — the last message to include (default: last message)

To compress the whole chat, leave both fields at their defaults. To compress only part of it, enter the IDs you want.

> 💡 **Tip:** Message IDs map directly to what you see in the chat. Message 0 is at the top, and the last message is at the bottom.

### Preview Selection

Click **Preview Selection** to load the selected messages into the preview box so you can check what will be sent. This is optional — clicking **Compress** will always read the current ID range directly, whether you've previewed or not.

---

## 📋 Custom Text Tab

Use this tab to compress any text you have on hand — not just chat messages.

Paste or type whatever you want into the text area and click **Compress**. This works for:

- Chat logs exported from other tools
- Roleplay notes or background lore you've written elsewhere
- Any long document you want trimmed down

---

## ⚙️ Compression Settings

Click **Compression Settings** to expand the settings panel.

### 🎚️ Target Size (Compression Ratio)

The slider controls how aggressively the text is compressed, as a **percentage of the original token count**.

| Setting | Effect |
|---|---|
| **10% — extreme** | Very aggressive pruning; only bare-bones facts remain |
| **50% — balanced** | Removes clear filler and prose; keeps all meaningful content |
| **90% — light trim** | Gentle pass; mostly removes obvious fluff words |

Start at **50%** and adjust from there. Your setting is saved automatically.

> ⚠️ **Note:** The ratio is a *target* — it's an instruction to the AI, not a hard limit. Results may vary slightly depending on your model and the nature of the text.

### ✏️ Override with a Custom Prompt

The built-in prompt works well for most cases, but if you want complete control over the compression instructions, check **Override with a custom prompt** and write your own.

Use these placeholders in your custom prompt:

- **`{text}`** — replaced with the text to compress
- **`{ratio}`** — replaced with the current slider value (e.g. `50`)

When enabled, your single prompt replaces both the system message and the user message that the extension normally sends. Leave it blank to use the built-in prompt.

> 💡 **Example custom prompt:**
> ```
> You are a compression tool. Compress the following to {ratio}% of its original length.
> Keep all names, dates, and dialogue. Output only the compressed text.
>
> {text}
> ```

---

## ▶️ Compressing

Once you've chosen your input source and settings, click **Compress**.

The extension sends your text to your configured API and waits for the result. You'll see a spinner while it's working. Compression time depends on text length and your API's response speed.

After compression:

- The **Compressed output** box shows the result
- A **statistics line** shows the original vs. compressed word count and the actual achieved percentage

---

## 💾 Saving Your Result

### Copy to Clipboard

Click **Copy** to copy the compressed text to your clipboard, ready to paste anywhere.

### Download as .txt

Click **Download .txt** to save the compressed text as a plain-text file. The filename includes a timestamp so repeated downloads don't overwrite each other:

```
llmlingua-2025-05-07T14-30-00.txt
```

---

## ❓ Troubleshooting

**The extension fails to load.**
Make sure you installed it through SillyTavern's Extension Installer or placed it in the correct `extensions/` folder. The files must be inside a subdirectory (e.g. `extensions/SillyTavern-LLMLingua-extension/`), not loose in the folder.

**I get an error when I click Compress.**
Check that your API is connected and working — try sending a normal chat message first. If the API works in chat, it will work here. Also check that you haven't left the text input empty.

**The compression ratio I asked for isn't what I got.**
The ratio is a target instruction to the model, not a hard constraint. Very short texts or texts with dense information may not compress to the exact target. Try a lower ratio or a different model if you need more aggressive compression.

**The result is just a summary, not compressed text.**
Some smaller or instruction-tuned models default to summarising instead of compressing. Try switching to a larger or more capable model in your SillyTavern API settings, or use the custom prompt override to make the instruction more explicit.

**The result cuts off mid-sentence.**
The model may have hit its response length limit. Check your SillyTavern settings for a maximum response token cap and increase it, or compress a smaller range of messages at a time.

---

## 💡 Tips & Best Practices

- **Compress in chunks** — for very long chats (100+ messages), split into blocks of 20–30 messages each for more consistent results.
- **50% is a good starting point** for chat logs — most roleplay has a lot of narrative padding that compresses cleanly.
- **Use the preview** before compressing if you want to double-check exactly which messages are included.
- **The result textarea is editable** — you can make manual corrections before copying or downloading.
- **Custom prompts persist** — once you write a custom prompt you like, it's saved automatically and will be there next session.

---

*Built with care for the SillyTavern community.*
