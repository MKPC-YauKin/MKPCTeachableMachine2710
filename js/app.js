import {
  QUIZ_SETS,
  SCORING,
  getMaxScore,
  getSetById,
  scoreAnswer,
} from "./data.js";
import {
  formatPercent,
  formatPoints,
  getBestScores,
  getGrade,
  loadPreferences,
  normalizeModelUrl,
  resolveModelFiles,
  saveBestScore,
  savePreferences,
} from "./utils.js";
import { PoseEngine } from "./pose-engine.js";

const EXAMPLE_MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/M4cegN5A/";
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

const dom = {
  sourceVideo: document.getElementById("sourceVideo"),
  lobbyView: document.getElementById("lobbyView"),
  gameView: document.getElementById("gameView"),
  resultsView: document.getElementById("resultsView"),
  roundGrid: document.getElementById("roundGrid"),
  rounds: document.getElementById("rounds"),

  cameraStatusChip: document.getElementById("cameraStatusChip"),
  cameraStatusText: document.getElementById("cameraStatusText"),
  modelStatusChip: document.getElementById("modelStatusChip"),
  modelStatusText: document.getElementById("modelStatusText"),

  heroCameraCard: document.getElementById("heroCameraCard"),
  lobbyCanvas: document.getElementById("lobbyCanvas"),
  heroALabel: document.getElementById("heroALabel"),
  heroBLabel: document.getElementById("heroBLabel"),
  heroStageStatus: document.getElementById("heroStageStatus"),
  heroLiveLabel: document.getElementById("heroLiveLabel"),
  heroLiveHint: document.getElementById("heroLiveHint"),
  heroLiveHintText: document.getElementById("heroLiveHintText"),
  heroCameraButton: document.getElementById("heroCameraButton"),
  heroCameraButtonText: document.querySelector("#heroCameraButton span"),
  heroCameraState: document.getElementById("heroCameraState"),
  heroModelState: document.getElementById("heroModelState"),
  cameraSetupRow: document.getElementById("cameraSetupRow"),
  cameraSetupState: document.getElementById("cameraSetupState"),
  modelSetupState: document.getElementById("modelSetupState"),
  heroPlaceholder: document.getElementById("heroPlaceholder"),

  gameCameraCard: document.getElementById("gameCameraCard"),
  gameCanvas: document.getElementById("gameCanvas"),
  gameALabel: document.getElementById("gameALabel"),
  gameBLabel: document.getElementById("gameBLabel"),
  gameGestureA: document.getElementById("gameGestureA"),
  gameGestureB: document.getElementById("gameGestureB"),
  gamePlaceholderCopy: document.getElementById("gamePlaceholderCopy"),
  gameCameraCta: document.getElementById("gameCameraCta"),
  gameCameraCtaText: document.getElementById("gameCameraCtaText"),
  gameCameraToggle: document.getElementById("gameCameraToggle"),
  stageStatus: document.getElementById("stageStatus"),
  gameLiveLabel: document.getElementById("gameLiveLabel"),
  gameHint: document.getElementById("gameHint"),
  gameHintText: document.getElementById("gameHintText"),
  holdHud: document.getElementById("holdHud"),
  holdRingProgress: document.getElementById("holdRingProgress"),
  holdSide: document.getElementById("holdSide"),
  probALabel: document.getElementById("probALabel"),
  probBLabel: document.getElementById("probBLabel"),
  probABar: document.getElementById("probABar"),
  probBBar: document.getElementById("probBBar"),
  probAValue: document.getElementById("probAValue"),
  probBValue: document.getElementById("probBValue"),
  stageTipText: document.querySelector("#stageTip span:last-child"),

  gameEyebrow: document.getElementById("gameEyebrow"),
  gameProgressTrack: document.getElementById("gameProgressTrack"),
  gameProgressBar: document.getElementById("gameProgressBar"),
  gameQuestionCount: document.getElementById("gameQuestionCount"),
  scoreValue: document.getElementById("scoreValue"),
  questionIndex: document.getElementById("questionIndex"),
  pointsTag: document.getElementById("pointsTag"),
  questionKicker: document.getElementById("questionKicker"),
  questionText: document.getElementById("questionText"),
  answerOptions: document.getElementById("answerOptions"),
  answerCards: Array.from(document.querySelectorAll(".answer-card")),
  feedback: document.getElementById("feedback"),
  feedbackIcon: document.getElementById("feedbackIcon"),
  feedbackTitle: document.getElementById("feedbackTitle"),
  feedbackPoints: document.getElementById("feedbackPoints"),
  feedbackExplanation: document.getElementById("feedbackExplanation"),
  nextButton: document.getElementById("nextButton"),
  nextButtonText: document.getElementById("nextButtonText"),
  streakValue: document.getElementById("streakValue"),
  quizCard: document.querySelector(".quiz-card"),

  resultKicker: document.getElementById("resultKicker"),
  resultTitle: document.getElementById("resultTitle"),
  resultCopy: document.getElementById("resultCopy"),
  resultScore: document.getElementById("resultScore"),
  resultMax: document.getElementById("resultMax"),
  resultPercent: document.getElementById("resultPercent"),
  resultCorrect: document.getElementById("resultCorrect"),
  resultBest: document.getElementById("resultBest"),
  resultStreak: document.getElementById("resultStreak"),
  resultNewBest: document.getElementById("resultNewBest"),
  resultBreakdown: document.getElementById("resultBreakdown"),
  resultCameraNote: document.getElementById("resultCameraNote"),
  scoreMeter: document.getElementById("scoreMeter"),
  confetti: document.getElementById("confetti"),

  howDialog: document.getElementById("howDialog"),
  modelDialog: document.getElementById("modelDialog"),
  settingsDialog: document.getElementById("settingsDialog"),
  modelConnectedPanel: document.getElementById("modelConnectedPanel"),
  modelConnectedName: document.getElementById("modelConnectedName"),
  modelConnectedLabels: document.getElementById("modelConnectedLabels"),
  modelLoading: document.getElementById("modelLoading"),
  modelLoadingText: document.getElementById("modelLoadingText"),
  modelError: document.getElementById("modelError"),
  modelTabs: Array.from(document.querySelectorAll(".model-tab")),
  urlPanel: document.getElementById("urlPanel"),
  localPanel: document.getElementById("localPanel"),
  modelUrlInput: document.getElementById("modelUrlInput"),
  loadUrlButton: document.getElementById("loadUrlButton"),
  fillExampleUrl: document.getElementById("fillExampleUrl"),
  zipInput: document.getElementById("zipInput"),
  folderInput: document.getElementById("folderInput"),
  filesInput: document.getElementById("filesInput"),
  modelDropzone: document.getElementById("modelDropzone"),
  localFileSummary: document.getElementById("localFileSummary"),
  loadLocalButton: document.getElementById("loadLocalButton"),

  settingsModelEmpty: document.getElementById("settingsModelEmpty"),
  settingsModelBody: document.getElementById("settingsModelBody"),
  settingsModelName: document.getElementById("settingsModelName"),
  settingsModelCount: document.getElementById("settingsModelCount"),
  mapASelect: document.getElementById("mapASelect"),
  mapBSelect: document.getElementById("mapBSelect"),
  swapSidesButton: document.getElementById("swapSidesButton"),
  mappingWarning: document.getElementById("mappingWarning"),
  thresholdRange: document.getElementById("thresholdRange"),
  thresholdValue: document.getElementById("thresholdValue"),
  holdRange: document.getElementById("holdRange"),
  holdValue: document.getElementById("holdValue"),
  mirrorToggle: document.getElementById("mirrorToggle"),
  liveTestHint: document.getElementById("liveTestHint"),
  settingsProbabilities: document.getElementById("settingsProbabilities"),
  liveTest: document.querySelector(".live-test"),

  toast: document.getElementById("toast"),
  toastText: document.getElementById("toastText"),
};

