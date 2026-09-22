import React, { useEffect, useMemo, useState } from "react";
import questions from "./data/questions";
import "./index.css";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const OLLAMA_MODEL = "qwen3:4b";

const SUBJECTS = [
  {
    id: "math",
    name: "Mathematics",
    icon: "∑",
    description: "Numbers, patterns, equations and problem solving",
  },
  {
    id: "science",
    name: "Science",
    icon: "🔬",
    description: "Explore how the world around you works",
  },
];

const TOPIC_NAMES = {
  "c3-math-numbers": "Numbers",
  "c3-math-addition": "Addition",
  "c3-math-multiplication": "Multiplication",
  "c3-math-division": "Division",
  "c3-math-shapes": "Shapes",
  "c3-math-measurement": "Measurement",

  "c3-science-plants": "Plants",
  "c3-science-animals": "Animals",
  "c3-science-body": "Our Body",
  "c3-science-matter": "Matter",
  "c3-science-earth": "Earth",
  "c3-science-environment": "Environment",

  "c8-math-rational": "Rational Numbers",
  "c8-math-linear": "Linear Equations",
  "c8-math-exponents": "Exponents and Powers",
  "c8-math-quadrilaterals": "Quadrilaterals",
  "c8-math-data": "Data Handling",
  "c8-math-percentage": "Percentage",

  "c8-science-cells": "Cells",
  "c8-science-force": "Force and Pressure",
  "c8-science-light": "Light",
  "c8-science-sound": "Sound",
  "c8-science-chemistry": "Chemical Effects",
  "c8-science-body": "Human Body",
};

function getTopicName(topicId) {
  return TOPIC_NAMES[topicId] || topicId;
}

function cleanModelText(text = "") {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\|im_end\|>/gi, "")
    .replace(/<\|assistant\|>/gi, "")
    .trim();
}

function localTutorFallback({
  mode,
  selectedAnswer,
  correctAnswer,
  explanation,
}) {
  if (mode === "hint") {
    return "Think about the important clues in the question. Break the problem into smaller steps before choosing your answer.";
  }

  if (mode === "simpler") {
    return `Let's make it simpler. Break the concept into small steps. ${
      explanation || ""
    }`;
  }

  if (
    selectedAnswer &&
    correctAnswer &&
    selectedAnswer !== correctAnswer
  ) {
    return `Your answer was "${selectedAnswer}". That's okay — mistakes help us learn. Let's understand the concept and try again.`;
  }

  return explanation || "Let's work through the concept step by step.";
}

