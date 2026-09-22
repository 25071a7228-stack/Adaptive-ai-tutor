// src/services/offlineStorage.js

const STUDENT_KEY = "smartTutor_student";
const PROGRESS_KEY = "smartTutor_progress";
const ATTEMPTS_KEY = "smartTutor_attempts";
const MISCONCEPTIONS_KEY = "smartTutor_misconceptions";

/* -----------------------------
   STUDENT
----------------------------- */

export function saveStudent(student) {
  localStorage.setItem(
    STUDENT_KEY,
    JSON.stringify(student)
  );
}

export function getStudent() {
  const data = localStorage.getItem(STUDENT_KEY);

  return data ? JSON.parse(data) : null;
}

export function clearStudent() {
  localStorage.removeItem(STUDENT_KEY);
}


/* -----------------------------
   PROGRESS / MASTERY
----------------------------- */

export function saveProgress(progress) {
  localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify(progress)
  );
}

export function getProgress() {
  const data = localStorage.getItem(PROGRESS_KEY);

  return data ? JSON.parse(data) : {};
}


/**
 * Get mastery for one topic.
 */
export function getTopicMastery(topicId) {
  const progress = getProgress();

  return (
    progress[topicId] || {
      topicId,
      mastery: 0,
      confidence: 0,
      attempts: 0,
      correctAttempts: 0,
      difficulty: 1,
      lastPracticed: null,
    }
  );
}


/**
 * Save mastery for one topic.
 */
export function saveTopicMastery(
  topicId,
  mastery
) {
  const progress = getProgress();

  progress[topicId] = {
    ...mastery,
    topicId,
  };

  saveProgress(progress);

  return progress[topicId];
}


/* -----------------------------
   ATTEMPTS
----------------------------- */

export function getAttempts() {
  const data = localStorage.getItem(
    ATTEMPTS_KEY
  );

  return data ? JSON.parse(data) : [];
}


export function saveAttempt(attempt) {
  const attempts = getAttempts();

  attempts.push(attempt);

  localStorage.setItem(
    ATTEMPTS_KEY,
    JSON.stringify(attempts)
  );

  return attempt;
}


export function getTopicAttempts(topicId) {
  return getAttempts().filter(
    (attempt) =>
      attempt.topicId === topicId
  );
}


export function getAttemptedQuestionIds(
  topicId
) {
  return getTopicAttempts(topicId).map(
    (attempt) =>
      attempt.questionId
  );
}


/* -----------------------------
   MISCONCEPTIONS
----------------------------- */

export function getMisconceptions() {
  const data = localStorage.getItem(
    MISCONCEPTIONS_KEY
  );

  return data ? JSON.parse(data) : [];
}


export function saveMisconception(
  misconception
) {
  const misconceptions =
    getMisconceptions();

  misconceptions.push({
    ...misconception,
    createdAt:
      new Date().toISOString(),
  });

  localStorage.setItem(
    MISCONCEPTIONS_KEY,
    JSON.stringify(misconceptions)
  );
}


export function getTopicMisconceptions(
  topicId
) {
  return getMisconceptions().filter(
    (item) =>
      item.topicId === topicId
  );
}


/* -----------------------------
   RESET
----------------------------- */

export function resetLearningData() {
  localStorage.removeItem(
    PROGRESS_KEY
  );

  localStorage.removeItem(
    ATTEMPTS_KEY
  );

  localStorage.removeItem(
    MISCONCEPTIONS_KEY
  );
}


/**
 * Complete reset.
 *
 * Useful during development/demo testing.
 */
export function resetEverything() {
  localStorage.removeItem(
    STUDENT_KEY
  );

  localStorage.removeItem(
    PROGRESS_KEY
  );

  localStorage.removeItem(
    ATTEMPTS_KEY
  );

  localStorage.removeItem(
    MISCONCEPTIONS_KEY
  );
}