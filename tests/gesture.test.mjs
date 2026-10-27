import assert from "node:assert/strict";
import test from "node:test";
import { autoMapLabels, resolveGesture } from "../js/utils.js";

function predictions(a, b, rest) {
  return [
    { className: "A", probability: a },
    { className: "B", probability: b },
    { className: "R", probability: rest },
  ];
}

test("maps a three-class left/right/no-hands model", () => {
  const labels = ["Left hand raised", "Right hand raised", "No hands raised"];
  assert.deepEqual(autoMapLabels(labels), {
    aIndex: 0,
    bIndex: 1,
    restIndex: 2,
  });
});

test("recognises both arms down as the rest class", () => {
  assert.deepEqual(
    autoMapLabels(["Left hand", "Right hand", "Both arms down"]),
    { aIndex: 0, bIndex: 1, restIndex: 2 },
  );
});

test("uses the unused third class as rest when labels are generic", () => {
  assert.deepEqual(autoMapLabels(["Class 1", "Class 2", "Class 3"]), {
    aIndex: 0,
    bIndex: 1,
    restIndex: 2,
  });
});

test("keeps two-class models working without a rest class", () => {
  assert.deepEqual(autoMapLabels(["Left", "Right"]), {
    aIndex: 0,
    bIndex: 1,
    restIndex: null,
  });
});

test("rest suppresses a resting pose even if a mapped hand class is highest", () => {
  const result = resolveGesture(
    predictions(0.71, 0.1, 0.68),
    { aIndex: 0, bIndex: 1, restIndex: 2 },
    0.7,
  );
  assert.equal(result.side, null);
  assert.equal(result.restBlocked, true);
  assert.equal(result.restWinning, true);
});

test("a close rest signal blocks an ambiguous hand class", () => {
  const result = resolveGesture(
    predictions(0.86, 0.03, 0.78),
    { aIndex: 0, bIndex: 1, restIndex: 2 },
    0.7,
  );
  assert.equal(result.side, null);
  assert.equal(result.restWinning, true);
});

test("a clear raised hand wins when rest is low", () => {
  const result = resolveGesture(
    predictions(0.9, 0.02, 0.08),
    { aIndex: 0, bIndex: 1, restIndex: 2 },
    0.7,
  );
  assert.equal(result.side, "A");
  assert.equal(result.restBlocked, false);
});

test("rest wins when it is the strongest class", () => {
  const result = resolveGesture(
    predictions(0.08, 0.1, 0.82),
    { aIndex: 0, bIndex: 1, restIndex: 2 },
    0.7,
  );
  assert.equal(result.side, null);
  assert.equal(result.restWinning, true);
});

test("gesture must clear the configured threshold", () => {
  assert.equal(
    resolveGesture(
      predictions(0.62, 0.1, 0.28),
      { aIndex: 0, bIndex: 1, restIndex: 2 },
      0.7,
    ).side,
    null,
  );
  assert.equal(
    resolveGesture(
      predictions(0.62, 0.1, 0.28),
      { aIndex: 0, bIndex: 1, restIndex: 2 },
      0.6,
    ).side,
    "A",
  );
});

test("an unmapped rest class keeps the original A/B behaviour", () => {
  const result = resolveGesture(
    predictions(0.76, 0.14, 0.1),
    { aIndex: 0, bIndex: 1, restIndex: null },
    0.7,
  );
  assert.equal(result.side, "A");
});
