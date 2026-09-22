// src/engine/masteryEngine.js

const DEFAULT_MASTERY = {
  mastery: 0,
  confidence: 0,
  attempts: 0,
  correctAttempts: 0,
  difficulty: 1,
  lastPracticed: null,
};

/**
 * Create a fresh mastery record for a topic.
 */
export function createMastery(topicId) {
  return {
    topicId,
    ...DEFAULT_MASTERY,
  };
}

/**
 * Update mastery after an answer.
 *
 * Correct answers increase mastery.
 * Wrong answers reduce it slightly.
 *
 * A guessed correct answer increases mastery less strongly
 * because the learner may not fully understand the concept.
 */
export function updateMastery(
  current = null,
  isCorrect,
  reasoning = null
) {
  const previous = current || {
    ...DEFAULT_MASTERY,
  };

  const attempts = previous.attempts + 1;

  const correctAttempts =
    previous.correctAttempts + (isCorrect ? 1 : 0);

  let mastery =
    correctAttempts / attempts;

  // Correct but guessed/unsure = weaker evidence of understanding.
  if (
    isCorrect &&
    (reasoning === "guess" || reasoning === "unsure")
  ) {
    mastery = Math.max(
      0,
      mastery - 0.1
    );
  }

  // Confidence is deliberately separate from correctness.
  let confidence = mastery;

  if (
    isCorrect &&
    reasoning === "worked_out"
  ) {
    confidence = Math.min(
      1,
      mastery + 0.1
    );
  }

  if (
    reasoning === "guess" ||
    reasoning === "unsure"
  ) {
    confidence = Math.max(
      0,
      confidence - 0.15
    );
  }

  return {
    ...previous,

    attempts,

    correctAttempts,

    mastery: Number(
      Math.min(1, Math.max(0, mastery)).toFixed(2)
    ),

    confidence: Number(
      Math.min(1, Math.max(0, confidence)).toFixed(2)
    ),

    lastPracticed:
      new Date().toISOString(),
  };
}


/**
 * Human-friendly mastery status.
 *
 * We deliberately avoid points/scores in the child UI.
 */
export function getMasteryStatus(mastery = 0) {
  if (mastery >= 0.85) {
    return "Strong";
  }

  if (mastery >= 0.7) {
    return "Confident";
  }

  if (mastery >= 0.4) {
    return "Developing";
  }

  return "Building";
}


/**
 * Decide target difficulty from mastery.
 */
export function getDifficultyFromMastery(mastery = 0) {
  if (mastery < 0.4) {
    return 1;
  }

  if (mastery < 0.7) {
    return 2;
  }

  return 3;
}