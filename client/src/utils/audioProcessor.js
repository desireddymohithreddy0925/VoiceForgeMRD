import Meyda from "meyda";

/**
 * Extracts Mel-spectrogram features from an HTMLMediaElement using the Web Audio API.
 * This is a simplified wrapper for real-time inference.
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyzer = null;
    this.analyser = null; // AnalyserNode for audio visualization
    this.currentMelSpectrogram = null;
    this.currentVolume = 0;
  }

  /**
   * Initializes the audio processor with a given audio element.
   * @param {HTMLMediaElement} audioElement The <audio> or <video> element to analyze.
   */
  async initialize(audioElement) {
    if (!this.audioContext) {
      // Must be created after a user gesture
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    // Prevent re-creating the source node if it already exists for this element
    if (!audioElement.dataset.sourceCreated) {
      this.source = this.audioContext.createMediaElementSource(audioElement);
      audioElement.dataset.sourceCreated = "true";
    }

    // Clean up old analyser node and connections
    if (this.analyser) {
      try {
        this.source.disconnect(this.analyser);
      } catch (e) {}
      this.analyser.disconnect();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 32; // Yields 16 frequency bands

    // Clean up old direct connections to destination
    try {
      this.source.disconnect(this.audioContext.destination);
    } catch (e) {}

    // Route connections
    this.source.connect(this.audioContext.destination); // For listening
    this.source.connect(this.analyser); // For visualization

    if (this.analyzer) {
      this.analyzer.stop();
    }

    // Configure Meyda to extract the melSpectrogram
    // Typical Wav2Lip uses specific mel bands and FFT sizes,
    // this will need tuning to match the exact ONNX model requirements.
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.source,
      bufferSize: 512, // Must be a power of 2
      featureExtractors: ["melSpectrogram", "rms"],
      callback: (features) => {
        if (features) {
          if (features.melSpectrogram) {
            this.currentMelSpectrogram = features.melSpectrogram;
          }
          if (features.rms !== undefined) {
            this.currentVolume = features.rms;
          }
        }
      },
    });

    this.analyzer.start();
  }

  /**
   * Returns real-time frequency data mapped to 5 frequency bands.
   * @returns {Uint8Array} Array of 5 frequency levels (0-255).
   */
  getFrequencyData() {
    if (!this.analyser) {
      return new Uint8Array(5).fill(0);
    }
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    const bars = new Uint8Array(5);
    const step = Math.floor(bufferLength / 5) || 1;
    for (let i = 0; i < 5; i++) {
      bars[i] = dataArray[i * step] || 0;
    }
    return bars;
  }

  /**
   * Returns the most recently extracted mel-spectrogram.
   * Format expected by Wav2Lip ONNX is usually [batch_size, 1, 80, 16] (example).
   * @returns {Float32Array|null}
   */
  getLatestFeatures() {
    return this.currentMelSpectrogram;
  }

  /**
   * Returns the current RMS volume to drive fallback mouth animation.
   * @returns {number}
   */
  getVolume() {
    return this.currentVolume || 0;
  }

  /**
   * Returns the current time from the audio context for exact A/V synchronization.
   * @returns {number}
   */
  getAudioTime() {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  /**
   * Cleans up audio context and analyzer.
   */
  dispose() {
    if (this.analyzer) {
      this.analyzer.stop();
      this.analyzer = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
