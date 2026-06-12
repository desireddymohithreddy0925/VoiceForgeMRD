import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

/**
 * Handles face detection and cropping using MediaPipe.
 */
export class FaceProcessor {
  constructor() {
    this.faceLandmarker = null;
    this.isInitialized = false;
  }

  /**
   * Loads the MediaPipe FaceLandmarker model.
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create the vision task
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 1
      });

      this.isInitialized = true;
      console.log("FaceLandmarker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize FaceLandmarker:", error);
    }
  }

  /**
   * Detects face landmarks in a video frame.
   * @param {HTMLVideoElement} videoElement The source video
   * @param {number} timestamp Current timestamp for video processing
   * @returns {Object|null} Landmark data or null if not detected
   */
  detectFace(videoElement, timestamp) {
    if (!this.isInitialized || !this.faceLandmarker) return null;

    try {
      const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        return results.faceLandmarks[0];
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
    return null;
  }

  /**
   * A helper method to crop the lower half of the face (mouth region)
   * which is typically what Wav2Lip expects as input.
   * @param {HTMLCanvasElement} sourceCanvas The canvas containing the full frame
   * @param {Array} landmarks The detected face landmarks
   * @param {HTMLCanvasElement} targetCanvas The canvas to draw the crop onto
   * @returns {ImageData|null} The cropped image data
   */
  cropMouthRegion(sourceCanvas, landmarks, targetCanvas) {
    // This is a simplified cropping mechanism.
    // Wav2Lip usually requires a 96x96 square bounding the lower half of the face.
    // Landmark index 14 is lower lip, 13 is upper lip, 152 is chin.
    
    if (!landmarks || landmarks.length === 0) return null;

    // Get rough bounding box of the lower face
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    
    // Iterate over mouth-related landmarks
    const mouthIndices = [0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 191, 267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 415];
    
    mouthIndices.forEach(index => {
      const lm = landmarks[index];
      if (!lm) return;
      minX = Math.min(minX, lm.x);
      maxX = Math.max(maxX, lm.x);
      minY = Math.min(minY, lm.y);
      maxY = Math.max(maxY, lm.y);
    });

    // Add padding to make it a square (Wav2Lip expects 96x96)
    const padding = 0.05;
    minX = Math.max(0, minX - padding);
    maxX = Math.min(1, maxX + padding);
    minY = Math.max(0, minY - padding);
    maxY = Math.min(1, maxY + padding);

    const width = maxX - minX;
    const height = maxY - minY;
    
    // Force square by expanding the smaller dimension
    const size = Math.max(width, height);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    const sMinX = Math.max(0, cx - size / 2);
    const sMaxX = Math.min(1, cx + size / 2);
    const sMinY = Math.max(0, cy - size / 2);
    const sMaxY = Math.min(1, cy + size / 2);

    const ctx = targetCanvas.getContext('2d');
    
    // Source coordinates
    const sx = sMinX * sourceCanvas.width;
    const sy = sMinY * sourceCanvas.height;
    const sw = (sMaxX - sMinX) * sourceCanvas.width;
    const sh = (sMaxY - sMinY) * sourceCanvas.height;

    // Destination coordinates (Wav2Lip usually expects 96x96)
    targetCanvas.width = 96;
    targetCanvas.height = 96;

    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, 96, 96);
    
    return ctx.getImageData(0, 0, 96, 96);
  }
}
