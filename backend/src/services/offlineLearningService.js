import { questions } from "../data/questions";

import {
  selectNextQuestion,
  getNextAction,
  shouldAskReasoning,
} from "../engine/adaptiveEngine";

import {
  updateMastery,
} from "../engine/masteryEngine";

import {
  detectMisconception,
} from "../engine/misconceptionEngine";

import {
  saveAttempt,
  getTopicMastery,
  saveTopicMastery,
  getAttemptedQuestionIds,
  saveMisconception,
} from "./offlineStorage";


/* ============================================================
   GET NEXT QUESTION
============================================================ */

export function getNextQuestion({
  student,
  topicId,
}) {
  if (!student || !topicId) {
    return {
      question: null,
      done: false,
    };
  }


  /* ----------------------------------------------------------
     Get current mastery
  ---------------------------------------------------------- */

  const mastery =
    getTopicMastery(topicId);


  /* ----------------------------------------------------------
     IMPORTANT FIX

     getAttemptedQuestionIds()
     expects ONLY topicId.

     The old code passed:
       student.id, topicId

     which caused the attempted list to remain [].
  ---------------------------------------------------------- */

  const attemptedQuestionIds =
    getAttemptedQuestionIds(topicId);


  /* ----------------------------------------------------------
     Get questions for EXACT student class + topic
  ---------------------------------------------------------- */

  const eligibleQuestions =
    questions.filter(
      (q) =>
        q.topicId === topicId &&
        Number(q.classLevel) ===
          Number(student.classLevel)
    );


  /* ----------------------------------------------------------
     DEBUG
  ---------------------------------------------------------- */

  console.log(
    "================================"
  );

  console.log(
    "Topic:",
    topicId
  );

  console.log(
    "Student class:",
    student.classLevel
  );

  console.log(
    "Questions available:",
    eligibleQuestions.length
  );

  console.log(
    "Already attempted:",
    attemptedQuestionIds
  );

  console.log(
    "================================"
  );


  /* ----------------------------------------------------------
     No questions for this class/topic
  ---------------------------------------------------------- */

  if (
    eligibleQuestions.length === 0
  ) {
    return {
      question: null,
      done: true,
      totalQuestions: 0,
    };
  }


  /* ----------------------------------------------------------
     ALL QUESTIONS COMPLETED

     Never restart the same question.
  ---------------------------------------------------------- */

  if (
    attemptedQuestionIds.length >=
    eligibleQuestions.length
  ) {
    console.log(
      "All questions completed for this topic."
    );

    return {
      question: null,
      done: true,
      totalQuestions:
        eligibleQuestions.length,
    };
  }


  /* ----------------------------------------------------------
     Select an UNUSED question
  ---------------------------------------------------------- */

  const nextQuestion =
    selectNextQuestion({
      questions,
      student,
      topicId,
      mastery,
      attemptedQuestionIds,
    });


  /* ----------------------------------------------------------
     Safety check
  ---------------------------------------------------------- */

  if (!nextQuestion) {
    console.log(
      "No unused question found."
    );

    return {
      question: null,
      done: true,
      totalQuestions:
        eligibleQuestions.length,
    };
  }


  /* ----------------------------------------------------------
     NEVER expose correctAnswer to UI
  ---------------------------------------------------------- */

  return {
    question: {
      id:
        nextQuestion.id,

      question:
        nextQuestion.question,

      options:
        Array.isArray(
          nextQuestion.options
        )
          ? nextQuestion.options
          : [],

      difficulty:
        nextQuestion.difficulty,

      topicId:
        nextQuestion.topicId,

      classLevel:
        nextQuestion.classLevel,
    },

    done: false,

    totalQuestions:
      eligibleQuestions.length,

    completedQuestions:
      attemptedQuestionIds.length,
  };
}


/* ============================================================
   SUBMIT ANSWER
============================================================ */

