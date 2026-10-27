const IDLE_LABEL =
  /\b(neutral|idle|rest|ready|nothing|none|no hand|standing|still|background)\b/i;
const LEFT_LABEL =
  /\b(left|left[- ]?hand|hand[- ]?1|option[- ]?a)\b|^a$/i;
const RIGHT_LABEL =
  /\b(right|right[- ]?hand|hand[- ]?2|option[- ]?b)\b|^b$/i;

/**
 * Choose sensible A/B classes from a model's labels.
 * Labels are referenced by index because duplicate labels are allowed.
 */
export function autoMapLabels(labels) {
  const indices = labels.map((_, index) => index);
  const idle = new Set(
    indices.filter((index) => IDLE_LABEL.test(String(labels[index]))),
  );

  let aIndex = indices.find(
    (index) => !idle.has(index) && LEFT_LABEL.test(String(labels[index])),
  );
  let bIndex = indices.find(
    (index) =>
      index !== aIndex &&
      !idle.has(index) &&
      RIGHT_LABEL.test(String(labels[index])),
  );

  const fallbacks = indices.filter((index) => !idle.has(index));
  if (aIndex == null) aIndex = fallbacks[0] ?? null;
  if (bIndex == null) bIndex = fallbacks.find((index) => index !== aIndex) ?? null;

  return { aIndex, bIndex };
}

/**
 * Turn a Teachable Machine share URL into the two model endpoints we need.
 * Accepts URLs with or without a trailing slash, and direct model/metadata URLs.
 */
export function normalizeModelUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    throw new Error("Paste your Teachable Machine model URL first.");
  }

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;

  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Model URLs must start with https:// or http://.");
  }

  url.hash = "";
  url.search = "";
  let path = url.pathname.replace(/\/(?:model|metadata)\.json$/i, "");
  path = path.replace(/\/+$/, "");
  if (!path) path = "";
  const base = `${url.origin}${path}/`;

  return {
    base,
    modelUrl: `${base}model.json`,
    metadataUrl: `${base}metadata.json`,
    host: url.host,
  };
}

export function validatePoseMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    throw new Error("The metadata file is empty or isn't valid JSON.");
  }

  if (!Array.isArray(metadata.labels) || metadata.labels.length < 2) {
    throw new Error(
      "This model needs at least two class labels. Re-export it with two gestures.",
    );
  }

  const packageName = String(metadata.packageName || "");
  if (/image/i.test(packageName)) {
    throw new Error(
      "That's a Teachable Machine image model. This app needs a Pose model — train one with the Pose project type.",
    );
  }
  if (/audio/i.test(packageName)) {
    throw new Error(
      "That's a Teachable Machine audio model. This app needs a Pose model — train one with the Pose project type.",
    );
  }

  return metadata;
}

export function formatPoints(value) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value || 0));
}