const state = {
  screen: "lobby",
  game: null,
  bestScores: getBestScores(),
  preferences: loadPreferences(),
  camera: { status: "off", error: null },
  model: {
    status: "disconnected",
    ready: false,
    labels: [],
    mapping: { aIndex: null, bIndex: null },
    metadata: null,
    source: null,
    sourceLabel: "",
    error: null,
  },
  detection: null,
  localModel: null,
  settingsProbRows: [],
  modelBusy: false,
  loadingSource: null,
  toastTimer: null,
  manualCameraStop: false,
  acceptBlockedUntil: 0,
  acceptTimer: null,
};

const pose = new PoseEngine({
  video: dom.sourceVideo,
  onEvent: handlePoseEvent,
  onPrediction: handlePrediction,
  onHold: handleGestureHold,
});

/* ==========================================================================
   Boot
   ========================================================================== */

function init() {
  pose.setThreshold(state.preferences.threshold);
  pose.setHoldMs(state.preferences.holdMs);
  pose.setMirror(state.preferences.mirror);
  pose.setPreviewCanvas(dom.lobbyCanvas);

  bindEvents();
  renderRoundCards();
  syncPreferencesUI();
  syncChrome();
  renderDetection(emptyDetection());

  if (!window.isSecureContext) {
    window.setTimeout(() => {
      showToast(
        "Cameras need a secure page. Open the app via localhost or HTTPS — file:// won't work.",
        "error",
      );
    }, 900);
  }
}

/* ==========================================================================
   Shared UI helpers
   ========================================================================== */

function modelLabel(index) {
  if (index == null) return "";
  const raw = state.model.labels[index];
  if (raw == null) return "";
  const label = String(raw).trim();
  return label || `Class ${index + 1}`;
}

function sideLabel(side) {
  const index =
    side === "A" ? state.model.mapping.aIndex : state.model.mapping.bIndex;
  if (index == null) {
    return state.model.ready ? "Unassigned" : side === "A" ? "Left" : "Right";
  }
  return modelLabel(index) || side;
}

function shortLabel(label, maxLength = 22) {
  const value = String(label || "").trim();
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function mappingIsReady() {
  const { aIndex, bIndex } = state.model.mapping;
  return (
    state.model.ready &&
    aIndex != null &&
    bIndex != null &&
    aIndex !== bIndex
  );
}

function anyDialogOpen() {
  return Boolean(document.querySelector("dialog[open]"));
}

function currentCanvas() {
  if (state.screen === "game") return dom.gameCanvas;
  if (state.screen === "lobby") return dom.lobbyCanvas;
  return null;
}

function emptyDetection() {
  return {
    side: null,
    candidate: null,
    progress: 0,
    probabilities: { a: 0, b: 0, predictions: [], labels: [] },
    armed: true,
    accepting: false,
    holdMs: state.preferences.holdMs,
    threshold: state.preferences.threshold,
    cameraOn: false,
    ready: false,
  };
}

function formatHold(ms) {
  return `${(ms / 1000).toFixed(1)} s`;
}

function showToast(message, tone = "info") {
  window.clearTimeout(state.toastTimer);
  dom.toastText.textContent = message;
  dom.toast.classList.toggle("is-error", tone === "error");
  dom.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    dom.toast.hidden = true;
  }, tone === "error" ? 6200 : 3800);
}

function animateScore(element, value) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.textContent = formatPoints(value);
    return;
  }

  const from = Number(String(element.textContent).replace(/,/g, "")) || 0;
  const start = performance.now();
  const duration = 620;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    element.textContent = formatPoints(Math.round(from + (value - from) * eased));
    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function bumpScore() {
  dom.scoreValue.classList.remove("is-bumping");
  void dom.scoreValue.offsetWidth;
  dom.scoreValue.classList.add("is-bumping");
}

function syncScore() {
  const score = state.game?.score || 0;
  dom.scoreValue.textContent = formatPoints(score);
}

function syncProgress() {
  if (!state.game) return;
  const total = state.game.set.questions.length;
  const current = state.game.index + 1;
  const progress = (current / total) * 100;
  dom.gameProgressBar.style.width = `${progress}%`;
  dom.gameProgressTrack.setAttribute("aria-valuemax", String(total));
  dom.gameProgressTrack.setAttribute("aria-valuenow", String(current));
  dom.gameQuestionCount.textContent = `${String(current).padStart(2, "0")} / ${String(
    total,
  ).padStart(2, "0")}`;
}

/* ==========================================================================
   Rendering: round cards
   ========================================================================== */

function renderRoundCards() {
  dom.roundGrid.replaceChildren();

  QUIZ_SETS.forEach((quizSet, index) => {
    const best = Number(state.bestScores[quizSet.id]) || 0;
    const card = document.createElement("article");
    card.className = `round-card tone-${quizSet.tone}`;
    card.dataset.index = String(index + 1).padStart(2, "0");

    card.innerHTML = `
      <div class="round-card-top">
        <span class="round-index">ROUND ${String(index + 1).padStart(2, "0")}</span>
        <span class="round-icon" aria-hidden="true">
          <svg class="icon"><use href="#i-${quizSet.icon}"></use></svg>
        </span>
      </div>
      <div class="round-card-body">
        <span class="round-eyebrow"></span>
        <h3></h3>
        <p></p>
        <span class="round-note"></span>
      </div>
      <div class="round-card-foot">
        <div class="round-meta">
          <span>${quizSet.questions.length} questions · ${formatPoints(
            getMaxScore(quizSet.questions.length),
          )} max</span>
          <span>Best <b></b></span>
        </div>
        <button type="button" class="round-play" data-action="start-round" data-set-id="${quizSet.id}">
          Play round
          <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg>
        </button>
      </div>
    `;

    card.querySelector(".round-eyebrow").textContent = quizSet.eyebrow;
    card.querySelector("h3").textContent = quizSet.title;
    card.querySelector(".round-card-body p").textContent = quizSet.blurb;
    card.querySelector(".round-note").textContent = quizSet.note;
    card.querySelector(".round-meta b").textContent = best
      ? formatPoints(best)
      : "—";

    dom.roundGrid.append(card);
  });
}

/* ==========================================================================
   Camera
   ========================================================================== */

async function startCameraFlow() {
  if (pose.cameraOn || state.camera.status === "requesting") return;
  if (!currentCanvas()) {
    showToast("The camera is off between rounds. Start or replay a round to use it.");
    return;
  }
  state.manualCameraStop = false;

  try {
    await pose.startCamera();
    pose.setPreviewCanvas(currentCanvas());
    state.detection = null;
    renderDetection(emptyDetection());
    syncChrome();

    if (state.screen === "game" && state.game) {
      state.game.usedCamera = true;
      if (state.game.phase === "question" && mappingIsReady()) blockAcceptance(650);
    }

    showToast("Camera on. Keep your head, shoulders, and hands in frame.");
  } catch (error) {
    state.camera.status = "error";
    state.camera.error = error.message;
    syncChrome();
    showToast(error.message, "error");
  }
}

function stopCameraFlow({ silent = false } = {}) {
  const wasOn = pose.cameraOn;
  state.manualCameraStop = true;
  pose.setAccepting(false);
  pose.stopCamera();
  state.detection = null;
  syncChrome();
  renderDetection(emptyDetection());
  if (wasOn && !silent) showToast("Camera off. Your video never left the browser.");
}

/* ==========================================================================
   Model loading
   ========================================================================== */

function setModelBusy(busy) {
  state.modelBusy = busy;
  const controls = [
    dom.loadUrlButton,
    dom.fillExampleUrl,
    dom.loadLocalButton,
    dom.zipInput,
    dom.folderInput,
    dom.filesInput,
    ...dom.modelTabs,
    ...Array.from(
      document.querySelectorAll(
        '[data-action="choose-zip"], [data-action="choose-folder"], [data-action="choose-files"]',
      ),
    ),
  ];

  controls.forEach((control) => {
    if (control) control.disabled = busy;
  });
  dom.modelUrlInput.disabled = busy;
  dom.modelDialog.setAttribute("aria-busy", String(busy));
}