export function submitAnswer({
  student,
  questionId,
  selectedAnswer,
}) {
  const question =
    questions.find(
      (q) =>
        q.id === questionId
    );


  if (!question) {
    throw new Error(
      `Question not found: ${questionId}`
    );
  }


  /* ----------------------------------------------------------
     Check answer
  ---------------------------------------------------------- */

  const isCorrect =
    selectedAnswer ===
    question.correctAnswer;


  /* ----------------------------------------------------------
     Get current mastery
  ---------------------------------------------------------- */

  const currentMastery =
    getTopicMastery(
      question.topicId
    );


  const previousAttempts =
    Number(
      currentMastery?.attempts || 0
    );


  const attemptNumber =
    previousAttempts + 1;


  /* ----------------------------------------------------------
     Update mastery
  ---------------------------------------------------------- */

  const newMastery =
    updateMastery(
      currentMastery,
      isCorrect
    );


  saveTopicMastery(
    question.topicId,
    newMastery
  );


  /* ----------------------------------------------------------
     Create attempt
  ---------------------------------------------------------- */

  const attempt = {
    id:
      `attempt-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    studentId:
      student.id,

    questionId:
      question.id,

    topicId:
      question.topicId,

    selectedAnswer,

    correctAnswer:
      question.correctAnswer,

    isCorrect,

    attemptNumber,

    reasoning:
      null,

    misconception:
      null,

    createdAt:
      new Date().toISOString(),
  };


  /* ----------------------------------------------------------
     Save attempt
  ---------------------------------------------------------- */

  saveAttempt(
    attempt
  );


  /* ----------------------------------------------------------
     Ask reasoning every 3rd question
  ---------------------------------------------------------- */

  const showReasoning =
    shouldAskReasoning({
      attemptNumber,
    });


  return {
    attempt,

    correct:
      isCorrect,

    explanation:
      question.explanation,

    mastery:
      newMastery,

    showReasoning,

    reasoningQuestion:
      showReasoning
        ? "How did you get your answer?"
        : null,

    reasoningOptions:
      showReasoning
        ? [
            {
              id: "rule",
              text: "I used the rule",
            },

            {
              id: "worked_out",
              text: "I worked it out",
            },

            {
              id: "similar",
              text:
                "I remembered a similar question",
            },

            {
              id: "guess",
              text: "I guessed",
            },

            {
              id: "unsure",
              text: "I'm not sure",
            },
          ]
        : [],
  };
}


/* ============================================================
   SUBMIT REASONING
============================================================ */

export function submitReasoning({
  attemptId,
  reasoning,
}) {
  const raw =
    localStorage.getItem(
      "smartTutor_attempts"
    );


  const attempts =
    raw
      ? JSON.parse(raw)
      : [];


  const attemptIndex =
    attempts.findIndex(
      (attempt) =>
        attempt.id ===
        attemptId
    );


  if (
    attemptIndex === -1
  ) {
    throw new Error(
      "Attempt not found."
    );
  }


  const attempt =
    attempts[attemptIndex];


  const question =
    questions.find(
      (q) =>
        q.id ===
        attempt.questionId
    );


  if (!question) {
    throw new Error(
      "Question not found."
    );
  }


  /* ----------------------------------------------------------
     Detect misconception
  ---------------------------------------------------------- */

  const misconception =
    detectMisconception({
      question,

      selectedAnswer:
        attempt.selectedAnswer,

      correctAnswer:
        attempt.correctAnswer,

      reasoning,
    });


  /* ----------------------------------------------------------
     Update attempt
  ---------------------------------------------------------- */

  attempts[attemptIndex] = {
    ...attempt,

    reasoning,

    misconception:
      misconception || null,
  };


  /* ----------------------------------------------------------
     Save updated attempt
  ---------------------------------------------------------- */

  localStorage.setItem(
    "smartTutor_attempts",
    JSON.stringify(attempts)
  );


  /* ----------------------------------------------------------
     Save misconception
  ---------------------------------------------------------- */

  if (
    misconception?.detected
  ) {
    saveMisconception({
      studentId:
        attempt.studentId,

      topicId:
        attempt.topicId,

      description:
        misconception.message,

      confidence:
        misconception.confidence,

      status:
        "active",

      questionId:
        attempt.questionId,

      createdAt:
        new Date().toISOString(),
    });
  }


  /* ----------------------------------------------------------
     Current mastery
  ---------------------------------------------------------- */

  const mastery =
    getTopicMastery(
      attempt.topicId
    );


  /* ----------------------------------------------------------
     Determine next action
  ---------------------------------------------------------- */

  const nextAction =
    getNextAction({
      isCorrect:
        attempt.isCorrect,

      misconception,

      mastery:
        mastery?.mastery || 0,
    });


  return {
    attempt:
      attempts[attemptIndex],

    misconception,

    nextAction,

    mastery,
  };
}


/* ============================================================
   GET STUDENT PROGRESS
============================================================ */

export function getStudentProgress(
  student
) {
  if (!student) {
    return {
      attempts: [],
      misconceptions: [],
    };
  }


  const attemptsRaw =
    localStorage.getItem(
      "smartTutor_attempts"
    );


  const misconceptionsRaw =
    localStorage.getItem(
      "smartTutor_misconceptions"
    );


  const attempts =
    attemptsRaw
      ? JSON.parse(attemptsRaw)
      : [];


  const misconceptions =
    misconceptionsRaw
      ? JSON.parse(
          misconceptionsRaw
        )
      : [];


  return {
    attempts:
      attempts.filter(
        (attempt) =>
          attempt.studentId ===
          student.id
      ),

    misconceptions:
      misconceptions.filter(
        (misconception) =>
          misconception.studentId ===
          student.id
      ),
  };
}


/* ============================================================
   GET TOPIC PROGRESS
============================================================ */

export function getTopicProgress(
  student,
  topicId
) {
  if (!student || !topicId) {
    return {
      attempts: 0,
      correct: 0,
      total: 5,
      completed: false,
      accuracy: 0,
    };
  }


  const attemptsRaw =
    localStorage.getItem(
      "smartTutor_attempts"
    );


  const attempts =
    attemptsRaw
      ? JSON.parse(attemptsRaw)
      : [];


  const topicAttempts =
    attempts.filter(
      (attempt) =>
        attempt.studentId ===
          student.id &&
        attempt.topicId ===
          topicId
    );


  const correct =
    topicAttempts.filter(
      (attempt) =>
        attempt.isCorrect
    ).length;


  return {
    attempts:
      topicAttempts.length,

    correct,

    total:
      5,

    completed:
      topicAttempts.length >= 5,

    accuracy:
      topicAttempts.length > 0
        ? correct /
          topicAttempts.length
        : 0,
  };
}


/* ============================================================
   GET LEARNING STATUS
============================================================ */

export function getLearningStatus(
  topicId
) {
  const mastery =
    getTopicMastery(
      topicId
    );


  const value =
    Number(
      mastery?.mastery || 0
    );


  if (value >= 0.85) {
    return "Strong";
  }


  if (value >= 0.7) {
    return "Confident";
  }


  if (value >= 0.4) {
    return "Developing";
  }


  return "Building";
}