export default function App() {
  const [screen, setScreen] = useState("login");

  const [student, setStudent] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("smarttutor_student")
      );
    } catch {
      return null;
    }
  });

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [classLevel, setClassLevel] = useState("3");

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [results, setResults] = useState([]);

  const [targetDifficulty, setTargetDifficulty] = useState(1);

  const [tutorMessages, setTutorMessages] = useState([]);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState(false);

  const currentQuestion = sessionQuestions[currentIndex];

  /* =========================================================
     OLLAMA STATUS
     ========================================================= */

  useEffect(() => {
    const checkOllama = async () => {
      try {
        const response = await fetch(
          "http://localhost:11434/api/tags"
        );

        if (!response.ok) {
          throw new Error("Ollama unavailable");
        }

        const data = await response.json();

        const modelExists = data.models?.some(
          (model) =>
            model.name === OLLAMA_MODEL ||
            model.name?.startsWith("qwen3:4b")
        );

        setOllamaOnline(Boolean(modelExists));
      } catch {
        setOllamaOnline(false);
      }
    };

    checkOllama();

    const interval = setInterval(checkOllama, 10000);

    return () => clearInterval(interval);
  }, []);

  /* =========================================================
     LOGIN
     ========================================================= */

  const handleLogin = (event) => {
    event.preventDefault();

    if (!name.trim() || !age || !classLevel) {
      return;
    }

    const newStudent = {
      name: name.trim(),
      age: Number(age),
      classLevel: Number(classLevel),
    };

    localStorage.setItem(
      "smarttutor_student",
      JSON.stringify(newStudent)
    );

    setStudent(newStudent);
    setScreen("home");
  };

  /* =========================================================
     LOGOUT
     ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem("smarttutor_student");

    setStudent(null);
    setName("");
    setAge("");
    setClassLevel("3");

    setSelectedSubject(null);
    setSelectedTopic(null);

    setSessionQuestions([]);
    setCurrentIndex(0);

    setSelectedAnswer(null);
    setSubmitted(false);

    setResults([]);
    setTargetDifficulty(1);

    setTutorMessages([]);
    setTutorInput("");
    setTutorOpen(false);

    setScreen("login");
  };

  /* =========================================================
     TOPICS
     ========================================================= */

  const topics = useMemo(() => {
    if (!student || !selectedSubject) {
      return [];
    }

    const topicMap = new Map();

    questions.forEach((question) => {
      if (
        Number(question.classLevel) ===
          Number(student.classLevel) &&
        question.subjectId === selectedSubject
      ) {
        if (!topicMap.has(question.topicId)) {
          topicMap.set(question.topicId, {
            id: question.topicId,
            name: getTopicName(question.topicId),
            questionCount: 0,
          });
        }

        topicMap.get(question.topicId).questionCount += 1;
      }
    });

    return Array.from(topicMap.values());
  }, [student, selectedSubject]);

  /* =========================================================
     SUBJECT
     ========================================================= */

  const chooseSubject = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedTopic(null);
    setScreen("topics");
  };

  /* =========================================================
     TOPIC
     ========================================================= */

  const chooseTopic = (topicId) => {
    if (!student) return;

    const topicQuestions = questions
      .filter(
        (question) =>
          Number(question.classLevel) ===
            Number(student.classLevel) &&
          question.subjectId === selectedSubject &&
          question.topicId === topicId
      )
      .sort((a, b) => a.difficulty - b.difficulty);

    if (!topicQuestions.length) {
      return;
    }

    setSelectedTopic(topicId);
    setSessionQuestions(topicQuestions);
    setCurrentIndex(0);

    setSelectedAnswer(null);
    setSubmitted(false);
    setResults([]);

    setTargetDifficulty(
      topicQuestions[0].difficulty || 1
    );

    setTutorMessages([]);
    setTutorInput("");
    setTutorOpen(false);

    setScreen("question");
  };

  /* =========================================================
     CHECK ANSWER
     ========================================================= */

  const handleCheckAnswer = () => {
    if (
      !currentQuestion ||
      selectedAnswer === null ||
      submitted
    ) {
      return;
    }

    const isCorrect =
      selectedAnswer === currentQuestion.correctAnswer;

    setSubmitted(true);

    if (isCorrect) {
      setTargetDifficulty((previous) =>
        Math.min(3, previous + 1)
      );
    } else {
      setTargetDifficulty((previous) =>
        Math.max(1, previous - 1)
      );
    }

    setResults((previous) => [
      ...previous,
      {
        questionId: currentQuestion.id,
        correct: isCorrect,
        selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
      },
    ]);
  };

  /* =========================================================
     NEXT QUESTION
     ========================================================= */

  const handleNextQuestion = () => {
    if (!currentQuestion) {
      return;
    }

    const remaining = sessionQuestions.filter(
      (_, index) => index > currentIndex
    );

    if (!remaining.length) {
      setScreen("complete");
      return;
    }

    const sorted = [...remaining].sort(
      (a, b) =>
        Math.abs(a.difficulty - targetDifficulty) -
        Math.abs(b.difficulty - targetDifficulty)
    );

    const nextQuestion = sorted[0];

    const nextIndex = sessionQuestions.findIndex(
      (question) => question.id === nextQuestion.id
    );

    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setSubmitted(false);

    setTutorMessages([]);
    setTutorInput("");
  };

  /* =========================================================
     OLLAMA TUTOR
     ========================================================= */

  const askTutor = async (
    mode = "explain",
    customRequest = ""
  ) => {
    if (!currentQuestion || tutorLoading) {
      return;
    }

    setTutorLoading(true);

    const request =
      customRequest ||
      tutorInput.trim() ||
      "Explain this question to me.";

    const prompt = `
You are Smart Tutor, an adaptive AI teacher.

Student:
Name: ${student?.name || ""}
Age: ${student?.age || ""}
Class: ${student?.classLevel || ""}

Subject:
${
  selectedSubject === "math"
    ? "Mathematics"
    : "Science"
}

Topic:
${getTopicName(currentQuestion.topicId)}

Question:
${currentQuestion.question}

Options:
${currentQuestion.options?.join(", ") || "No options"}

Correct Answer:
${currentQuestion.correctAnswer}

Student Answer:
${selectedAnswer || "Not answered"}

Teacher Explanation:
${currentQuestion.explanation || ""}

Student Request:
${request}

Teaching Rules:
- Teach at the student's class level.
- Be encouraging and patient.
- Never shame the student.
- Explain the concept, not just the answer.
- Use short, clear steps.
- If asked for a hint, do not immediately reveal the answer.
- If the student is wrong, explain the mistake gently.
- Use a simple example when helpful.
- Keep the response under 120 words.
- Do not include <think> tags.
`;

    /* =======================================================
       OLLAMA REQUEST
       ======================================================= */

    if (ollamaOnline) {
      try {
        const response = await fetch(
          OLLAMA_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: OLLAMA_MODEL,
              stream: false,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a patient adaptive school tutor.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              options: {
                temperature: 0.3,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Ollama request failed"
          );
        }

        const data = await response.json();

        const answer = cleanModelText(
          data.message?.content || ""
        );

        if (answer) {
          setTutorMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              text: answer,
            },
          ]);

          setTutorInput("");
          setTutorLoading(false);

          return;
        }
      } catch (error) {
        console.error(
          "Ollama error:",
          error
        );
      }
    }

    /* =======================================================
       LOCAL FALLBACK
       ======================================================= */

    const fallback = localTutorFallback({
      mode,
      selectedAnswer,
      correctAnswer:
        currentQuestion.correctAnswer,
      explanation:
        currentQuestion.explanation,
    });

    setTutorMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        text: fallback,
      },
    ]);

    setTutorInput("");
    setTutorLoading(false);
  };

  /* =========================================================
     TUTOR QUICK ACTIONS
     ========================================================= */

  const tutorAction = (mode) => {
    if (mode === "hint") {
      askTutor(
        "hint",
        "Give me a small hint without telling me the final answer."
      );
    }

    if (mode === "explain") {
      askTutor(
        "explain",
        "Explain this question step by step."
      );
    }

    if (mode === "simpler") {
      askTutor(
        "simpler",
        "Explain this in the simplest possible way using an everyday example."
      );
    }
  };

  /* =========================================================
     TUTOR INPUT
     ========================================================= */

  const handleTutorSubmit = (event) => {
    event.preventDefault();

    if (!tutorInput.trim()) {
      return;
    }

    const message = tutorInput.trim();

    setTutorMessages((previous) => [
      ...previous,
      {
        role: "user",
        text: message,
      },
    ]);

    askTutor("explain", message);
  };

  /* =========================================================
     HEADER
     ========================================================= */

  const Header = () => (
    <header className="header">
      <div
        className="brand"
        onClick={() => setScreen("home")}
      >
        <div className="brand-logo">✦</div>

        <div className="brand-text">
          <strong>Smart Tutor</strong>
          <span>Adaptive Learning</span>
        </div>
      </div>

      <div className="header-right">
        <div className="student-info">
          <div className="student-avatar">
            {(student?.name || "S")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="student-details">
            <strong>{student?.name}</strong>

            <span>
              Class {student?.classLevel}
            </span>
          </div>
        </div>

        <div
          className={`ai-status ${
            ollamaOnline
              ? "online"
              : "offline"
          }`}
        >
          <span className="status-dot-small"></span>

          {ollamaOnline
            ? "AI Online"
            : "AI Offline"}
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
          title="Logout"
        >
          <span>↪</span>
          Logout
        </button>
      </div>
    </header>
  );

  /* =========================================================
     LOGIN
     ========================================================= */

  if (screen === "login") {
    return (
      <main className="page login-page">
        <form
          className="login-card"
          onSubmit={handleLogin}
        >
          <div className="brand-mark">
            ✦
          </div>

          <h1>Smart Tutor</h1>

          <p className="muted">
            Your adaptive AI learning
            companion
          </p>

          <label>
            Your name

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter your name"
            />
          </label>

          <label>
            Your age

            <input
              type="number"
              min="5"
              max="18"
              value={age}
              onChange={(event) =>
                setAge(
                  event.target.value
                )
              }
              placeholder="Enter your age"
            />
          </label>

          <label>
            Your class

            <select
              value={classLevel}
              onChange={(event) =>
                setClassLevel(
                  event.target.value
                )
              }
            >
              <option value="3">
                Class 3
              </option>

              <option value="4">
                Class 4
              </option>

              <option value="5">
                Class 5
              </option>

              <option value="6">
                Class 6
              </option>

              <option value="7">
                Class 7
              </option>

              <option value="8">
                Class 8
              </option>

              <option value="9">
                Class 9
              </option>

              <option value="10">
                Class 10
              </option>
            </select>
          </label>

          <button
            className="primary-button"
            type="submit"
          >
            Start Learning
          </button>
        </form>
      </main>
    );
  }

  /* =========================================================
     HOME
     ========================================================= */

  if (screen === "home") {
    return (
      <>
        <Header />

        <main className="page">
          <section className="page-heading">
            <p className="eyebrow">
              Welcome back,{" "}
              {student?.name}
            </p>

            <h1>
              What do you want to
              learn today?
            </h1>

            <p className="muted">
              Choose a subject and
              Smart Tutor will adapt
              the learning path to
              you.
            </p>
          </section>

          <div className="status-card">
            <div>
              <strong>
                {ollamaOnline
                  ? "Smart AI Tutor is ready"
                  : "Smart Tutor is running in offline mode"}
              </strong>

              <p>
                {ollamaOnline
                  ? "Qwen3 is connected through Ollama."
                  : "Start Ollama to enable the local AI tutor."}
              </p>
            </div>

            <span className="status-dot">
              ●
            </span>
          </div>

          <section className="subject-grid">
            {SUBJECTS.map(
              (subject) => (
                <button
                  className="subject-card"
                  key={
                    subject.id
                  }
                  onClick={() =>
                    chooseSubject(
                      subject.id
                    )
                  }
                >
                  <div className="subject-icon">
                    {
                      subject.icon
                    }
                  </div>

                  <h2>
                    {
                      subject.name
                    }
                  </h2>

                  <p>
                    {
                      subject.description
                    }
                  </p>

                  <span className="card-arrow">
                    →
                  </span>
                </button>
              )
            )}
          </section>
        </main>
      </>
    );
  }

  /* =========================================================
     TOPICS
     ========================================================= */

  if (screen === "topics") {
    const subject =
      SUBJECTS.find(
        (item) =>
          item.id ===
          selectedSubject
      );

    return (
      <>
        <Header />

        <main className="page">
          <button
            className="back-button"
            onClick={() =>
              setScreen("home")
            }
          >
            ← Back
          </button>

          <section className="page-heading">
            <p className="eyebrow">
              Class{" "}
              {student?.classLevel}
            </p>

            <h1>
              Let's explore{" "}
              {
                subject?.name
              }.
            </h1>

            <p className="muted">
              Choose a topic to
              begin your adaptive
              learning session.
            </p>
          </section>

          {topics.length > 0 ? (
            <div className="topic-list">
              {topics.map(
                (topic) => (
                  <button
                    className="topic-card"
                    key={
                      topic.id
                    }
                    onClick={() =>
                      chooseTopic(
                        topic.id
                      )
                    }
                  >
                    <div>
                      <h2>
                        {
                          topic.name
                        }
                      </h2>

                      <p>
                        {
                          topic.questionCount
                        }{" "}
                        adaptive
                        questions
                      </p>
                    </div>

                    <span>
                      →
                    </span>
                  </button>
                )
              )}
            </div>
          ) : (
            <section className="empty-state">
              <div className="empty-icon">
                📚
              </div>

              <h2>
                Content coming soon
              </h2>

              <p>
                Adaptive questions
                for this class and
                subject have not
                been added yet.
              </p>
            </section>
          )}
        </main>
      </>
    );
  }

  /* =========================================================
     QUESTION
     ========================================================= */

  if (
    screen === "question" &&
    currentQuestion
  ) {
    const isCorrect =
      submitted &&
      selectedAnswer ===
        currentQuestion.correctAnswer;

    return (
      <>
        <Header />

        <main className="page question-page">
          <div className="question-header">
            <button
              className="back-button"
              onClick={() =>
                setScreen(
                  "topics"
                )
              }
            >
              ← Topics
            </button>

            <div className="question-meta">
              <span>
                {selectedSubject ===
                "math"
                  ? "Mathematics"
                  : "Science"}
              </span>

              <span>
                •
              </span>

              <span>
                {
                  getTopicName(
                    currentQuestion.topicId
                  )
                }
              </span>

              <span className="difficulty">
                Level{" "}
                {
                  currentQuestion.difficulty
                }
              </span>
            </div>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${
                  ((currentIndex +
                    1) /
                    sessionQuestions.length) *
                  100
                }%`,
              }}
            />
          </div>

          <p className="question-count">
            Question{" "}
            {currentIndex + 1}{" "}
            of{" "}
            {
              sessionQuestions.length
            }
          </p>

          <section className="question-card">
            <h1>
              {
                currentQuestion.question
              }
            </h1>

            <div className="options">
              {currentQuestion.options?.map(
                (
                  option,
                  index
                ) => {
                  const selected =
                    selectedAnswer ===
                    option;

                  const correct =
                    submitted &&
                    option ===
                      currentQuestion.correctAnswer;

                  const wrong =
                    submitted &&
                    selected &&
                    option !==
                      currentQuestion.correctAnswer;

                  return (
                    <button
                      key={
                        option
                      }
                      className={`option ${
                        selected
                          ? "selected"
                          : ""
                      } ${
                        correct
                          ? "correct"
                          : ""
                      } ${
                        wrong
                          ? "wrong"
                          : ""
                      }`}
                      disabled={
                        submitted
                      }
                      onClick={() =>
                        setSelectedAnswer(
                          option
                        )
                      }
                    >
                      <span className="option-letter">
                        {String.fromCharCode(
                          65 +
                            index
                        )}
                      </span>

                      <span>
                        {
                          option
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {!submitted && (
              <button
                className="primary-button check-button"
                disabled={
                  selectedAnswer ===
                  null
                }
                onClick={
                  handleCheckAnswer
                }
              >
                Check Answer
              </button>
            )}

            {submitted && (
              <div
                className={`feedback ${
                  isCorrect
                    ? "feedback-correct"
                    : "feedback-wrong"
                }`}
              >
                <strong>
                  {isCorrect
                    ? "Correct! 🎉"
                    : "Not quite — let's learn from it."}
                </strong>

                {!isCorrect && (
                  <p>
                    The correct
                    answer is{" "}
                    <strong>
                      {
                        currentQuestion.correctAnswer
                      }
                    </strong>
                    .
                  </p>
                )}

                <p>
                  {
                    currentQuestion.explanation
                  }
                </p>
              </div>
            )}

            {submitted && (
              <button
                className="primary-button next-button"
                onClick={
                  handleNextQuestion
                }
              >
                {currentIndex +
                  1 <
                sessionQuestions.length
                  ? "Next Question →"
                  : "Finish Session"}
              </button>
            )}
          </section>
        </main>

        {/* ===================================================
            SMART TUTOR
            =================================================== */}

        <button
          className="chat-fab"
          onClick={() =>
            setTutorOpen(
              (previous) =>
                !previous
            )
          }
        >
          ✦
        </button>

        {tutorOpen && (
          <section className="chat-window">
            <div className="chat-header">
              <div>
                <strong>
                  Smart Tutor
                </strong>

                <small>
                  {ollamaOnline
                    ? "Qwen3 • Online"
                    : "Offline Learning Assistant"}
                </small>
              </div>

              <button
                onClick={() =>
                  setTutorOpen(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="chat-messages">
              {tutorMessages.length ===
                0 && (
                <div className="chat-message assistant">
                  Need help with
                  this question?
                  Ask me anything.
                </div>
              )}

              {tutorMessages.map(
                (
                  message,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    className={`chat-message ${message.role}`}
                  >
                    {
                      message.text
                    }
                  </div>
                )
              )}

              {tutorLoading && (
                <div className="chat-message assistant">
                  Thinking…
                </div>
              )}
            </div>

            <div className="chat-actions">
              <button
                onClick={() =>
                  tutorAction(
                    "hint"
                  )
                }
              >
                Hint
              </button>

              <button
                onClick={() =>
                  tutorAction(
                    "explain"
                  )
                }
              >
                Explain
              </button>

              <button
                onClick={() =>
                  tutorAction(
                    "simpler"
                  )
                }
              >
                Simpler
              </button>
            </div>

            <form
              className="chat-input-row"
              onSubmit={
                handleTutorSubmit
              }
            >
              <input
                value={
                  tutorInput
                }
                onChange={(
                  event
                ) =>
                  setTutorInput(
                    event.target
                      .value
                  )
                }
                placeholder="Ask your tutor..."
              />

              <button type="submit">
                →
              </button>
            </form>
          </section>
        )}
      </>
    );
  }

  /* =========================================================
     COMPLETE
     ========================================================= */

  if (screen === "complete") {
    const correctCount =
      results.filter(
        (result) =>
          result.correct
      ).length;

    const accuracy =
      results.length
        ? Math.round(
            (correctCount /
              results.length) *
              100
          )
        : 0;

    return (
      <>
        <Header />

        <main className="page">
          <section className="completion-card">
            <div className="completion-icon">
              🎯
            </div>

            <h1>
              Session Complete!
            </h1>

            <p className="muted">
              Great work,{" "}
              {student?.name}.
            </p>

            <div className="result-grid">
              <div>
                <strong>
                  {
                    correctCount
                  }
                </strong>

                <span>
                  Correct
                </span>
              </div>

              <div>
                <strong>
                  {
                    results.length
                  }
                </strong>

                <span>
                  Questions
                </span>
              </div>

              <div>
                <strong>
                  {accuracy}%
                </strong>

                <span>
                  Accuracy
                </span>
              </div>
            </div>

            <button
              className="primary-button"
              onClick={() =>
                setScreen(
                  "topics"
                )
              }
            >
              Continue
              Learning
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                setScreen(
                  "home"
                )
              }
            >
              Back to Home
            </button>
          </section>
        </main>
      </>
    );
  }

  return null;
}