function showModelLoading(show, message) {
  dom.modelLoading.hidden = !show;
  if (message) dom.modelLoadingText.textContent = message;
}

function showModelError(message) {
  state.model.error = message || null;
  dom.modelError.hidden = !message;
  if (message) dom.modelError.textContent = message;
}

function clearModelError() {
  state.model.error = null;
  dom.modelError.hidden = true;
  dom.modelError.textContent = "";
}

function updateModelConnectedPanel() {
  const ready = state.model.ready;
  dom.modelConnectedPanel.hidden = !ready;
  dom.settingsModelEmpty.hidden = ready;
  dom.settingsModelBody.hidden = !ready;
  dom.modelConnectedPanel.setAttribute("aria-hidden", String(!ready));

  if (!ready) return;

  const count = state.model.labels.length;
  const name =
    state.model.metadata?.modelName ||
    (state.model.source === "local"
      ? "Local pose model"
      : state.model.sourceLabel || "Teachable Machine pose model");

  dom.modelConnectedName.textContent = name;
  dom.modelConnectedName.title = name;
  dom.modelConnectedLabels.textContent = `${count} ${count === 1 ? "class" : "classes"} · ${state.model.labels.join(" · ")}`;
  dom.modelConnectedLabels.title = state.model.labels.join(" · ");
  dom.settingsModelName.textContent = name;
  dom.settingsModelName.title = name;
  dom.settingsModelCount.textContent = `${count} ${count === 1 ? "CLASS" : "CLASSES"}`;
}

async function loadModelFromUrl() {
  if (state.modelBusy) return;

  let info;
  try {
    info = normalizeModelUrl(dom.modelUrlInput.value);
  } catch (error) {
    clearModelLoadingState();
    state.model.error = error.message;
    if (!pose.ready) state.model.status = "error";
    showModelError(error.message);
    syncChrome();
    return;
  }

  clearModelError();
  state.model.status = "loading";
  state.loadingSource = { type: "url", label: info.host };
  setModelBusy(true);
  showModelLoading(true, "Checking the model link…");
  syncChrome();

  try {
    await pose.loadModelFromUrl(info);
    announceModelLoaded();
  } catch (error) {
    state.model.status = pose.ready ? "ready" : "error";
    state.model.error = error.message;
    showModelError(error.message);
    showToast("The model couldn't connect. Check the details in the dialog.", "error");
  } finally {
    setModelBusy(false);
    showModelLoading(false);
    clearModelLoadingState();
    syncChrome();
    syncAcceptance();
  }
}

async function loadLocalModel() {
  if (state.modelBusy) return;
  if (!state.localModel) {
    showModelError("Choose your model files first.");
    return;
  }

  clearModelError();
  state.model.status = "loading";
  state.loadingSource = {
    type: "local",
    label: state.localModel.metadata?.modelName || "Local files",
  };
  setModelBusy(true);
  showModelLoading(true, "Reading your local model…");
  syncChrome();

  try {
    await pose.loadModelFromFiles(state.localModel);
    announceModelLoaded();
  } catch (error) {
    state.model.status = pose.ready ? "ready" : "error";
    state.model.error = error.message;
    showModelError(error.message);
    showToast("The model couldn't load. Check the files and try again.", "error");
  } finally {
    setModelBusy(false);
    showModelLoading(false);
    clearModelLoadingState();
    syncChrome();
    syncAcceptance();
  }
}

function clearModelLoadingState() {
  if (state.model.status === "loading") {
    state.model.status = pose.ready ? "ready" : "disconnected";
  }
}

function announceModelLoaded() {
  if (!state.model.ready) return;

  if (mappingIsReady()) {
    showToast(
      `Pose model ready. A = ${shortLabel(sideLabel("A"), 18)}, B = ${shortLabel(
        sideLabel("B"),
        18,
      )}.`,
    );
  } else {
    showToast("Pose model connected. Choose which classes mean A and B.");
    window.setTimeout(() => {
      if (state.model.ready && !mappingIsReady()) openSettingsDialog();
    }, 550);
  }
}

async function handleLocalFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length || state.modelBusy) return;

  clearModelError();
  dom.localFileSummary.hidden = false;
  dom.localFileSummary.textContent = "Reading your files…";
  dom.loadLocalButton.hidden = true;

  try {
    const resolved = await resolveModelFiles(
      files,
      window.fflate ? window.fflate.unzipSync : null,
    );
    state.localModel = resolved;
    renderLocalFileSummary(resolved);
    dom.loadLocalButton.hidden = false;
  } catch (error) {
    state.localModel = null;
    state.model.error = error.message;
    if (!pose.ready) state.model.status = "error";
    dom.localFileSummary.hidden = true;
    showModelError(error.message);
    syncChrome();
    showToast("Those files don't look complete. Check the model folder.", "error");
  }
}

function renderLocalFileSummary(resolved) {
  dom.localFileSummary.replaceChildren();
  const files = [
    resolved.modelFile,
    resolved.weightsFile,
    resolved.metadataFile,
  ];

  files.forEach((file) => {
    const chip = document.createElement("span");
    chip.className = "file-chip";
    chip.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-file"></use></svg>';
    const name = document.createElement("span");
    name.textContent = file.name;
    chip.append(name);
    dom.localFileSummary.append(chip);
  });

  const ready = document.createElement("strong");
  ready.textContent = "All 3 files found";
  dom.localFileSummary.append(ready);
}

/* ==========================================================================
   Pose engine events
   ========================================================================== */

function handlePoseEvent(event) {
  switch (event.type) {
    case "camera": {
      const wasOn = state.camera.status === "on";
      state.camera.status = event.state;
      state.camera.error = event.message || null;

      if (event.state === "on") {
        pose.setPreviewCanvas(currentCanvas());
        state.camera.error = null;
      } else if (event.state === "off" || event.state === "error") {
        state.detection = null;
        if (event.state === "off" && wasOn && !state.manualCameraStop) {
          showToast("Camera disconnected. Start it again when you're ready.", "error");
        }
      }

      syncChrome();
      syncAcceptance();
      renderDetection(state.detection || emptyDetection());
      break;
    }

    case "model-loading":
      if (dom.modelDialog.open) showModelLoading(true, event.message);
      break;

    case "model-ready": {
      const source = state.loadingSource || {
        type: state.model.source || "model",
        label: state.model.sourceLabel,
      };
      state.model = {
        status: "ready",
        ready: true,
        labels: event.labels,
        mapping: event.mapping,
        metadata: event.metadata,
        source: source.type,
        sourceLabel: source.label,
        error: null,
      };
      state.modelBusy = false;
      setModelBusy(false);
      showModelLoading(false);
      clearModelError();
      updateModelConnectedPanel();
      if (dom.settingsDialog.open) renderSettingsUI();
      if (state.screen === "game" && state.game?.phase === "question") {
        blockAcceptance(700);
      }
      syncChrome();
      syncAcceptance();
      renderDetection(state.detection || emptyDetection());
      break;
    }

    case "model-disconnected":
      state.model = {
        status: "disconnected",
        ready: false,
        labels: [],
        mapping: { aIndex: null, bIndex: null },
        metadata: null,
        source: null,
        sourceLabel: "",
        error: null,
      };
      state.loadingSource = null;
      updateModelConnectedPanel();
      if (dom.settingsDialog.open) renderSettingsUI();
      syncChrome();
      syncAcceptance();
      break;

    case "model-error":
      state.model.status = pose.ready ? "ready" : "error";
      state.model.error = event.message;
      if (dom.modelDialog.open) showModelError(event.message);
      syncChrome();
      break;

    case "mapping":
      state.model.mapping = event.mapping;
      syncMappingLabels();
      if (dom.settingsDialog.open) {
        syncMappingSelects();
        syncMappingWarning();
        syncSettingsProbabilityMapping();
      }
      syncChrome();
      syncAcceptance();
      break;

    case "armed":
      if (state.detection) {
        state.detection.armed = event.armed;
        renderDetection(state.detection);
      }
      break;

    case "inference-error":
      showToast(event.message, "error");
      break;

    default:
      break;
  }
}

