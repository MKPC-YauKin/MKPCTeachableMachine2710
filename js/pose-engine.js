import {
  autoMapLabels,
  clamp,
  resolveGesture,
  validatePoseMetadata,
} from "./utils.js";

const PREVIEW_WIDTH = 640;
const PREVIEW_HEIGHT = 480;
const INFERENCE_SIZE = 480;

function computeCrop(videoWidth, videoHeight, targetWidth, targetHeight) {
  const targetAspect = targetWidth / targetHeight;
  const sourceAspect = videoWidth / videoHeight;
  let sx = 0;
  let sy = 0;
  let sw = videoWidth;
  let sh = videoHeight;

  if (sourceAspect > targetAspect) {
    sw = videoHeight * targetAspect;
    sx = (videoWidth - sw) / 2;
  } else {
    sh = videoWidth / targetAspect;
    sy = (videoHeight - sh) / 2;
  }

  return { sx, sy, sw, sh };
}

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function cameraErrorMessage(error) {
  if (!window.isSecureContext) {
    return "Cameras need a secure page. Open the app on localhost or HTTPS — file:// links won't work.";
  }

  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission was blocked. Allow camera access in your browser's site settings, then try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found. Plug one in, or check that another app isn't holding it.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is busy in another app. Close that app and try again.";
    case "OverconstrainedError":
      return "This camera doesn't support the requested video settings. Try a different camera.";
    default:
      return error?.message || "The camera couldn't start. Please try again.";
  }
}

/**
 * Owns the webcam stream, the Teachable Machine pose model, pose inference,
 * and the hold-to-answer interaction. The UI only consumes state snapshots.
 */
export class PoseEngine {
  constructor({ video, onEvent = () => {}, onPrediction = () => {}, onHold = () => {} }) {
    this.video = video;
    this.onEvent = onEvent;
    this.onPrediction = onPrediction;
    this.onHold = onHold;

    this.model = null;
    this.labels = [];
    this.metadata = null;
    this.mapping = { aIndex: null, bIndex: null, restIndex: null };
    this.threshold = 0.7;
    this.holdMs = 1200;
    this.mirror = true;
    this.accepting = false;
    this.loadingModel = false;

    this.stream = null;
    this.cameraState = "off";
    this.cameraError = null;
    this.predictions = [];
    this.lastPose = null;

    this.previewCanvas = null;
    this.ctx = null;
    this.workCanvas = document.createElement("canvas");
    this.workCanvas.width = INFERENCE_SIZE;
    this.workCanvas.height = INFERENCE_SIZE;
    this.workCtx = this.workCanvas.getContext("2d", { willReadFrequently: false });
    this._hadPreviewFrame = false;

    this._candidate = null;
    this._holdStartedAt = 0;
    this._progress = 0;
    this._holdFired = false;
    this._armed = true;
    this._lockedAt = 0;
    this._releaseStartedAt = null;
    this._inferBusy = false;
    this._lastInfer = 0;
    this._lastDrawAt = 0;
    this._inferenceErrorCount = 0;
    this._destroyed = false;
    this._loop = this._loop.bind(this);

    requestAnimationFrame(this._loop);
  }

  get ready() {
    return Boolean(this.model) && this.labels.length >= 2;
  }

  get cameraOn() {
    return Boolean(this.stream) && this.cameraState === "on";
  }

  get armed() {
    return this._armed;
  }

  setPreviewCanvas(canvas) {
    if (!canvas) {
      this.previewCanvas = null;
      this.ctx = null;
      return;
    }
    this.previewCanvas = canvas;
    this.ctx = canvas.getContext("2d");
    canvas.width = PREVIEW_WIDTH;
    canvas.height = PREVIEW_HEIGHT;
  }

  setThreshold(value) {
    this.threshold = clamp(Number(value) || 0.7, 0.5, 0.95);
    this._resetHold();
  }

  setHoldMs(value) {
    this.holdMs = clamp(Number(value) || 1200, 400, 4000);
    this._resetHold();
  }

  setMirror(value) {
    this.mirror = Boolean(value);
    this.lastPose = null;
    this._resetHold();
  }

  setMapping(aIndex, bIndex, restIndex) {
    const valid = (index) =>
      Number.isInteger(index) && index >= 0 && index < this.labels.length;
    this.mapping = {
      aIndex: valid(aIndex) ? aIndex : null,
      bIndex: valid(bIndex) ? bIndex : null,
      restIndex: valid(restIndex) ? restIndex : null,
    };
    this._resetHold();
    this.onEvent({ type: "mapping", mapping: { ...this.mapping } });
  }

