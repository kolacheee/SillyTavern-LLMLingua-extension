import { extension_settings, getContext } from '../../../extensions.js';
import { generateRaw, saveSettingsDebounced } from '../../../../script.js';
import { callGenericPopup, POPUP_TYPE } from '../../../popup.js';

const EXT_NAME = 'llmlingua';

const DEFAULT_SETTINGS = {
    compressionRatio: 50,
    customPrompt: '',
    useCustomPrompt: false,
};

// LLMLingua-2 inspired compression prompt.
// Instructs the LLM to act as a token-level compressor (not a summarizer):
// strips prose/fluff while leaving all facts, names, and meaning intact.
const DEFAULT_SYSTEM_PROMPT =
`You are a text compression engine implementing LLMLingua-2 style token-level compression.
Your task: aggressively prune the text below to approximately {ratio}% of its original token count.

REMOVE without mercy:
- Filler and hedge words (very, really, quite, just, basically, actually, perhaps, somewhat)
- Verbose descriptors and flowery prose that add no new information
- Redundant phrases and restatements of the same idea
- Unnecessary articles and prepositions where meaning survives without them
- Padding sentences that exist only for narrative rhythm

ALWAYS KEEP:
- Every name, entity, place, date, number, and statistic
- Every distinct fact, event, action, and causal relationship
- All direct speech and dialogue (may be trimmed but not omitted)
- Domain-specific or technical vocabulary
- Logical connectors that maintain meaning across sentences

OUTPUT RULES:
- Output ONLY the compressed text — no preamble, no explanation, no meta-commentary
- Do NOT summarise, paraphrase, or reinterpret — preserve original wording where possible
- Telegraphic but complete; a reader must be able to reconstruct all original facts`;

const DEFAULT_USER_TEMPLATE =
`Compress the following text to approximately {ratio}% of its original token count using the rules above. Output only the compressed text.

---
{text}
---`;

function getSettings() {
    if (!extension_settings[EXT_NAME]) {
        extension_settings[EXT_NAME] = { ...DEFAULT_SETTINGS };
    }
    return extension_settings[EXT_NAME];
}

/**
 * Build the system prompt and user message for compression.
 * @param {string} text Raw text to compress
 * @param {number} ratio Target size as % of original
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
function buildPrompts(text, ratio) {
    const settings = getSettings();

    if (settings.useCustomPrompt && settings.customPrompt.trim()) {
        // User supplies a single monolithic prompt; embed text + ratio into it
        const full = settings.customPrompt
            .replace(/\{ratio\}/g, ratio)
            .replace(/\{text\}/g, text);
        return { systemPrompt: '', userPrompt: full };
    }

    const systemPrompt = DEFAULT_SYSTEM_PROMPT.replace(/\{ratio\}/g, ratio);
    const userPrompt = DEFAULT_USER_TEMPLATE
        .replace(/\{ratio\}/g, ratio)
        .replace(/\{text\}/g, text);

    return { systemPrompt, userPrompt };
}

/**
 * Extract selected chat messages as formatted text.
 * @param {number} startId Inclusive start index into chat array
 * @param {number} endId   Inclusive end index into chat array
 * @returns {string}
 */
function getChatMessagesText(startId, endId) {
    const context = getContext();
    const chat = context.chat;
    if (!chat || chat.length === 0) return '';

    const start = Math.max(0, startId);
    const end = Math.min(chat.length - 1, endId);

    return chat
        .slice(start, end + 1)
        .filter(m => m && !m.is_system && m.mes)
        .map(m => {
            const speaker = m.name || (m.is_user ? 'User' : 'Assistant');
            return `${speaker}: ${m.mes}`;
        })
        .join('\n\n');
}

/**
 * Send text to the configured API for LLMLingua-2 style compression.
 * @param {string} text
 * @param {number} ratio
 * @returns {Promise<string>}
 */
async function performCompression(text, ratio) {
    if (!text || !text.trim()) {
        throw new Error('No text provided for compression.');
    }

    const { systemPrompt, userPrompt } = buildPrompts(text.trim(), ratio);

    /** @type {import('../../../script.js').GenerateRawParams} */
    const params = {
        prompt: userPrompt,
        systemPrompt: systemPrompt,
    };

    const result = await generateRaw(params);

    if (!result || !result.trim()) {
        throw new Error('The API returned an empty response. Check your connection and API settings.');
    }

    return result.trim();
}

