import { useEffect, useMemo, useRef, useState } from "react";
import { getTutorResponse, getQuickTutorResponse } from "./tutorEngine";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function toDataUrl(source) {
  if (!source) return null;
  if (source.startsWith("data:")) return source;
  const response = await fetch(source);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function TutorPanel({
  open,
  onClose,
  student,
  question,
  selectedTopic,
  answerResult,
  reasoningResult,
  image,
  voiceTranscript,
  onClearImage,
}) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const processedVoice = useRef("");
  const processedImage = useRef("");

  const context = useMemo(() => ({
    student,
    question,
    topic: selectedTopic,
    answerResult,
    reasoningResult,
  }), [student, question, selectedTopic, answerResult, reasoningResult]);

  useEffect(() => {
    if (!open) return;
    if (messages.length === 0) {
      const welcome = image
        ? "I can see your question image. I’ll try to read it and explain it step by step."
        : voiceTranscript
          ? "I heard your question. Let’s work through it together."
          : answerResult?.correct === false
            ? "That’s okay. Let’s understand the idea step by step. I can give you a hint without giving away the answer."
            : "Hi! 👋 I’m Smart Tutor. Ask for a hint, an explanation, a simpler example, or help with your question.";
      setMessages([{ role: "tutor", text: welcome }]);
    }
  }, [open, image, voiceTranscript, answerResult, messages.length]);

  const callTutor = async (text, imageData = null) => {
    const clean = text.trim();
    if (!clean && !imageData) return;
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      ...(clean ? [{ role: "user", text: clean }] : []),
    ]);

    try {
      let response;
      if (imageData) {
        response = await fetch(`${API_BASE}/api/tutor/image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_class: student?.classLevel || 3,
            subject: selectedTopic?.subjectName || "",
            topic: selectedTopic?.name || question?.topicName || "",
            message: clean || "Read this question and teach me how to solve it.",
            image_data: imageData,
          }),
        });
      } else {
        response = await fetch(`${API_BASE}/api/tutor/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: student?.id || "local-student",
            student_class: student?.classLevel || 3,
            message: clean,
            topic: selectedTopic?.name || question?.topicName || "",
            question: question?.question || "",
            mode: "teach",
          }),
        });
      }

      if (!response.ok) throw new Error("Tutor API unavailable");
      const data = await response.json();
      const answer = data.message || data.answer || "Let’s work through it together.";
      setMessages((prev) => [...prev, { role: "tutor", text: answer }]);
      return answer;
    } catch (error) {
      const fallback = getTutorResponse(clean || "explain this image", {
        ...context,
        imageAttached: Boolean(imageData),
      });
      setMessages((prev) => [...prev, {
        role: "tutor",
        text: imageData
          ? `${fallback}\n\nFor full image understanding, add a vision-model API key to the backend. The image is still attached to this Tutor session.`
          : fallback,
      }]);
      return fallback;
    } finally {
      setBusy(false);
      setMessage("");
    }
  };

  useEffect(() => {
    if (!open || !voiceTranscript || processedVoice.current === voiceTranscript) return;
    processedVoice.current = voiceTranscript;
    callTutor(voiceTranscript);
  }, [open, voiceTranscript]);

  useEffect(() => {
    if (!open || !image || processedImage.current === image) return;
    processedImage.current = image;
    (async () => {
      try {
        const dataUrl = await toDataUrl(image);
        await callTutor("Read this image, identify the question, and explain the answer step by step.", dataUrl);
      } catch {
        setMessages((prev) => [...prev, { role: "tutor", text: "I received the image, but I couldn’t prepare it for analysis. Try another photo with the question clearly visible." }]);
      }
    })();
  }, [open, image]);

  const sendMessage = () => callTutor(message);

  const handleQuickAction = (action) => {
    const text = action === "Hint"
      ? "Give me a hint without giving away the answer."
      : action === "Explain"
        ? "Explain this step by step."
        : "Explain this in a simpler way.";
    callTutor(text);
  };

  const speak = (text, index) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = Number(student?.classLevel || 3) <= 5 ? 0.9 : 0.95;
    utterance.onend = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  if (!open) return null;

  return (
    <div className="tutor-overlay">
      <div className="tutor-panel">
        <div className="tutor-header">
          <div className="tutor-avatar">🧠</div>
          <div className="tutor-title">
            <strong>Smart Tutor</strong>
            <span>{image ? "Image + Tutor" : "Text + Voice Tutor"}</span>
          </div>
          <button className="tutor-close" onClick={onClose}>×</button>
        </div>

        {image && (
          <div className="tutor-image-context">
            <div className="small-label">IMAGE CONTEXT</div>
            <img src={image} alt="Question supplied to Smart Tutor" />
            <button className="tutor-clear-image" onClick={onClearImage}>Remove image</button>
          </div>
        )}

        <div className="tutor-messages">
          {messages.map((item, index) => (
            <div key={index} className={item.role === "user" ? "tutor-message tutor-user" : "tutor-message tutor-bot"}>
              <span>{item.text}</span>
              {item.role === "tutor" && (
                <button className="tutor-speak" onClick={() => speak(item.text, index)} title="Read aloud">
                  {speakingIndex === index ? "⏸" : "🔊"}
                </button>
              )}
            </div>
          ))}
          {busy && <div className="tutor-thinking">Smart Tutor is thinking…</div>}
        </div>

        <div className="tutor-quick-actions">
          <button onClick={() => handleQuickAction("Hint")} disabled={busy}>💡 Hint</button>
          <button onClick={() => handleQuickAction("Explain")} disabled={busy}>🧠 Explain</button>
          <button onClick={() => handleQuickAction("Simpler")} disabled={busy}>🌱 Simpler</button>
        </div>

        <div className="tutor-input-row">
          <input
            type="text"
            value={message}
            placeholder="Ask about this question…"
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }}
            disabled={busy}
          />
          <button onClick={sendMessage} disabled={busy || !message.trim()}>➤</button>
        </div>
        <div className="tutor-footer-note">🎤 Speak from the main Tutor controls · 🔊 Listen to any explanation</div>
      </div>
    </div>
  );
}
