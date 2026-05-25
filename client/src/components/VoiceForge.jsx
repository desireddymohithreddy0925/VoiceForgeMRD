/**
 * VoiceForge.jsx  — Main page component
 * ──────────────────────────────────────
 * Integrates:
 *   - SpeechHistory sidebar (collapsible, searchable, tabbed)
 *   - FavoriteMessages strip (pinned quick-access)
 *   - QuickReplies bar
 *   - Compose textarea with Speak & Save + Copy
 *   - Toast notifications
 *   - Web Speech API integration
 *
 * Drop this into your pages/ or app/ folder and wire it to your router.
 * The component is fully self-contained; all state lives here or in custom hooks.
 */

import React, { useState, useRef, useCallback } from "react";
import { SpeechHistory } from "../components/SpeechHistory";
import { FavoriteMessages } from "../components/FavoriteMessages";
import { QuickReplies } from "../components/QuickReplies";
import { useSpeechHistory } from "../hooks/useSpeechHistory";
import { useToast, ToastContainer } from "../components/useToast.jsx";


const MAX_CHARS = 500;

export default function VoiceForge() {
  // ── Shared state ──────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const textareaRef = useRef(null);

  const {
    history,
    favorites,
    addMessage,
    removeMessage,
    toggleFavorite,
    clearHistory,
  } = useSpeechHistory();

  const { toasts, showToast } = useToast();

  // ── Speech synthesis ──────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!text.trim()) return;

    if (!("speechSynthesis" in window)) {
      showToast("Speech synthesis not supported in this browser", "error");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      showToast("Speech playback failed", "error");
    };
    window.speechSynthesis.speak(utterance);
  }, [showToast]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSpeak = useCallback(() => {
    const text = inputText.trim();
    if (!text) {
      showToast("Please type a message first", "error");
      textareaRef.current?.focus();
      return;
    }
    speak(text);
    addMessage(text);
    showToast("Saved to history 🎙️", "success");
  }, [inputText, speak, addMessage, showToast]);

  const handleReplay = useCallback((text) => {
    speak(text);
    showToast("🔊 Replaying…", "info");
  }, [speak, showToast]);

  const handleReuse = useCallback((text) => {
    setInputText(text);
    textareaRef.current?.focus();
    showToast("Loaded into composer", "success");
  }, []);

  const handleCopy = useCallback(async (text) => {
  const target = text || inputText;

  if (!target.trim()) {
    showToast("Nothing to copy", "error");
    return;
  }

  try {
    // Modern clipboard API
    await navigator.clipboard.writeText(target);

    showToast("Copied to clipboard ✓", "success");
  } catch (error) {
    try {
      // Fallback for unsupported browsers
      const textarea = document.createElement("textarea");

      textarea.value = target;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      const success = document.execCommand("copy");

      document.body.removeChild(textarea);

      if (!success) {
        throw new Error("Fallback copy failed");
      }

      showToast("Copied ✓", "success");
    } catch {
      showToast("Failed to copy message", "error");
    }
  }
}, [inputText, showToast]);

  const handleQuickReply = useCallback((phrase) => {
    setInputText(phrase);
    textareaRef.current?.focus();
    showToast("Quick reply loaded", "success");
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Ctrl + Enter (or Cmd + Enter on Mac) → Speak & Save
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSpeak();
    }
  }, [handleSpeak]);

  const charsLeft = MAX_CHARS - inputText.length;

  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans antialiased dark:bg-neutral-950">
      {/* ── Left sidebar: Speech History ──────────────────────────────────── */}
      <SpeechHistory
        history={history}
        favorites={favorites}
        onReuse={handleReuse}
        onReplay={handleReplay}
        onToggleFav={toggleFavorite}
        onDelete={removeMessage}
        onClearHistory={clearHistory}
        onCopy={handleCopy}
      />

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden" aria-label="Speech composer">
        {/* Page header */}
        <header className="flex flex-shrink-0 items-center gap-2 border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-700">
          <span aria-hidden="true" className="text-xl">🎙️</span>
          <h1 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            VoiceForge
          </h1>
          <span className="text-sm text-neutral-400 dark:text-neutral-500">
            — Speech Composer
          </span>
          {isSpeaking && (
            <span
              className="ml-auto flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600 dark:bg-blue-950 dark:text-blue-300"
              aria-live="polite"
              role="status"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              </span>
              Speaking…
            </span>
          )}
        </header>

        {/* Pinned favorites strip */}
        <FavoriteMessages
          history={history}
          favorites={favorites}
          onReuse={handleReuse}
          onUnpin={toggleFavorite}
        />

        {/* Quick replies */}
        <QuickReplies onSelect={handleQuickReply} />

        {/* Compose area */}
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="vf-compose"
              className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500"
            >
              Compose message
            </label>
            <span
              className={[
                "text-xs tabular-nums",
                charsLeft < 50
                  ? "text-red-500"
                  : "text-neutral-400 dark:text-neutral-500",
              ].join(" ")}
              aria-live="polite"
            >
              {inputText.length} / {MAX_CHARS}
            </span>
          </div>

          <textarea
            id="vf-compose"
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder="Type your message or select a quick reply…"
            maxLength={MAX_CHARS}
            aria-label="Message to speak"
            aria-describedby="vf-hint"
            className={[
              "flex-1 resize-none rounded-xl border bg-neutral-50 px-4 py-3",
              "text-sm leading-relaxed text-neutral-800 placeholder:text-neutral-400",
              "transition-colors duration-150 dark:bg-neutral-900 dark:text-neutral-100",
              "dark:placeholder:text-neutral-600",
              "focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200",
              "dark:focus:bg-neutral-800",
              charsLeft < 50
                ? "border-red-300 dark:border-red-800"
                : "border-neutral-200 dark:border-neutral-700",
            ].join(" ")}
            rows={6}
          />

          <p id="vf-hint" className="text-xs text-neutral-400 dark:text-neutral-600">
            Tip: Press <kbd className="rounded border border-neutral-200 px-1 font-mono text-[10px]">Ctrl</kbd> +{" "}
            <kbd className="rounded border border-neutral-200 px-1 font-mono text-[10px]">↵</kbd> to speak quickly.
          </p>

          {/* Action row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(inputText)}
              disabled={!inputText.trim()}
              aria-label="Copy message to clipboard"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3.5 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400"
            >
              <CopyIcon />
              Copy
            </button>

            <button
              onClick={() => setInputText("")}
              disabled={!inputText}
              aria-label="Clear compose area"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3.5 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ClearIcon />
              Clear
            </button>

            <button
              onClick={handleSpeak}
              disabled={!inputText.trim() || isSpeaking}
              aria-label={isSpeaking ? "Currently speaking" : "Speak and save to history (Ctrl+Enter)"}
              className={[
                "ml-auto flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white transition",
                "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSpeaking
                  ? "bg-blue-400"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]",
              ].join(" ")}
            >
              <MicIcon />
              {isSpeaking ? "Speaking…" : "Speak & Save"}
            </button>
          </div>
        </div>
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────
const CopyIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="5" y="5" width="8" height="8" rx="1.5" />
    <path d="M3 11V3h8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M3 8h10M8 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MicIcon = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="5" y="1" width="6" height="9" rx="3" />
    <path d="M2 8a6 6 0 0012 0" strokeLinecap="round" />
    <path d="M8 14v2" strokeLinecap="round" />
  </svg>
);