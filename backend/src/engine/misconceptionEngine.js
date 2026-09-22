// src/engine/misconceptionEngine.js


/**
 * Analyze an answer together with the learner's reasoning.
 *
 * This is a deterministic offline MVP engine.
 *
 * Later, an on-device SLM can replace/enrich this analysis.
 */
export function detectMisconception({
  question,
  selectedAnswer,
  correctAnswer,
  reasoning,
}) {
  const isCorrect =
    selectedAnswer === correctAnswer;

  // --------------------------------------------------
  // CORRECT ANSWER
  // --------------------------------------------------

  if (isCorrect) {

    // Correct + guessed
    if (reasoning === "guess") {
      return {
        detected: true,

        type: "uncertain_understanding",

        confidence: 0.8,

        message:
          "You got it right! Let's make sure the idea feels clear too.",

        action:
          "similar_question",
      };
    }

    // Correct + unsure
    if (reasoning === "unsure") {
      return {
        detected: true,

        type: "uncertain_understanding",

        confidence: 0.7,

        message:
          "Nice answer! Let's try one more so you can feel more confident.",

        action:
          "similar_question",
      };
    }

    // Correct + worked out/rule
    return {
      detected: false,

      type: null,

      confidence: 0,

      message:
        "Great work! You seem to understand this idea.",

      action:
        "increase_difficulty",
    };
  }


  // --------------------------------------------------
  // WRONG ANSWER
  // --------------------------------------------------

  if (!isCorrect) {

    if (reasoning === "guess") {
      return {
        detected: false,

        type: "uncertain_understanding",

        confidence: 0.4,

        message:
          "That's okay. Let's slow down and work through it together.",

        action:
          "scaffold",
      };
    }


    if (reasoning === "unsure") {
      return {
        detected: false,

        type: "learning_gap",

        confidence: 0.5,

        message:
          "No worries. Let's try a simpler example first.",

        action:
          "scaffold",
      };
    }


    // Wrong + rule
    if (reasoning === "rule") {
      return {
        detected: true,

        type: "rule_misunderstanding",

        confidence: 0.65,

        message:
          "You're using the right idea. Let's look at how the rule works here.",

        action:
          "targeted_practice",
      };
    }


    // Wrong + worked out
    if (reasoning === "worked_out") {
      return {
        detected: true,

        type: "calculation_or_reasoning_error",

        confidence: 0.6,

        message:
          "Your approach is worth checking. Let's work through the steps carefully.",

        action:
          "targeted_practice",
      };
    }


    // Wrong + remembered similar question
    if (reasoning === "similar") {
      return {
        detected: true,

        type: "concept_transfer_error",

        confidence: 0.6,

        message:
          "That was a good connection. Let's see how this question is a little different.",

        action:
          "targeted_practice",
      };
    }
  }


  return {
    detected: false,

    type: null,

    confidence: 0,

    message:
      "Let's try another example together.",

    action:
      "targeted_practice",
  };
}


/**
 * Convert a misconception into a child-friendly message.
 */
export function getMisconceptionMessage(result) {
  if (!result?.detected) {
    return null;
  }

  return result.message;
}