  setAccepting(value) {
    const nextValue = Boolean(value);
    if (this.accepting === nextValue) return;
    this.accepting = nextValue;
    this._resetHold();
    this.onEvent({ type: "accepting", accepting: this.accepting });
  }

  lockUntilRelease() {
    this._armed = false;
    this._lockedAt = performance.now();
    this._releaseStartedAt = null;
    this._resetHold();
    this.onEvent({ type: "armed", armed: false });
  }

  async startCamera() {
    if (this.stream) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      const message =
        "This browser doesn't expose a camera API. Try a current version of Chrome, Edge, Safari, or Firefox.";
      this.cameraState = "error";
      this.cameraError = message;
      this.onEvent({ type: "camera", state: "error", message });
      throw new Error(message);
    }

    if (!window.isSecureContext) {
      const message = cameraErrorMessage(new Error());
      this.cameraState = "error";
      this.cameraError = message;
      this.onEvent({ type: "camera", state: "error", message });
      throw new Error(message);
    }

    this.cameraState = "requesting";
    this.cameraError = null;
    this.onEvent({ type: "camera", state: "requesting" });

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
    } catch (error) {
      const message = cameraErrorMessage(error);
      this.cameraState = "error";
      this.cameraError = message;
      this.onEvent({ type: "camera", state: "error", message });
      throw new Error(message);
    }

    this.stream = stream;
    this.video.srcObject = stream;
    this.video.muted = true;
    this.video.playsInline = true;

    await new Promise((resolve) => {
      if (this.video.readyState >= 1) {
        resolve();
      } else {
        const onLoaded = () => {
          this.video.removeEventListener("loadedmetadata", onLoaded);
          resolve();
        };
        this.video.addEventListener("loadedmetadata", onLoaded);
        setTimeout(resolve, 2500);
      }
    });

    try {
      await this.video.play();
    } catch {
      // Some browsers resolve play() later, but a visible stream is enough.
    }

    const [track] = stream.getVideoTracks();
    if (track) {
      track.addEventListener("ended", () => {
        if (this.stream === stream) {
          this._teardownStream();
          this.cameraState = "off";
          this.cameraError = null;
          this.onEvent({ type: "camera", state: "off" });
        }
      });
    }

    this.cameraState = "on";
    this.onEvent({ type: "camera", state: "on" });
  }

  stopCamera() {
    this._teardownStream();
    this.cameraState = "off";
    this.cameraError = null;
    this.predictions = [];
    this.lastPose = null;
    this._resetHold();
    this.onEvent({ type: "camera", state: "off" });
  }

  _teardownStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore tracks that have already ended.
        }
      });
    }
    this.stream = null;
    try {
      this.video.pause();
    } catch {
      // Ignore.
    }
    this.video.srcObject = null;
  }

  async _ensureTf() {
    if (!window.tf || !window.tmPose) {
      throw new Error(
        "The pose engine didn't load. Check your internet connection and refresh the page.",
      );
    }
    if (typeof window.tf.ready === "function") {
      await window.tf.ready();
    }
  }

  async _fetchMetadata(metadataUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    let response;
    try {
      response = await fetch(metadataUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("The model took too long to respond. Check the URL and try again.");
      }
      throw new Error(
        "We couldn't fetch the model metadata. Check the URL, and make sure the host allows cross-origin requests (CORS).",
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(
        `The model server returned ${response.status}. Check that the model link is public and ends with /models/…/.`,
      );
    }

    let metadata;
    try {
      metadata = await response.json();
    } catch {
      throw new Error("metadata.json isn't valid JSON. Check that you pasted the model folder URL.");
    }

    return validatePoseMetadata(metadata);
  }

  async loadModelFromUrl({ modelUrl, metadataUrl }) {
    await this._ensureTf();
    this.loadingModel = true;
    this.onEvent({ type: "model-loading", message: "Fetching model details…" });

    try {
      const metadata = await this._fetchMetadata(metadataUrl);
      this.onEvent({
        type: "model-loading",
        message: "Warming up the pose engine… this can take a moment.",
      });
      const model = await withTimeout(
        window.tmPose.load(modelUrl, metadata),
        120000,
        "The model took too long to load. Try a smaller export or refresh the page.",
      );
      this._commitModel(model, metadata);
    } catch (error) {
      this.onEvent({ type: "model-error", message: error.message });
      throw error;
    } finally {
      this.loadingModel = false;
    }
  }

  async loadModelFromFiles({ modelFile, weightsFile, metadataFile, metadata }) {
    await this._ensureTf();
    validatePoseMetadata(metadata);
    this.loadingModel = true;
    this.onEvent({ type: "model-loading", message: "Reading your local model…" });

    try {
      this.onEvent({
        type: "model-loading",
        message: "Warming up the pose engine… this can take a moment.",
      });
      const model = await withTimeout(
        window.tmPose.loadFromFiles(modelFile, weightsFile, metadataFile),
        120000,
        "The model took too long to load. Try again, or re-export it from Teachable Machine.",
      );
      this._commitModel(model, metadata);
    } catch (error) {
      this.onEvent({ type: "model-error", message: error.message });
      throw error;
    } finally {
      this.loadingModel = false;
    }
  }

  _commitModel(model, metadata) {
    const labels = (model.getClassLabels?.() || metadata.labels || []).map((label) =>
      String(label),
    );
    if (labels.length < 2) {
      try {
        model.model?.dispose();
        model.dispose?.();
      } catch {
        // Ignore disposal failures.
      }
      throw new Error("This pose model needs at least two trained classes.");
    }

    const previous = this.model;
    this.model = model;
    this.labels = labels;
    this.metadata = metadata;
    this.mapping = autoMapLabels(labels);
    this.predictions = [];
    this.lastPose = null;
    this._armed = true;
    this._resetHold();

    if (previous) {
      try {
        previous.model?.dispose();
        previous.dispose?.();
      } catch {
        // Old model cleanup is best-effort.
      }
    }

    this.onEvent({
      type: "model-ready",
      labels: [...this.labels],
      mapping: { ...this.mapping },
      metadata,
    });
  }

  disconnectModel() {
    if (this.model) {
      try {
        this.model.model?.dispose();
        this.model.dispose?.();
      } catch {
        // Ignore.
      }
    }
    this.model = null;
    this.labels = [];
    this.metadata = null;
    this.mapping = { aIndex: null, bIndex: null, restIndex: null };
    this.predictions = [];
    this.lastPose = null;
    this._resetHold();
    this.onEvent({ type: "model-disconnected" });
  }

  _loop(timestamp) {
    if (this._destroyed) return;

    this._drawPreview();

    if (
      !this._inferBusy &&
      this.model &&
      this.stream &&
      this.cameraState === "on" &&
      timestamp - this._lastInfer >= 110 &&
      !document.hidden
    ) {
      this._lastInfer = timestamp;
      this._runInference();
    }

    requestAnimationFrame(this._loop);
  }

  _drawFrameTo(ctx, outWidth, outHeight) {
    const video = this.video;
    if (!video || video.readyState < 2 || !video.videoWidth) return null;

    const crop = computeCrop(
      video.videoWidth,
      video.videoHeight,
      outWidth,
      outHeight,
    );

    ctx.save();
    if (this.mirror) {
      ctx.translate(outWidth, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      video,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      outWidth,
      outHeight,
    );
    ctx.restore();

    return {
      ...crop,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      outWidth,
      outHeight,
    };
  }

  /**
   * The model is trained on a square webcam view (Teachable Machine's pose
   * project uses a square crop). Inference therefore runs on a square canvas,
   * while the visible 4:3 preview maps those keypoints back into its frame.
   */
  _mapPoseToPreview(pose, inferenceGeometry) {
    if (!pose?.keypoints) return null;
    if (!inferenceGeometry) return pose;

    const previewCrop = computeCrop(
      inferenceGeometry.videoWidth,
      inferenceGeometry.videoHeight,
      PREVIEW_WIDTH,
      PREVIEW_HEIGHT,
    );
    const normalized = (position) => position / INFERENCE_SIZE;

    const keypoints = pose.keypoints.map((keypoint) => {
      const nx = normalized(keypoint.position.x);
      const ny = normalized(keypoint.position.y);
      const sourceX = this.mirror
        ? inferenceGeometry.sx + (1 - nx) * inferenceGeometry.sw
        : inferenceGeometry.sx + nx * inferenceGeometry.sw;
      const sourceY = inferenceGeometry.sy + ny * inferenceGeometry.sh;
      const previewX = this.mirror
        ? PREVIEW_WIDTH * (1 - (sourceX - previewCrop.sx) / previewCrop.sw)
        : PREVIEW_WIDTH * ((sourceX - previewCrop.sx) / previewCrop.sw);
      const previewY =
        PREVIEW_HEIGHT * ((sourceY - previewCrop.sy) / previewCrop.sh);

      return {
        ...keypoint,
        position: { x: previewX, y: previewY },
      };
    });

    return { ...pose, keypoints };
  }

  _drawPreview() {
    if (!this.ctx) return;

    if (this.cameraState !== "on" || !this.stream) {
      if (this._hadPreviewFrame) {
        this.ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
        this._hadPreviewFrame = false;
      }
      return;
    }

    if (!this._drawFrameTo(this.ctx, PREVIEW_WIDTH, PREVIEW_HEIGHT)) return;
    this._hadPreviewFrame = true;

    if (this.lastPose?.keypoints) {
      this.ctx.save();
      this.ctx.shadowColor = "rgba(217, 255, 79, 0.6)";
      this.ctx.shadowBlur = 10;
      window.tmPose.drawSkeleton(
        this.lastPose.keypoints,
        0.32,
        this.ctx,
        4,
        "rgba(217, 255, 79, 0.82)",
        1,
      );
      window.tmPose.drawKeypoints(
        this.lastPose.keypoints,
        0.32,
        this.ctx,
        4,
        "#e7ff8c",
        "rgba(10, 12, 8, 0.75)",
        1,
      );
      this.ctx.restore();
    }
  }

  async _runInference() {
    if (this._inferBusy || !this.model || this.cameraState !== "on") return;
    this._inferBusy = true;

    try {
      const inferenceGeometry = this._drawFrameTo(
        this.workCtx,
        INFERENCE_SIZE,
        INFERENCE_SIZE,
      );
      if (!inferenceGeometry) return;

      const { pose, posenetOutput } = await this.model.estimatePose(this.workCanvas);
      const predictions = await this.model.predict(posenetOutput);

      if (this._destroyed) return;

      this.lastPose = this._mapPoseToPreview(pose, inferenceGeometry);
      this.predictions = predictions.map((prediction) => ({
        className: String(prediction.className),
        probability: Number(prediction.probability) || 0,
      }));
      this._inferenceErrorCount = 0;
      this._updateDetection(performance.now());
    } catch (error) {
      this._inferenceErrorCount += 1;
      if (this._inferenceErrorCount === 3) {
        console.error("Pose inference failed:", error);
        this.onEvent({
          type: "inference-error",
          message:
            "The pose engine hit a snag. Stop and restart the camera, or reload the page if it keeps happening.",
        });
      }
    } finally {
      this._inferBusy = false;
    }
  }

  _probabilities() {
    const gesture = resolveGesture(this.predictions, this.mapping, this.threshold);
    return {
      ...gesture,
      predictions: this.predictions,
      labels: this.labels,
    };
  }

  _updateArmed(now, bestProbability) {
    if (this._armed) return;

    const releaseThreshold = Math.max(0.35, this.threshold - 0.18);
    if (bestProbability >= releaseThreshold) {
      this._releaseStartedAt = null;
      return;
    }

    if (this._releaseStartedAt == null) {
      this._releaseStartedAt = now;
      return;
    }

    const canRearm =
      now - this._releaseStartedAt >= 280 && now - this._lockedAt >= 600;

    if (canRearm) {
      this._armed = true;
      this._releaseStartedAt = null;
      this.onEvent({ type: "armed", armed: true });
    }
  }

  _updateDetection(now) {
    const mapped = this._probabilities();
    const side = mapped.side;
    const bestProbability = mapped.maxGesture;

    this._updateArmed(now, bestProbability);

    if (!this.accepting || !this._armed) {
      this._candidate = null;
      this._progress = 0;
      this._holdFired = false;
      this._emitPrediction(side, bestProbability, mapped);
      return;
    }

    if (!side) {
      this._candidate = null;
      this._progress = 0;
      this._holdFired = false;
      this._emitPrediction(null, bestProbability, mapped);
      return;
    }

    if (this._candidate !== side) {
      this._candidate = side;
      this._holdStartedAt = now;
      this._progress = 0;
      this._holdFired = false;
    }

    const elapsed = now - this._holdStartedAt;
    this._progress = clamp(elapsed / this.holdMs, 0, 1);

    if (this._progress >= 1 && !this._holdFired) {
      this._holdFired = true;
      this.onHold(side);
    }

    this._emitPrediction(side, bestProbability, mapped);
  }

  _emitPrediction(side, bestProbability, mapped = this._probabilities()) {
    this.onPrediction({
      side,
      candidate: this._candidate,
      progress: this._progress,
      probabilities: mapped,
      restWinning: mapped.restWinning,
      armed: this._armed,
      accepting: this.accepting,
      holdMs: this.holdMs,
      threshold: this.threshold,
      cameraOn: this.cameraOn,
      ready: this.ready,
    });
  }

  _resetHold() {
    this._candidate = null;
    this._holdStartedAt = 0;
    this._progress = 0;
    this._holdFired = false;
  }

  destroy() {
    this._destroyed = true;
    this._teardownStream();
    this.disconnectModel();
  }
}