function handlePrediction(snapshot) {
  state.detection = snapshot;
  renderDetection(snapshot);
}

function handleGestureHold(side) {
  if (anyDialogOpen()) return;
  if (state.screen !== "game" || !state.game) return;
  if (state.game.phase !== "question") return;
  if (!mappingIsReady()) return;
  submitAnswer(side, "gesture");
}

/* ==========================================================================
   Live detection UI
   ========================================================================== */

function renderDetection(snapshot) {
  const data = snapshot || emptyDetection();
  const probabilities = data.probabilities || { a: 0, b: 0, predictions: [] };
  const aProbability = Number(probabilities.a) || 0;
  const bProbability = Number(probabilities.b) || 0;
  const cameraOn = pose.cameraOn || data.cameraOn;
  const ready = state.model.ready;

  dom.probABar.style.width = `${Math.round(aProbability * 100)}%`;
  dom.probBBar.style.width = `${Math.round(bProbability * 100)}%`;
  dom.probAValue.textContent = formatPercent(aProbability);
  dom.probBValue.textContent = formatPercent(bProbability);

  dom.gameGestureA?.classList.toggle(
    "is-hot",
    Boolean(data.side === "A" && aProbability >= (data.threshold || 0.7)),
  );
  dom.gameGestureB?.classList.toggle(
    "is-hot",
    Boolean(data.side === "B" && bProbability >= (data.threshold || 0.7)),
  );

  const progress = Math.max(0, Math.min(1, data.progress || 0));
  dom.holdRingProgress.style.strokeDashoffset = String(
    RING_CIRCUMFERENCE * (1 - progress),
  );
  dom.holdHud.classList.toggle("is-holding", progress > 0.02);
  dom.holdHud.classList.toggle(
    "is-waiting",
    Boolean(cameraOn && ready && !data.armed),
  );

  if (data.candidate) {
    const label = shortLabel(sideLabel(data.candidate), 17);
    dom.holdSide.textContent = `${data.candidate} · ${label}`;
  } else {
    dom.holdSide.textContent = "A / B";
  }

  if (state.game) {
    const hint = getGameHint(data);
    dom.gameHintText.textContent = hint.text;
    dom.gameHint.classList.toggle("is-nudge", hint.nudge);

    const stageStatus = getStageStatus(data);
    dom.stageStatus.textContent = stageStatus;

    if (data.candidate && progress > 0.02 && data.armed && state.game.phase === "question") {
      dom.stageStatus.textContent = `Holding ${data.candidate}`;
    }
  }

  if (cameraOn) {
    let liveHint = "";
    if (!ready) {
      liveHint = "Camera ready · add a model to track gestures";
    } else if (!mappingIsReady()) {
      liveHint = "Map your classes to A + B in settings";
    } else if (data.candidate) {
      liveHint = `Holding ${data.candidate} · ${Math.round(progress * 100)}%`;
    } else if (!data.armed) {
      liveHint = "Lower your hand to re-arm";
    } else {
      liveHint = "Try a gesture to test your setup";
    }
    dom.heroLiveHintText.textContent = liveHint;

    if (!state.game) {
      dom.heroStageStatus.textContent =
        ready && mappingIsReady() ? "Tracking" : "Camera on";
    }
  }

  if (dom.settingsDialog.open) updateSettingsLive(data);
}

function getGameHint(data) {
  if (state.game?.phase === "feedback") {
    return {
      text: data.armed
        ? "Answer locked. Lower your hand, then continue."
        : "Answer locked. Lower your hand to re-arm.",
      nudge: false,
    };
  }

  if (!pose.cameraOn) {
    return { text: "Start the camera to go hands-free — or click an answer.", nudge: true };
  }
  if (!state.model.ready) {
    return { text: "Connect a pose model to unlock gesture answers.", nudge: true };
  }
  if (!mappingIsReady()) {
    return { text: "Assign both classes to A and B in Gesture settings.", nudge: true };
  }
  if (!data.armed) {
    return { text: "Lower your hand to re-arm the detector.", nudge: true };
  }
  if (data.candidate) {
    const percent = Math.round((data.progress || 0) * 100);
    return {
      text: `Hold ${data.candidate} a little longer — ${percent}%`,
      nudge: false,
    };
  }
  return {
    text: `Hold ${shortLabel(sideLabel("A"), 18)} for A, ${shortLabel(
      sideLabel("B"),
      18,
    )} for B.`,
    nudge: false,
  };
}

function getStageStatus(data) {
  if (state.camera.status === "requesting") return "Connecting";
  if (state.camera.status === "error") return "Check camera";
  if (!pose.cameraOn) return "Camera off";
  if (!state.model.ready) return "Camera only";
  if (!mappingIsReady()) return "Map gestures";
  if (state.game?.phase === "feedback") return "Locked";
  if (!data.armed) return "Release";
  return "Tracking";
}

/* ==========================================================================
   Chrome / status
   ========================================================================== */

function syncChrome() {
  const cameraOn = state.camera.status === "on" && pose.cameraOn;
  const cameraBusy = state.camera.status === "requesting";
  const cameraError = state.camera.status === "error";
  const ready = state.model.ready;
  const mapped = mappingIsReady();

  dom.heroCameraCard.classList.toggle("is-off", !cameraOn);
  dom.heroCameraCard.classList.toggle("is-live", cameraOn);
  dom.gameCameraCard.classList.toggle("is-off", !cameraOn);
  dom.gameCameraCard.classList.toggle("is-live", cameraOn);

  // Camera status in the header.
  dom.cameraStatusChip.classList.toggle("is-on", cameraOn);
  dom.cameraStatusChip.classList.toggle("is-busy", cameraBusy);
  dom.cameraStatusChip.classList.toggle("is-error", cameraError);
  dom.cameraStatusText.textContent = cameraBusy
    ? "Connecting"
    : cameraOn
      ? "Camera on"
      : cameraError
        ? "Camera error"
        : "Camera off";
  dom.cameraStatusChip.setAttribute(
    "aria-label",
    cameraOn
      ? "Camera on. Turn camera off"
      : cameraBusy
        ? "Connecting to camera"
        : cameraError
          ? "Camera error. Try again"
          : "Camera off. Start camera",
  );

  // Camera controls.
  dom.heroCameraButton.disabled = cameraBusy;
  dom.heroCameraButtonText.textContent = cameraBusy
    ? "Connecting…"
    : cameraOn
      ? "Stop camera"
      : cameraError
        ? "Try again"
        : "Start camera";
  dom.gameCameraCtaText.textContent = cameraBusy
    ? "Connecting…"
    : cameraError
      ? "Try again"
      : "Start camera";
  dom.gameCameraCta.disabled = cameraBusy;

  const cameraStateText = cameraBusy
    ? "Connecting"
    : cameraOn
      ? "On"
      : cameraError
        ? "Error"
        : "Off";
  dom.cameraSetupState.textContent = cameraStateText;
  dom.cameraSetupState.classList.toggle("is-on", cameraOn);
  dom.cameraSetupState.classList.toggle("is-error", cameraError);

  if (dom.heroCameraState) {
    dom.heroCameraState.classList.toggle("is-on", cameraOn);
    const strong = dom.heroCameraState.querySelector("strong");
    if (strong) strong.textContent = cameraStateText;
  }

  // Camera placeholder copy.
  if (!cameraOn && dom.gamePlaceholderCopy) {
    const strong = dom.gamePlaceholderCopy.querySelector("strong");
    const span = dom.gamePlaceholderCopy.querySelector("span");
    if (cameraBusy) {
      if (strong) strong.textContent = "Connecting to your camera…";
      if (span) span.textContent = "Allow access when your browser asks.";
    } else if (cameraError) {
      if (strong) strong.textContent = "The camera couldn't start.";
      if (span) span.textContent = "Check site permissions and try again.";
    } else {
      if (strong) strong.textContent = "Camera off.";
      if (span) span.textContent = "Start it up, or play this round with clicks.";
    }
  }

  // Model status.
  let modelText = "No model";
  let modelStatusClass = "";
  if (state.model.status === "loading" || state.modelBusy) {
    modelText = "Loading model";
    modelStatusClass = "is-busy";
  } else if (ready) {
    modelText = mapped ? "Model ready" : "Map gestures";
    modelStatusClass = "is-on";
  } else if (state.model.status === "error") {
    modelText = "Model error";
    modelStatusClass = "is-error";
  }

  dom.modelStatusText.textContent = modelText;
  dom.modelStatusChip.className = `status-chip ${modelStatusClass}`.trim();
  dom.modelStatusChip.setAttribute(
    "aria-label",
    ready
      ? `Pose model ready with ${state.model.labels.length} classes. Open model settings`
      : "Pose model not connected. Connect model",
  );

  dom.modelSetupState.textContent = ready
    ? mapped
      ? `${state.model.labels.length} classes`
      : "Map A/B"
    : state.model.status === "loading"
      ? "Loading…"
      : state.model.status === "error"
        ? "Error"
        : "Not connected";
  dom.modelSetupState.classList.toggle("is-on", ready && mapped);
  dom.modelSetupState.classList.toggle("is-error", state.model.status === "error");

  if (dom.heroModelState) {
    dom.heroModelState.classList.toggle("is-on", ready && mapped);
    const strong = dom.heroModelState.querySelector("strong");
    if (strong) {
      strong.textContent = ready
        ? mapped
          ? `${state.model.labels.length} classes`
          : "Map gestures"
        : state.model.status === "loading"
          ? "Loading…"
          : "Not connected";
    }
  }

  if (dom.heroStageStatus.textContent === "Standby" && cameraOn) {
    dom.heroStageStatus.textContent = "Camera on";
  } else if (!cameraOn) {
    dom.heroStageStatus.textContent = cameraBusy
      ? "Connecting"
      : cameraError
        ? "Camera error"
        : "Standby";
  }

  dom.gameCameraToggle.textContent = cameraOn ? "Turn camera off" : "Turn camera on";
  dom.holdHud.hidden = !(cameraOn && ready && mappingIsReady() && state.game?.phase === "question");

  updateModelConnectedPanel();
  syncMappingLabels();
  syncScore();
  syncProgress();
  syncPreferencesUI();

  if (state.game?.phase === "question") {
    updateQuestionKicker();
    updateStageTip();
  }

  syncAcceptance();
  updateSettingsLive(state.detection || emptyDetection());
}