export function formatPercent(value) {
  return `${Math.round(Math.max(0, Math.min(1, value || 0)) * 100)}%`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getGrade(percentage) {
  if (percentage >= 0.9) {
    return {
      kicker: "FLAWLESS FORM",
      title: "Pose prodigy.",
      copy: "The camera barely had to blink. Every gesture landed exactly where it needed to.",
    };
  }
  if (percentage >= 0.7) {
    return {
      kicker: "STRONG SHOWING",
      title: "Gesture great.",
      copy: "Confident hands, sharp answers. A little more practice and the leaderboard is yours.",
    };
  }
  if (percentage >= 0.4) {
    return {
      kicker: "WARMING UP",
      title: "Both hands in.",
      copy: "You found a rhythm. Another round and those gestures will feel like second nature.",
    };
  }
  return {
    kicker: "BRAVE START",
    title: "Arms wide open.",
    copy: "Every great gesture begins with a wobble. Go again — your hands already know the way.",
  };
}

export function getBestScores() {
  try {
    const parsed = JSON.parse(localStorage.getItem("poseAndTell.bestScores") || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBestScore(setId, score) {
  const scores = getBestScores();
  const previous = Number(scores[setId]) || 0;
  if (score <= previous) return { best: previous, isNewBest: false };

  scores[setId] = score;
  try {
    localStorage.setItem("poseAndTell.bestScores", JSON.stringify(scores));
  } catch {
    // Private browsing and storage-full cases should not break the quiz.
  }
  return { best: score, isNewBest: true };
}

export function loadPreferences() {
  const fallback = { threshold: 0.7, holdMs: 1200, mirror: true };
  try {
    const saved = JSON.parse(
      localStorage.getItem("poseAndTell.preferences") || "{}",
    );
    return {
      threshold:
        typeof saved.threshold === "number"
          ? clamp(saved.threshold, 0.5, 0.95)
          : fallback.threshold,
      holdMs:
        typeof saved.holdMs === "number"
          ? clamp(saved.holdMs, 400, 3000)
          : fallback.holdMs,
      mirror: typeof saved.mirror === "boolean" ? saved.mirror : fallback.mirror,
    };
  } catch {
    return fallback;
  }
}

export function savePreferences(preferences) {
  try {
    localStorage.setItem(
      "poseAndTell.preferences",
      JSON.stringify(preferences),
    );
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Read an exported Teachable Machine folder (or zip) and identify the
 * model.json / weights.bin / metadata.json trio.
 *
 * @param {File[]} selectedFiles
 * @param {(bytes: Uint8Array) => Record<string, Uint8Array>} unzip
 */
export async function resolveModelFiles(selectedFiles, unzip) {
  let files = Array.from(selectedFiles || []).filter((file) => file && file.size > 0);
  if (!files.length) {
    throw new Error("Choose your model files first.");
  }

  if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
    if (!unzip) {
      throw new Error("Zip support didn't load. Unzip the folder and choose the three files instead.");
    }
    if (files[0].size > 60 * 1024 * 1024) {
      throw new Error("That zip is unusually large. Unzip it and import the three model files instead.");
    }

    let entries;
    try {
      entries = unzip(new Uint8Array(await files[0].arrayBuffer()));
    } catch {
      throw new Error("We couldn't open that zip. Check that it's the folder exported by Teachable Machine.");
    }

    files = Object.entries(entries)
      .filter(
        ([name, bytes]) =>
          bytes &&
          bytes.length > 0 &&
          !name.startsWith("__MACOSX/") &&
          (/(^|\/)(model|metadata)\.json$/i.test(name) ||
            /(^|\/)[^/]+\.bin$/i.test(name)),
      )
      .map(([name, bytes]) => {
        const baseName = name.split("/").pop();
        return new File([bytes], baseName, { type: "application/octet-stream" });
      });
  }

  if (!files.length) {
    throw new Error("No model files were found. Choose the folder you downloaded from Teachable Machine.");
  }

  const jsonFiles = files.filter((file) => /\.json$/i.test(file.name));
  const binFiles = files.filter((file) => /\.bin$/i.test(file.name));
  const namedModel = jsonFiles.find((file) => /^model\.json$/i.test(file.name));
  const namedMetadata = jsonFiles.find(
    (file) => /^metadata\.json$/i.test(file.name),
  );

  let modelFile = namedModel || null;
  let metadataFile = namedMetadata || null;
  let metadata = null;

  // Fall back to inspecting the contents when files were renamed.
  for (const file of jsonFiles) {
    if (modelFile && metadataFile) break;
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      continue;
    }
    if (!modelFile && parsed.modelTopology) modelFile = file;
    if (!metadataFile && Array.isArray(parsed.labels)) {
      metadataFile = file;
      metadata = parsed;
    }
  }

  if (!modelFile) {
    throw new Error("Missing model.json. Choose the complete folder you downloaded from Teachable Machine.");
  }
  if (!metadataFile) {
    throw new Error("Missing metadata.json. Choose the complete folder you downloaded from Teachable Machine.");
  }
  if (!binFiles.length) {
    throw new Error("Missing weights.bin. Choose the complete folder you downloaded from Teachable Machine.");
  }

  if (!metadata) {
    try {
      metadata = JSON.parse(await metadataFile.text());
    } catch {
      throw new Error("metadata.json couldn't be read as valid JSON.");
    }
  }

  validatePoseMetadata(metadata);

  let modelJSON;
  try {
    modelJSON = JSON.parse(await modelFile.text());
  } catch {
    throw new Error("model.json couldn't be read as valid JSON.");
  }

  const expectedWeightPaths =
    modelJSON?.weightsManifest?.flatMap((group) => group.paths || []) || [];
  if (!expectedWeightPaths.length) {
    throw new Error("model.json doesn't list a weights file. Re-export the model from Teachable Machine.");
  }
  if (expectedWeightPaths.length > 1) {
    throw new Error(
      "This model uses multiple weight files. Teachable Machine pose exports use a single .bin file.",
    );
  }

  const expectedWeightName = expectedWeightPaths[0].split("/").pop();
  const chosenWeights =
    binFiles.find((file) => file.name === expectedWeightName) || binFiles[0];

  // tf.io.browserFiles matches files by basename. Rename a mis-named .bin so
  // that re-downloaded or unzipped models still load cleanly.
  let weightsFile = chosenWeights;
  if (chosenWeights.name !== expectedWeightName) {
    weightsFile = new File([await chosenWeights.arrayBuffer()], expectedWeightName, {
      type: "application/octet-stream",
    });
  }

  return {
    modelFile,
    weightsFile,
    metadataFile,
    metadata,
  };
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
