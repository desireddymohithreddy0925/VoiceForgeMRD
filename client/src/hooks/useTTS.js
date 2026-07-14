import React from "react";
import { loadVoiceSettings } from "../utils/voiceSettings.js";

/**
 * React hook that manages Text-to-Speech (TTS) generation state.
 * Interfaces with the local VoiceForge backend for Chatterbox synthesis,
 * and falls back to browser SpeechSynthesis if the server is offline or fails.
 *
 * @returns {object} The TTS state and the speak action function.
 */
export default function useTTS() {
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState("");
  const [engine, setEngine] = React.useState("chatterbox");
  const abortControllerRef = React.useRef(null);

  /**
   * Triggers local browser SpeechSynthesis as a fallback engine.
   *
   * @param {string} text The text to read.
   * @param {string} languageCode BCP-47 language tag to use.
   * @returns {Promise<void>} Resolves when speech completes.
   */
  function browserSpeak(text, languageCode) {
    return new Promise((resolve, reject) => {
      if (!("speechSynthesis" in window)) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (languageCode) {
        utterance.lang = languageCode;
      }

      utterance.onend = resolve;
      utterance.onerror = reject;

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Generates cloned speech for the given text using the selected voice profile.
   * Automatically attempts browser SpeechSynthesis fallback if the server request fails.
   *
   * @param {object} params Parameter payload.
   * @param {string} params.text The text to synthesize.
   * @param {string} params.voiceId The ID of the cloned voice profile.
   * @param {string} [params.language_code] Chatterbox/BCP-47 language code.
   * @returns {Promise<{audioUrl: string, engine: string}|{fallback: boolean, engine: string}>} Result of speech synthesis.
   */
  async function speak({ text, voiceId, language_code }) {
    // Cancel any in-flight request before starting a new one.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError("");
    setStatus("speaking");

    const apiKey = getApiKey();
    if (!apiKey || apiKey === "mock") {
      try {
        // Generate a synthesized beep/melody to mock speech audio locally
        const duration = Math.max(1.0, Math.min(8.0, text.length * 0.06));
        const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100 * duration, 44100);
        
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        
        osc.type = "sine";
        
        // Pitch modulation simulating speaking sweeps
        osc.frequency.setValueAtTime(180, 0);
        for (let t = 0.1; t < duration; t += 0.2) {
          const freq = 150 + Math.sin(t * 10) * 80 + Math.random() * 20;
          osc.frequency.linearRampToValueAtTime(freq, t);
        }
        
        // Amplitude modulation simulating word and syllable boundaries
        gain.gain.setValueAtTime(0, 0);
        let isPeak = true;
        for (let t = 0.05; t < duration - 0.05; t += 0.15) {
          const vol = isPeak ? (0.4 + Math.random() * 0.4) : 0.02;
          gain.gain.linearRampToValueAtTime(vol, t);
          isPeak = !isPeak;
        }
        gain.gain.linearRampToValueAtTime(0, duration);

        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        
        osc.start(0);
        osc.stop(duration);

        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);
        const nextAudioUrl = URL.createObjectURL(wavBlob);

        setAudioUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return nextAudioUrl;
        });
        setStatus("ready");
        return { audioUrl: nextAudioUrl };
      } catch (err) {
        setError(err.message || "Local mock speech synthesis failed.");
        setStatus("error");
        throw err;
      }
    }

    try {
      const voiceSettings = loadVoiceSettings();

      const response = await fetch("/api/voice/speak", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          language_code,
          voice_settings: voiceSettings,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Speech generation failed.");
      }

      const payload = await response.json();
      const nextAudioUrl = payload.audioUrl;

      setEngine("chatterbox");
      setAudioUrl(nextAudioUrl);
      setStatus("ready");

      return {
        audioUrl: nextAudioUrl,
        engine: "chatterbox",
      };
    } catch (ttsError) {
      // A cancelled request is not an error — a newer speak() call took over.
      if (ttsError?.name === "AbortError") {
        return;
      }

      try {
        await browserSpeak(text, language_code);

        setEngine("browser");
        setAudioUrl("");
        setStatus("ready");

        return {
          fallback: true,
          engine: "browser",
        };
      } catch {
        setError(ttsError?.message || String(ttsError));
        setStatus("error");
        throw ttsError;
      }
    }
  }

  return {
    speak,
    status,
    error,
    audioUrl,
    engine,
  };
}