function syncMappingLabels() {
  const aText = sideLabel("A");
  const bText = sideLabel("B");
  const aDisplay = aText || "Left";
  const bDisplay = bText || "Right";

  dom.heroALabel.textContent = aDisplay;
  dom.heroBLabel.textContent = bDisplay;
  dom.heroALabel.title = aDisplay;
  dom.heroBLabel.title = bDisplay;
  dom.gameALabel.textContent = aDisplay;
  dom.gameBLabel.textContent = bDisplay;
  dom.gameALabel.title = aDisplay;
  dom.gameBLabel.title = bDisplay;
  dom.probALabel.textContent = aDisplay;
  dom.probBLabel.textContent = bDisplay;
  dom.probALabel.title = aDisplay;
  dom.probBLabel.title = bDisplay;

  if (state.game?.phase === "question") updateQuestionKicker();
  if (dom.settingsDialog.open) {
    syncSettingsProbabilityMapping();
    syncMappingWarning();
  }
}

function updateQuestionKicker() {
  if (!state.game) return;
  const a = shortLabel(sideLabel("A"), 22);
  const b = shortLabel(sideLabel("B"), 22);
  dom.questionKicker.textContent = mappingIsReady()
    ? `Hold ${a} for A · ${b} for B`
    : "Choose A or B — click, or use the A / B keys";
}

function updateStageTip() {
  if (!dom.stageTipText) return;
  if (!pose.cameraOn && !state.model.ready) {
    dom.stageTipText.textContent =
      "No camera or model? You can still play every round with clicks or the A / B keys.";
  } else if (!pose.cameraOn) {
    dom.stageTipText.textContent =
      "Camera off. Start it when you're ready to play hands-free — clicking still works.";
  } else if (!state.model.ready) {
    dom.stageTipText.textContent =
      "Camera's live. Connect a pose model to unlock gesture answers — or just click.";
  } else if (!mappingIsReady()) {
    dom.stageTipText.textContent =
      "Open Gesture settings and match your model's two classes to A and B.";
  } else {
    dom.stageTipText.textContent =
      "Keep your upper body in frame and hold the pose for a full beat — then lower your hand.";
  }
}

/* ==========================================================================
   Acceptance / release state
   ========================================================================== */

function syncAcceptance() {
  const shouldAccept =
    state.screen === "game" &&
    state.game?.phase === "question" &&
    pose.cameraOn &&
    mappingIsReady() &&
    !state.modelBusy &&
    !anyDialogOpen() &&
    !document.hidden &&
    performance.now() >= state.acceptBlockedUntil;

  pose.setAccepting(shouldAccept);
}

function blockAcceptance(ms = 650) {
  state.acceptBlockedUntil = performance.now() + ms;
  pose.setAccepting(false);
  window.clearTimeout(state.acceptTimer);
  state.acceptTimer = window.setTimeout(() => {
    state.acceptBlockedUntil = 0;
    syncAcceptance();
  }, ms + 20);
}

/* ==========================================================================
   Question flow
   ========================================================================== */

function startRound(setId) {
  const quizSet = getSetById(setId);
  if (!quizSet) return;

  pose.setAccepting(false);
  state.game = {
    setId,
    set: quizSet,
    index: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    answers: [],
    phase: "question",
    selected: null,
    completed: false,
    usedCamera: pose.cameraOn,
  };

  blockAcceptance(700);
  showView("game");
  renderQuestion();
  syncChrome();
  renderDetection(state.detection || emptyDetection());
}

function renderQuestion() {
  const game = state.game;
  if (!game) return;
  const question = game.set.questions[game.index];

  game.phase = "question";
  game.selected = null;

  dom.gameEyebrow.textContent = game.set.eyebrow;
  dom.questionIndex.textContent = `QUESTION ${String(game.index + 1).padStart(2, "0")}`;
  dom.pointsTag.textContent = `${SCORING.base} PTS`;
  dom.questionText.textContent = question.prompt;
  dom.questionText.setAttribute("aria-live", "polite");
  updateQuestionKicker();

  dom.answerCards.forEach((card, index) => {
    card.className = `answer-card ${index === 0 ? "answer-a" : "answer-b"}`;
    card.disabled = false;
    card.querySelector(".answer-text").textContent = question.options[index];
    card.querySelector(".answer-mark").textContent = "";
    card.removeAttribute("aria-pressed");
  });

  dom.feedback.hidden = true;
  dom.feedback.className = "feedback";
  dom.feedbackExplanation.textContent = "";
  dom.feedbackTitle.textContent = "";
  dom.feedbackPoints.textContent = "";
  dom.feedbackIcon.textContent = "";
  dom.nextButtonText.textContent =
    game.index === game.set.questions.length - 1
      ? "See results"
      : "Next question";

  dom.streakValue.textContent = String(game.streak);
  syncScore();
  syncProgress();
  updateStageTip();
  syncAcceptance();
  document.title = `Q${game.index + 1} · ${game.set.title} — Pose & Tell`;
}

