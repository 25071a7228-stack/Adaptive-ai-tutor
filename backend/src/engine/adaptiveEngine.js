import { getDifficultyFromMastery } from "./masteryEngine";


/*
|--------------------------------------------------------------------------
| Get questions that are valid for the current student
|--------------------------------------------------------------------------
|
| IMPORTANT FOR MVP:
|
| Class 3 -> ONLY Class 3 questions
| Class 8 -> ONLY Class 8 questions
|
| We deliberately do NOT allow the engine to fall back to a lower class.
| That can be added later when the full adaptive/scaffolding system is built.
|
*/

export function getEligibleQuestions(
  questions,
  { student, topicId }
) {
  if (!Array.isArray(questions) || !student) {
    return [];
  }

  return questions.filter((q) => {
    const exactClass =
      Number(q.classLevel) ===
      Number(student.classLevel);

    const exactTopic =
      !topicId ||
      q.topicId === topicId;

    return (
      exactClass &&
      exactTopic
    );
  });
}


/*
|--------------------------------------------------------------------------
| Select next question
|--------------------------------------------------------------------------
*/

export function selectNextQuestion({
  questions,
  student,
  topicId,
  mastery,
  attemptedQuestionIds = [],
  forceDifficulty = null,
}) {
  const eligible =
    getEligibleQuestions(
      questions,
      {
        student,
        topicId,
      }
    );

  /*
   * No questions available.
   */
  if (!eligible.length) {
    return null;
  }


  /*
   * Decide which difficulty we want.
   */
  const targetDifficulty =
    forceDifficulty ||
    getDifficultyFromMastery(
      mastery?.mastery || 0
    );


  /*
   * Remove questions already attempted.
   */
  const candidates =
    eligible.filter(
      (question) =>
        !attemptedQuestionIds.includes(
          question.id
        )
    );


  /*
   * All questions in this topic
   * have already been attempted.
   */
  if (!candidates.length) {
    return null;
  }


  /*
   * Pick the question closest
   * to the desired difficulty.
   */
  candidates.sort(
    (a, b) => {

      const aDistance =
        Math.abs(
          Number(a.difficulty || 1) -
          Number(targetDifficulty)
        );

      const bDistance =
        Math.abs(
          Number(b.difficulty || 1) -
          Number(targetDifficulty)
        );

      return (
        aDistance -
        bDistance
      );
    }
  );


  return candidates[0];
}


/*
|--------------------------------------------------------------------------
| Decide what the tutor/adaptive system should do next
|--------------------------------------------------------------------------
*/

export function getNextAction({
  isCorrect,
  misconception,
  mastery,
}) {

  /*
   * Correct + strong mastery
   * + no misconception
   *
   * Move towards harder questions.
   */
  if (
    isCorrect &&
    mastery >= 0.7 &&
    !misconception?.detected
  ) {
    return {
      type: "increase_difficulty",

      message:
        "You're getting comfortable with this. Let's try something a little harder.",
    };
  }


  /*
   * Correct but understanding
   * is uncertain.
   *
   * Give another similar question.
   */
  if (
    isCorrect &&
    misconception?.detected
  ) {
    return {
      type: "similar_question",

      message:
        "You got it! Let's try one more to make sure the idea is clear.",
    };
  }


  /*
   * Wrong answer + detected misconception.
   *
   * Give targeted practice.
   */
  if (
    !isCorrect &&
    misconception?.detected
  ) {
    return {
      type: "targeted_practice",

      message:
        misconception.message,
    };
  }


  /*
   * Wrong answer without
   * a specific misconception.
   *
   * Scaffold the learner.
   */
  if (!isCorrect) {
    return {
      type: "scaffold",

      message:
        "That's okay. Let's try a simpler step.",
    };
  }


  /*
   * Default.
   */
  return {
    type: "next_question",

    message:
      "Great work! Let's keep going.",
  };
}


/*
|--------------------------------------------------------------------------
| Decide when to ask for reasoning
|--------------------------------------------------------------------------
|
| We don't ask after every question.
|
| Example:
|
| Question 1 -> answer
| Question 2 -> answer
| Question 3 -> answer + reasoning
| Question 4 -> answer
| Question 5 -> answer
| Question 6 -> answer + reasoning
|
*/

export function shouldAskReasoning({
  attemptNumber,
}) {
  return (
    attemptNumber > 0 &&
    attemptNumber % 3 === 0
  );
}