/**
 * Trigger a plain-text file download in the browser.
 * @param {string} text
 * @param {string} filename
 */
function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Rough word count for display statistics. */
function wordCount(str) {
    return str.trim().split(/\s+/).filter(Boolean).length;
}

/** Build and show the compressor popup dialog. */
async function openCompressorDialog() {
    const context = getContext();
    const chat = context.chat || [];
    const chatLen = chat.length;
    const settings = getSettings();

    // ------------------------------------------------------------------ HTML
    const html = /* html */`
<div id="llmlingua-dialog" class="llmlingua-container">

    <div class="llmlingua-header">
        <div class="llmlingua-title">
            <i class="fa-solid fa-compress-arrows-alt"></i>
            LLMLingua-2 Text Compressor
        </div>
        <div class="llmlingua-subtitle">
            Strip prose &amp; fluff from chat messages or pasted text using your configured API,
            preserving every fact and name.
        </div>
    </div>

    <!-- Input tabs -->
    <div class="llmlingua-tabs" role="tablist">
        <button class="llmlingua-tab active" data-tab="chat" role="tab">
            <i class="fa-solid fa-comments"></i> Chat Messages
        </button>
        <button class="llmlingua-tab" data-tab="custom" role="tab">
            <i class="fa-solid fa-paste"></i> Custom Text
        </button>
    </div>

    <!-- Tab: Chat Messages -->
    <div class="llmlingua-tab-content" id="llmlingua-tab-chat">
        <div class="llmlingua-range-row">
            <div class="llmlingua-field">
                <label for="llmlingua-start-id">Start Message ID</label>
                <input type="number" id="llmlingua-start-id"
                    min="0" max="${Math.max(0, chatLen - 1)}" value="0">
            </div>
            <div class="llmlingua-field">
                <label for="llmlingua-end-id">End Message ID</label>
                <input type="number" id="llmlingua-end-id"
                    min="0" max="${Math.max(0, chatLen - 1)}" value="${Math.max(0, chatLen - 1)}">
            </div>
            <div class="llmlingua-field llmlingua-field-meta">
                <label>Chat length</label>
                <span class="llmlingua-meta-value">${chatLen} msg${chatLen !== 1 ? 's' : ''}</span>
            </div>
        </div>
        <button id="llmlingua-preview-btn" class="menu_button menu_button_icon"
            ${chatLen === 0 ? 'disabled title="No active chat"' : ''}>
            <i class="fa-solid fa-eye"></i> Preview Selection
        </button>
        <textarea id="llmlingua-chat-preview" class="llmlingua-textarea llmlingua-preview"
            placeholder="${chatLen === 0
                ? 'No active chat. Start a conversation first.'
                : 'Click "Preview Selection" to load the selected messages, or compress directly.'}"
            readonly></textarea>
        <div class="llmlingua-preview-note">
            <i class="fa-solid fa-circle-info"></i>
            Preview is optional — clicking Compress will always use the current ID range.
        </div>
    </div>

    <!-- Tab: Custom Text -->
    <div class="llmlingua-tab-content" id="llmlingua-tab-custom" style="display:none">
        <label class="llmlingua-label" for="llmlingua-custom-text">
            Paste or type the text you want to compress:
        </label>
        <textarea id="llmlingua-custom-text" class="llmlingua-textarea llmlingua-input"
            placeholder="Paste your text here…"></textarea>
    </div>

    <!-- Settings -->
    <details class="llmlingua-settings-panel">
        <summary><i class="fa-solid fa-sliders"></i> Compression Settings</summary>
        <div class="llmlingua-settings-body">

            <div class="llmlingua-ratio-row">
                <div class="llmlingua-ratio-label">
                    Target size:
                    <strong id="llmlingua-ratio-display">${settings.compressionRatio}%</strong>
                    of original token count
                </div>
                <input type="range" id="llmlingua-ratio"
                    min="10" max="90" step="5" value="${settings.compressionRatio}">
                <div class="llmlingua-ratio-hints">
                    <span>10% — extreme</span>
                    <span>50% — balanced</span>
                    <span>90% — light trim</span>
                </div>
            </div>

            <label class="checkbox_label llmlingua-toggle-label">
                <input type="checkbox" id="llmlingua-use-custom-prompt"
                    ${settings.useCustomPrompt ? 'checked' : ''}>
                <span>Override with a custom prompt</span>
            </label>
            <div class="llmlingua-custom-prompt-hint">
                Use <code>{text}</code> and <code>{ratio}</code> as placeholders.
                When enabled this single prompt replaces both the system message and user message.
            </div>

            <div id="llmlingua-custom-prompt-area"
                style="${settings.useCustomPrompt ? '' : 'display:none'}">
                <textarea id="llmlingua-custom-prompt" class="llmlingua-textarea llmlingua-prompt-input"
                    placeholder="Enter your custom compression prompt…">${settings.customPrompt || ''}</textarea>
            </div>

        </div>
    </details>

    <!-- Action row -->
    <div class="llmlingua-actions">
        <button id="llmlingua-compress-btn" class="menu_button menu_button_icon">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Compress
        </button>
        <div id="llmlingua-status" class="llmlingua-status" aria-live="polite"></div>
    </div>

    <!-- Result -->
    <div id="llmlingua-result-section" class="llmlingua-result-section" style="display:none">
        <div class="llmlingua-result-header">
            <span class="llmlingua-label">Compressed output</span>
            <span id="llmlingua-stats" class="llmlingua-stats"></span>
        </div>
        <textarea id="llmlingua-result" class="llmlingua-textarea llmlingua-result"
            placeholder="Compressed text will appear here…" readonly></textarea>
        <div class="llmlingua-result-actions">
            <button id="llmlingua-copy-btn" class="menu_button menu_button_icon">
                <i class="fa-solid fa-copy"></i> Copy
            </button>
            <button id="llmlingua-download-btn" class="menu_button menu_button_icon">
                <i class="fa-solid fa-file-arrow-down"></i> Download .txt
            </button>
        </div>
    </div>

</div>`;

    // -------------------------------------------------------- Build DOM node
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const dialog = /** @type {HTMLElement} */ (wrapper.firstElementChild);

    // --------------------------------------------------- State & helpers
    let activeTab = 'chat';

    const q = /** @param {string} sel @returns {HTMLElement} */
        (sel) => /** @type {HTMLElement} */ (dialog.querySelector(sel));

    const setStatus = (msg, type = '') => {
        const el = q('#llmlingua-status');
        el.innerHTML = msg;
        el.className = `llmlingua-status${type ? ' llmlingua-status-' + type : ''}`;
    };

    // -------------------------------------------------------- Tab switching
    dialog.querySelectorAll('.llmlingua-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            activeTab = /** @type {HTMLElement} */ (tab).dataset.tab;
            dialog.querySelectorAll('.llmlingua-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            dialog.querySelectorAll('.llmlingua-tab-content').forEach(c => {
                /** @type {HTMLElement} */ (c).style.display = 'none';
            });
            /** @type {HTMLElement} */ (q(`#llmlingua-tab-${activeTab}`)).style.display = '';
        });
    });

    // -------------------------------------------------------- Preview button
    q('#llmlingua-preview-btn').addEventListener('click', () => {
        const startId = parseInt(/** @type {HTMLInputElement} */ (q('#llmlingua-start-id')).value) || 0;
        const endId = parseInt(/** @type {HTMLInputElement} */ (q('#llmlingua-end-id')).value) || chatLen - 1;
        const text = getChatMessagesText(startId, endId);
        /** @type {HTMLTextAreaElement} */ (q('#llmlingua-chat-preview')).value =
            text || '(No non-system messages found in that range.)';
    });

    // -------------------------------------------------------- Ratio slider
    const ratioSlider = /** @type {HTMLInputElement} */ (q('#llmlingua-ratio'));
    const ratioDisplay = q('#llmlingua-ratio-display');
    ratioSlider.addEventListener('input', () => {
        ratioDisplay.textContent = `${ratioSlider.value}%`;
    });
    ratioSlider.addEventListener('change', () => {
        settings.compressionRatio = parseInt(ratioSlider.value);
        saveSettingsDebounced();
    });

    // ------------------------------------------------ Custom prompt toggle
    const promptToggle = /** @type {HTMLInputElement} */ (q('#llmlingua-use-custom-prompt'));
    const promptArea = q('#llmlingua-custom-prompt-area');
    promptToggle.addEventListener('change', () => {
        settings.useCustomPrompt = promptToggle.checked;
        promptArea.style.display = promptToggle.checked ? '' : 'none';
        saveSettingsDebounced();
    });

    const promptInput = /** @type {HTMLTextAreaElement} */ (q('#llmlingua-custom-prompt'));
    promptInput.addEventListener('input', () => {
        settings.customPrompt = promptInput.value;
        saveSettingsDebounced();
    });

    // -------------------------------------------------------- Compress
    q('#llmlingua-compress-btn').addEventListener('click', async () => {
        const ratio = parseInt(ratioSlider.value);
        settings.compressionRatio = ratio;
        saveSettingsDebounced();

        let sourceText = '';

        if (activeTab === 'chat') {
            const startId = parseInt(/** @type {HTMLInputElement} */ (q('#llmlingua-start-id')).value) || 0;
            const endId   = parseInt(/** @type {HTMLInputElement} */ (q('#llmlingua-end-id')).value) || chatLen - 1;
            // Prefer already-previewed text; re-fetch if blank
            const previewVal = /** @type {HTMLTextAreaElement} */ (q('#llmlingua-chat-preview')).value.trim();
            sourceText = (previewVal && previewVal !== '(No non-system messages found in that range.)')
                ? previewVal
                : getChatMessagesText(startId, endId);
        } else {
            sourceText = /** @type {HTMLTextAreaElement} */ (q('#llmlingua-custom-text')).value;
        }

        if (!sourceText.trim()) {
            toastr.warning(
                activeTab === 'chat'
                    ? 'No messages found in the selected range.'
                    : 'Please paste some text before compressing.',
                'LLMLingua',
            );
            return;
        }

        const compressBtn = q('#llmlingua-compress-btn');
        const resultSection = q('#llmlingua-result-section');

        try {
            compressBtn.setAttribute('disabled', 'true');
            setStatus('<i class="fa-solid fa-spinner fa-spin"></i> Sending to API…', 'working');

            const result = await performCompression(sourceText, ratio);

            const origWords = wordCount(sourceText);
            const compWords = wordCount(result);
            const pct = origWords > 0 ? Math.round((compWords / origWords) * 100) : 0;

            /** @type {HTMLTextAreaElement} */ (q('#llmlingua-result')).value = result;
            q('#llmlingua-stats').textContent =
                `~${origWords} words → ~${compWords} words (${pct}% of original)`;

            resultSection.style.display = '';
            setStatus('<i class="fa-solid fa-check"></i> Done!', 'done');
        } catch (err) {
            console.error('[LLMLingua]', err);
            setStatus(
                `<i class="fa-solid fa-triangle-exclamation"></i> ${err.message}`,
                'error',
            );
        } finally {
            compressBtn.removeAttribute('disabled');
        }
    });

    // -------------------------------------------------------- Copy
    q('#llmlingua-copy-btn').addEventListener('click', () => {
        const text = /** @type {HTMLTextAreaElement} */ (q('#llmlingua-result')).value;
        navigator.clipboard.writeText(text)
            .then(() => toastr.success('Copied to clipboard!', 'LLMLingua'))
            .catch(() => toastr.error('Clipboard access denied.', 'LLMLingua'));
    });

    // -------------------------------------------------------- Download
    q('#llmlingua-download-btn').addEventListener('click', () => {
        const text = /** @type {HTMLTextAreaElement} */ (q('#llmlingua-result')).value;
        if (!text.trim()) {
            toastr.warning('Nothing to download yet.', 'LLMLingua');
            return;
        }
        const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        downloadText(text, `llmlingua-${ts}.txt`);
        toastr.success('File downloaded!', 'LLMLingua');
    });

    // -------------------------------------------------------- Show popup
    await callGenericPopup(dialog, POPUP_TYPE.TEXT, '', {
        wide: true,
        large: true,
        okButton: 'Close',
    });
}

/** Extension entry point — called by the 'activate' hook. */
export async function init() {
    // Register a collapsible panel in the Extensions settings sidebar
    const panelHtml = /* html */`
<div id="llmlingua_container">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>LLMLingua-2 Compressor</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <p class="llmlingua-panel-desc">
                Compress chat messages or pasted text using LLMLingua-2 style prompt compression
                via your configured API — removes prose and fluff, keeps every fact.
            </p>
            <div class="flex-container">
                <button id="llmlingua-open-btn" class="menu_button menu_button_icon flex1">
                    <i class="fa-solid fa-compress-arrows-alt"></i>
                    Open Compressor
                </button>
            </div>
        </div>
    </div>
</div>`;

    $('#extensions_settings').append(panelHtml);

    $('#llmlingua-open-btn').on('click', openCompressorDialog);

    console.log('[LLMLingua] Extension loaded.');
}