function submitAnswer(side, source = "click") {
  const game = state.game;
  if (!game || game.phase !== "question") return;

  const question = game.set.questions[game.index];
  const selectedIndex = side === "A" ? 0 : 1;
  const isCorrect = selectedIndex === question.correct;
  const scoring = scoreAnswer(isCorrect, game.streak);

  game.selected = selectedIndex;
  game.phase = "feedback";
  game.score += scoring.points;
  game.streak = scoring.streakAfter;
  game.maxStreak = Math.max(game.maxStreak, game.streak);
  game.answers.push({
    question,
    selectedIndex,
    correctIndex: question.correct,
    isCorrect,
    points: scoring.points,
    bonus: scoring.bonus,
    source,
  });

  pose.setAccepting(false);

  dom.answerCards.forEach((card, index) => {
    card.disabled = true;
    if (index === question.correct) {
      card.classList.add("is-correct");
      card.querySelector(".answer-mark").textContent = "✓";
    } else if (index === selectedIndex) {
      card.classList.add("is-wrong");
      card.querySelector(".answer-mark").textContent = "✕";
    } else {
      card.classList.add("is-muted");
    }
  });

  dom.feedback.hidden = false;
  dom.feedback.className = `feedback ${isCorrect ? "is-correct" : "is-wrong"}`;
  dom.feedbackIcon.textContent = isCorrect ? "✓" : "✕";
  dom.feedbackTitle.textContent = isCorrect ? "Correct." : "Not quite.";
  dom.feedbackPoints.textContent = isCorrect
    ? `+${formatPoints(scoring.points)} PTS${scoring.bonus ? ` · +${formatPoints(scoring.bonus)} STREAK` : ""}`
    : "+0 PTS";
  dom.feedbackExplanation.textContent = isCorrect
    ? question.explanation
    : `The correct answer is ${question.correct === 0 ? "A" : "B"} — ${
        question.options[question.correct]
      }. ${question.explanation}`;
  dom.nextButtonText.textContent =
    game.index === game.set.questions.length - 1
      ? "See results"
      : "Next question";

  dom.streakValue.textContent = String(game.streak);
  syncScore();
  bumpScore();
  syncChrome();

  if (window.matchMedia("(max-width: 700px)").matches) {
    window.setTimeout(() => {
      dom.feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 140);
  }
}

function nextQuestion() {
  const game = state.game;
  if (!game || game.phase !== "feedback") return;

  if (game.index >= game.set.questions.length - 1) {
    finishRound();
    return;
  }

  game.index += 1;
  game.phase = "question";
  blockAcceptance(500);
  renderQuestion();
  syncChrome();
}

function finishRound() {
  const game = state.game;
  if (!game) return;

  game.phase = "finished";
  game.completed = true;

  stopCameraFlow({ silent: true });
  showView("results");

  const total = game.set.questions.length;
  const maxScore = getMaxScore(total);
  const percentage = maxScore ? game.score / maxScore : 0;
  const correctCount = game.answers.filter((answer) => answer.isCorrect).length;
  const { best, isNewBest } = saveBestScore(game.set.id, game.score);
  state.bestScores[game.set.id] = best;

  const grade = getGrade(percentage);
  dom.resultCameraNote.textContent = game.usedCamera
    ? "Camera stopped. Your arms earned it."
    : "Played with clicks. Camera stayed off.";
  dom.resultKicker.textContent = `${game.set.eyebrow} · ROUND COMPLETE`;
  dom.resultTitle.textContent = grade.title;
  dom.resultCopy.textContent = grade.copy;
  dom.resultMax.textContent = formatPoints(maxScore);
  dom.resultPercent.textContent = formatPercent(percentage);
  dom.resultCorrect.textContent = `${correctCount} / ${total}`;
  dom.resultBest.textContent = formatPoints(best);
  dom.resultStreak.textContent = String(game.maxStreak);
  dom.resultNewBest.hidden = !isNewBest;
  dom.resultScore.textContent = "0";
  dom.scoreMeter.style.setProperty("--pct", "0");
  dom.scoreMeter.style.background = "";

  window.setTimeout(() => {
    animateScore(dom.resultScore, game.score);
    dom.scoreMeter.style.setProperty("--pct", String(percentage * 100));
  }, 120);

  renderResultBreakdown(game);
  renderRoundCards();
  launchConfetti(percentage);
  document.title = `Results · ${game.set.title} — Pose & Tell`;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function renderResultBreakdown(game) {
  dom.resultBreakdown.replaceChildren();

  game.answers.forEach((answer, index) => {
    const row = document.createElement("div");
    row.className = "breakdown-row";

    const number = document.createElement("span");
    number.className = "breakdown-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const question = document.createElement("div");
    question.className = "breakdown-question";
    const prompt = document.createElement("strong");
    prompt.textContent = answer.question.prompt;
    const detail = document.createElement("span");
    if (answer.isCorrect) {
      detail.textContent = `Your answer: ${
        answer.selectedIndex === 0 ? "A" : "B"
      } · ${answer.question.options[answer.selectedIndex]}`;
    } else {
      detail.textContent = `Correct: ${
        answer.correctIndex === 0 ? "A" : "B"
      } · ${answer.question.options[answer.correctIndex]}`;
    }
    question.append(prompt, detail);

    const points = document.createElement("span");
    points.className = `breakdown-points${answer.isCorrect ? "" : " is-zero"}`;
    points.textContent = answer.isCorrect
      ? `+${formatPoints(answer.points)}`
      : "+0";

    const result = document.createElement("span");
    result.className = `breakdown-result${answer.isCorrect ? "" : " is-wrong"}`;
    result.textContent = answer.isCorrect ? "✓" : "×";
    result.setAttribute(
      "aria-label",
      answer.isCorrect ? "Correct answer" : "Incorrect answer",
    );

    row.append(number, question, points, result);
    dom.resultBreakdown.append(row);
  });

  const footnote = document.createElement("div");
  footnote.className = "breakdown-footnote";
  const rates = document.createElement("span");
  rates.innerHTML = `<b>${SCORING.base}</b> base · <b>+${SCORING.streakBonus}</b> streak`;
  const perfect = document.createElement("span");
  perfect.textContent = `Perfect round · ${formatPoints(getMaxScore(game.set.questions.length))} pts`;
  footnote.append(rates, perfect);
  dom.resultBreakdown.append(footnote);
}

function launchConfetti(percentage) {
  dom.confetti.replaceChildren();
  if (percentage < 0.5 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const colors = ["#dcff67", "#ff6b47", "#c5b7ff", "#a5ead7", "#fffdf7", "#181a13"];
  const count = percentage >= 0.85 ? 46 : 28;

  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 220}px`);
    piece.style.setProperty("--spin", `${180 + Math.random() * 540}deg`);
    piece.style.setProperty("--duration", `${2.7 + Math.random() * 2.4}s`);
    piece.style.setProperty("--delay", `${Math.random() * 0.8}s`);
    if (Math.random() > 0.55) {
      piece.style.width = "5px";
      piece.style.height = "19px";
    }
    dom.confetti.append(piece);
  }
}

/* ==========================================================================
   Navigation
   ========================================================================== */

function showView(name) {
  state.screen = name;
  dom.lobbyView.hidden = name !== "lobby";
  dom.gameView.hidden = name !== "game";
  dom.resultsView.hidden = name !== "results";

  if (name === "game") pose.setPreviewCanvas(dom.gameCanvas);
  else if (name === "lobby") pose.setPreviewCanvas(dom.lobbyCanvas);
  else pose.setPreviewCanvas(null);

  syncChrome();
  syncAcceptance();
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function goHome({ scrollToRounds = false } = {}) {
  if (pose.cameraOn) stopCameraFlow({ silent: true });
  state.game = null;
  showView("lobby");
  renderRoundCards();
  document.title = "Pose & Tell — the gesture quiz";

  if (scrollToRounds) {
    window.setTimeout(() => {
      dom.rounds.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }
}

function chooseRound() {
  dom.rounds.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ==========================================================================
   Dialogs
   ========================================================================== */

function openDialog(dialog) {
  if (!dialog) return;
  document.querySelectorAll("dialog[open]").forEach((open) => {
    if (open !== dialog) open.close();
  });
  if (!dialog.open) dialog.showModal();
  syncAcceptance();
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function openModelDialog() {
  if (state.model.error) showModelError(state.model.error);
  else clearModelError();
  setModelBusy(state.modelBusy);
  if (state.model.status === "loading" && !state.modelBusy) {
    showModelLoading(true, "Loading your model…");
  } else if (!state.modelBusy) {
    showModelLoading(false);
  }
  updateModelConnectedPanel();
  openDialog(dom.modelDialog);

  if (!state.model.ready) {
    window.setTimeout(() => {
      if (dom.modelDialog.open) dom.modelUrlInput.focus();
    }, 120);
  }
}

function openSettingsDialog() {
  renderSettingsUI();
  openDialog(dom.settingsDialog);
}

function openHowDialog() {
  openDialog(dom.howDialog);
}

function renderSettingsUI() {
  const ready = state.model.ready;

  dom.settingsModelEmpty.hidden = ready;
  dom.settingsModelBody.hidden = !ready;
  dom.thresholdValue.textContent = formatPercent(state.preferences.threshold);
  dom.holdValue.textContent = formatHold(state.preferences.holdMs);
  dom.thresholdRange.value = String(Math.round(state.preferences.threshold * 100));
  dom.holdRange.value = String(state.preferences.holdMs);
  dom.mirrorToggle.checked = state.preferences.mirror;
  updateRangeFill(dom.thresholdRange);
  updateRangeFill(dom.holdRange);

  if (!ready) {
    dom.settingsProbabilities.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "live-empty";
    empty.textContent = "Connect a pose model to see live class confidence.";
    dom.settingsProbabilities.append(empty);
    state.settingsProbRows = [];
    updateSettingsLive(state.detection || emptyDetection());
    return;
  }

  dom.settingsModelName.textContent =
    state.model.metadata?.modelName ||
    (state.model.source === "local"
      ? "Local pose model"
      : state.model.sourceLabel || "Pose model");
  dom.settingsModelCount.textContent = `${state.model.labels.length} ${
    state.model.labels.length === 1 ? "CLASS" : "CLASSES"
  }`;

  syncMappingSelects();
  syncMappingWarning();
  buildSettingsProbabilities();
  updateSettingsLive(state.detection || emptyDetection());
}

function buildMappingSelect(select, selectedIndex) {
  select.replaceChildren();
  const unassigned = document.createElement("option");
  unassigned.value = "";
  unassigned.textContent = "Not assigned";
  select.append(unassigned);

  state.model.labels.forEach((label, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${index + 1}. ${label}`;
    select.append(option);
  });

  select.value = selectedIndex == null ? "" : String(selectedIndex);
  select.disabled = !state.model.ready;
}

function syncMappingSelects() {
  if (!state.model.ready) return;
  buildMappingSelect(dom.mapASelect, state.model.mapping.aIndex);
  buildMappingSelect(dom.mapBSelect, state.model.mapping.bIndex);
}

function syncMappingWarning() {
  const ready = state.model.ready;
  const mapped = mappingIsReady();
  dom.mappingWarning.hidden = !ready || mapped;
  dom.mappingWarning.textContent =
    ready && !mapped
      ? "Choose two different classes so both answer sides are available."
      : "";
}

function onMappingSelectChange(side) {
  if (!state.model.ready) return;

  const select = side === "A" ? dom.mapASelect : dom.mapBSelect;
  const otherSelect = side === "A" ? dom.mapBSelect : dom.mapASelect;
  const nextIndex = select.value === "" ? null : Number(select.value);
  let aIndex = side === "A" ? nextIndex : state.model.mapping.aIndex;
  let bIndex = side === "B" ? nextIndex : state.model.mapping.bIndex;

  const oldA = state.model.mapping.aIndex;
  const oldB = state.model.mapping.bIndex;

  if (aIndex != null && aIndex === bIndex) {
    // Choosing the side that is already in use swaps the two assignments.
    if (side === "A") {
      bIndex = oldA;
    } else {
      aIndex = oldB;
    }
    otherSelect.value = bIndex == null ? "" : String(bIndex);
  }

  pose.setMapping(aIndex, bIndex);
  state.model.mapping = { aIndex, bIndex };
  if (state.screen === "game" && state.game?.phase === "question" && pose.cameraOn) {
    blockAcceptance(550);
  }
  syncMappingLabels();
  syncMappingWarning();
  syncSettingsProbabilityMapping();
  syncChrome();
  syncAcceptance();
}

function swapSides() {
  if (!state.model.ready) return;
  const { aIndex, bIndex } = state.model.mapping;
  pose.setMapping(bIndex, aIndex);
  state.model.mapping = { aIndex: bIndex, bIndex: aIndex };
  if (state.screen === "game" && state.game?.phase === "question" && pose.cameraOn) {
    blockAcceptance(550);
  }
  syncMappingSelects();
  syncMappingLabels();
  syncSettingsProbabilityMapping();
  syncChrome();
  syncAcceptance();
}

function buildSettingsProbabilities() {
  dom.settingsProbabilities.replaceChildren();
  state.settingsProbRows = [];

  if (!state.model.ready) {
    const empty = document.createElement("p");
    empty.className = "live-empty";
    empty.textContent = "No model connected.";
    dom.settingsProbabilities.append(empty);
    return;
  }

  state.model.labels.forEach((label, index) => {
    const row = document.createElement("div");
    row.className = "live-probability-row";
    row.dataset.index = String(index);

    const name = document.createElement("span");
    name.className = "live-probability-name";
    const marker = document.createElement("b");
    marker.textContent = "·";
    const text = document.createElement("span");
    text.textContent = label;
    text.title = label;
    name.append(marker, text);

    const track = document.createElement("div");
    track.className = "live-probability-track";
    const bar = document.createElement("span");
    track.append(bar);

    const value = document.createElement("span");
    value.className = "live-probability-value";
    value.textContent = "0%";

    row.append(name, track, value);
    dom.settingsProbabilities.append(row);
    state.settingsProbRows.push({ row, name, marker, bar, value, index });
  });

  syncSettingsProbabilityMapping();
}

function syncSettingsProbabilityMapping() {
  if (!state.settingsProbRows.length) return;
  const { aIndex, bIndex } = state.model.mapping;

  state.settingsProbRows.forEach(({ row, marker, index }) => {
    const side = index === aIndex ? "A" : index === bIndex ? "B" : null;
    marker.textContent = side || "·";
    row.classList.toggle("is-mapped-a", side === "A");
    row.classList.toggle("is-mapped-b", side === "B");
    row.classList.toggle("is-unmapped", !side);
  });
}

function updateSettingsLive(snapshot) {
  if (!dom.settingsDialog.open) return;

  const cameraOn = pose.cameraOn;
  if (!state.model.ready) {
    dom.liveTestHint.textContent = cameraOn ? "No model connected" : "Start the camera to test";
    return;
  }

  dom.liveTestHint.textContent = cameraOn ? "Live from your camera" : "Start the camera to test";
  const predictions = snapshot?.probabilities?.predictions || [];

  state.settingsProbRows.forEach(({ bar, value, index }) => {
    const probability = predictions[index]?.probability || 0;
    bar.style.width = `${Math.round(probability * 100)}%`;
    value.textContent = formatPercent(probability);
  });
}

/* ==========================================================================
   Preferences
   ========================================================================== */

function syncPreferencesUI() {
  dom.thresholdRange.value = String(Math.round(state.preferences.threshold * 100));
  dom.thresholdValue.textContent = formatPercent(state.preferences.threshold);
  dom.holdRange.value = String(state.preferences.holdMs);
  dom.holdValue.textContent = formatHold(state.preferences.holdMs);
  dom.mirrorToggle.checked = state.preferences.mirror;
  updateRangeFill(dom.thresholdRange);
  updateRangeFill(dom.holdRange);
}

function updateRangeFill(input) {
  if (!input) return;
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const value = Number(input.value) || min;
  const percentage = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--fill", `${Math.max(0, Math.min(100, percentage))}%`);
}

function setThreshold(value) {
  state.preferences.threshold = Math.min(0.95, Math.max(0.5, value / 100));
  pose.setThreshold(state.preferences.threshold);
  dom.thresholdValue.textContent = formatPercent(state.preferences.threshold);
  updateRangeFill(dom.thresholdRange);
  savePreferences(state.preferences);
}

function setHold(value) {
  state.preferences.holdMs = Math.min(3000, Math.max(500, value));
  pose.setHoldMs(state.preferences.holdMs);
  dom.holdValue.textContent = formatHold(state.preferences.holdMs);
  updateRangeFill(dom.holdRange);
  savePreferences(state.preferences);
}

/* ==========================================================================
   Local files
   ========================================================================== */

function openModelTab(tab) {
  dom.modelTabs.forEach((button) => {
    const active = button.dataset.modelTab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  dom.urlPanel.hidden = tab !== "url";
  dom.localPanel.hidden = tab !== "local";
  if (tab === "url" && !state.modelBusy) {
    dom.modelUrlInput.focus();
  }
}

async function filesFromDataTransfer(dataTransfer) {
  const items = Array.from(dataTransfer.items || []);
  const entries = items
    .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
    .filter(Boolean);

  if (!entries.length) return Array.from(dataTransfer.files || []);

  const files = [];

  async function walk(entry) {
    if (entry.isFile) {
      await new Promise((resolve) => {
        entry.file(
          (file) => {
            files.push(file);
            resolve();
          },
          () => resolve(),
        );
      });
      return;
    }

    if (entry.isDirectory) {
      const reader = entry.createReader();
      await new Promise((resolve) => {
        const readBatch = () => {
          reader.readEntries(
            async (batch) => {
              if (!batch.length) {
                resolve();
                return;
              }
              await Promise.all(batch.map((child) => walk(child)));
              readBatch();
            },
            () => resolve(),
          );
        };
        readBatch();
      });
    }
  }

  await Promise.all(entries.map((entry) => walk(entry)));
  return files;
}

/* ==========================================================================
   Events
   ========================================================================== */

function bindEvents() {
  document.addEventListener("click", onDocumentClick);

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (anyDialogOpen()) return;

    const target = event.target;
    const tagName = target?.tagName?.toLowerCase();
    if (
      tagName === "input" ||
      tagName === "select" ||
      tagName === "textarea" ||
      target?.isContentEditable
    ) {
      return;
    }

    if (state.screen !== "game" || !state.game) return;

    if (state.game.phase === "question") {
      const key = event.key.toLowerCase();
      if (key === "a" || key === "b") {
        event.preventDefault();
        submitAnswer(key.toUpperCase(), "keyboard");
      }
      return;
    }

    if (state.game.phase === "feedback") {
      const key = event.key.toLowerCase();
      if (key === "n" || (key === "enter" && tagName !== "button")) {
        event.preventDefault();
        nextQuestion();
      }
    }
  });

  dom.modelTabs.forEach((button) => {
    button.addEventListener("click", () => openModelTab(button.dataset.modelTab));
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (outside) dialog.close();
    });

    dialog.addEventListener("close", () => {
      if (state.screen === "game" && state.game?.phase === "question" && pose.cameraOn) {
        blockAcceptance(650);
      } else {
        syncAcceptance();
      }
      updateSettingsLive(state.detection || emptyDetection());
    });
  });

  dom.modelUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadModelFromUrl();
    }
  });

  [dom.zipInput, dom.folderInput, dom.filesInput].forEach((input) => {
    input.addEventListener("change", async () => {
      if (input.files?.length) await handleLocalFiles(input.files);
      input.value = "";
    });
  });

  dom.modelDropzone.addEventListener("click", (event) => {
    if (event.target.closest("button") || event.target.closest("input")) return;
    if (!state.modelBusy) dom.zipInput.click();
  });

  dom.modelDropzone.addEventListener("keydown", (event) => {
    if (event.target !== dom.modelDropzone) return;
    if ((event.key === "Enter" || event.key === " ") && !state.modelBusy) {
      event.preventDefault();
      dom.zipInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((type) => {
    dom.modelDropzone.addEventListener(type, (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!state.modelBusy) dom.modelDropzone.classList.add("is-dragging");
    });
  });

  ["dragleave", "dragend"].forEach((type) => {
    dom.modelDropzone.addEventListener(type, (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!dom.modelDropzone.contains(event.relatedTarget)) {
        dom.modelDropzone.classList.remove("is-dragging");
      }
    });
  });

  dom.modelDropzone.addEventListener("drop", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dom.modelDropzone.classList.remove("is-dragging");
    if (state.modelBusy) return;
    try {
      const files = await filesFromDataTransfer(event.dataTransfer);
      await handleLocalFiles(files);
    } catch {
      showModelError("We couldn't read those dropped files. Try the file picker instead.");
    }
  });

  window.addEventListener("dragover", (event) => event.preventDefault());
  window.addEventListener("drop", (event) => {
    if (!dom.modelDropzone.contains(event.target)) event.preventDefault();
  });

  dom.thresholdRange.addEventListener("input", () => {
    setThreshold(Number(dom.thresholdRange.value));
  });
  dom.holdRange.addEventListener("input", () => {
    setHold(Number(dom.holdRange.value));
  });
  dom.mirrorToggle.addEventListener("change", () => {
    state.preferences.mirror = dom.mirrorToggle.checked;
    pose.setMirror(state.preferences.mirror);
    savePreferences(state.preferences);
  });
  dom.mapASelect.addEventListener("change", () => onMappingSelectChange("A"));
  dom.mapBSelect.addEventListener("change", () => onMappingSelectChange("B"));
  dom.swapSidesButton.addEventListener("click", swapSides);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pose.setAccepting(false);
    } else {
      if (state.screen === "game" && state.game?.phase === "question" && pose.cameraOn) {
        blockAcceptance(500);
      } else {
        syncAcceptance();
      }
    }
  });

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) {
      pose.setAccepting(false);
      pose.stopCamera();
    } else {
      pose.destroy();
    }
  });
}

function onDocumentClick(event) {
  const answerButton = event.target.closest("[data-answer]");
  if (answerButton && !answerButton.disabled) {
    submitAnswer(answerButton.dataset.answer, "click");
    return;
  }

  const actionElement = event.target.closest("[data-action]");
  if (!actionElement) return;

  if (actionElement.tagName === "A" && actionElement.getAttribute("href") === "#") {
    event.preventDefault();
  }

  const action = actionElement.dataset.action;

  switch (action) {
    case "start-camera":
    case "camera-toggle":
      if (pose.cameraOn) stopCameraFlow();
      else startCameraFlow();
      break;

    case "open-model":
      openModelDialog();
      break;

    case "open-settings":
      openSettingsDialog();
      break;

    case "how-it-works":
      openHowDialog();
      break;

    case "close-dialog": {
      const dialog =
        document.getElementById(actionElement.dataset.dialog) ||
        actionElement.closest("dialog");
      closeDialog(dialog);
      break;
    }

    case "choose-round":
      chooseRound();
      break;

    case "start-round":
      if (!state.modelBusy) startRound(actionElement.dataset.setId);
      break;

    case "next-question":
      nextQuestion();
      break;

    case "quit-game":
      goHome({ scrollToRounds: true });
      break;

    case "go-home":
      goHome();
      break;

    case "play-again": {
      const setId = state.game?.setId;
      if (!setId) {
        goHome({ scrollToRounds: true });
        break;
      }
      startRound(setId);
      if (!pose.cameraOn) startCameraFlow();
      break;
    }

    case "load-model-url":
      loadModelFromUrl();
      break;

    case "fill-example-url":
      openModelTab("url");
      dom.modelUrlInput.value = EXAMPLE_MODEL_URL;
      dom.modelUrlInput.focus();
      showToast("Example URL filled in. Connect it, then map the generic classes.");
      break;

    case "choose-zip":
      if (!state.modelBusy) dom.zipInput.click();
      break;

    case "choose-folder":
      if (!state.modelBusy) dom.folderInput.click();
      break;

    case "choose-files":
      if (!state.modelBusy) dom.filesInput.click();
      break;

    case "load-local-model":
      loadLocalModel();
      break;

    case "disconnect-model":
      pose.disconnectModel();
      showToast("Pose model disconnected. Click answers until you reconnect.");
      break;

    default:
      break;
  }
}

/* ==========================================================================
   Go
   ========================================================================== */

init();
