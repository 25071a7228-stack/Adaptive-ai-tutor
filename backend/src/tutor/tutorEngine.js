export function getTutorResponse(
  message,
  context = {}
) {
  const text = message.toLowerCase().trim();

  const studentClass =
    Number(context.student?.classLevel || 3);

  const question =
    context.question?.question || "";

  const topic =
    context.topic?.name || "this topic";

  const isYoungerStudent =
    studentClass <= 5;

  if (
    text.includes("hint") ||
    text.includes("help")
  ) {
    return isYoungerStudent
      ? `💡 Hint: Look at the question carefully. What information do you already know? Start with that and take one small step.`
      : `💡 Hint: Identify what the question gives you first, then identify exactly what it is asking you to find. Use the relevant rule or concept from ${topic}.`;
  }

  if (
    text.includes("why") &&
    (
      text.includes("wrong") ||
      text.includes("incorrect")
    )
  ) {
    if (context.answerResult?.correct === false) {
      return isYoungerStudent
        ? `That's okay! Your answer didn't match the expected answer. Let's look at the idea again instead of just memorising the answer.`
        : `Your answer was marked incorrect. Let's inspect the reasoning step by step and identify where the approach changed from the required concept.`;
    }

    return `Let's look at the question carefully and work through the reasoning together.`;
  }

  if (
    text.includes("explain") ||
    text.includes("understand") ||
    text.includes("don't understand")
  ) {
    return isYoungerStudent
      ? `🌱 Let's make it simple. Think about ${topic} as a small idea first. Read the question, find the important information, and solve one step at a time.`
      : `Let's break ${topic} into smaller steps. First identify the known information, then identify the rule or concept you need, and finally apply it to the question.`;
  }

  if (
    text.includes("example") ||
    text.includes("similar")
  ) {
    return isYoungerStudent
      ? `🔁 Try a simpler example first. Imagine the same idea with smaller, easier numbers. Once that makes sense, come back to the original question.`
      : `🔁 Try a similar problem with simpler values first. The goal is to recognise the same underlying concept before returning to the original question.`;
  }

  if (
    text.includes("easier") ||
    text.includes("simpler")
  ) {
    return isYoungerStudent
      ? `🌱 Let's make it easier. Ignore the extra information for a moment and focus only on what the question is asking you to find.`
      : `Let's simplify it. Strip away the unnecessary information and identify the single concept the question is testing.`;
  }

  if (
    text.includes("fraction")
  ) {
    return isYoungerStudent
      ? `🍕 Think of a fraction as equal parts of one whole. The top number tells how many parts we have, and the bottom number tells how many equal parts make the whole.`
      : `A fraction represents a ratio between a numerator and denominator. The denominator defines the equal-sized parts, while the numerator tells how many of those parts are being considered.`;
  }

  if (
    text.includes("multiply") ||
    text.includes("multiplication")
  ) {
    return isYoungerStudent
      ? `✖️ Multiplication is like adding equal groups. For example, 3 × 4 means three groups of four.`
      : `Multiplication combines equal groups. Think of the factors as defining the number of groups and the amount in each group.`;
  }

  if (
    text.includes("divide") ||
    text.includes("division")
  ) {
    return isYoungerStudent
      ? `➗ Division means sharing something equally or finding how many equal groups can be made.`
      : `Division asks either how much belongs in each equal group or how many equal groups can be formed.`;
  }

  if (
    text.includes("force") ||
    text.includes("motion")
  ) {
    return isYoungerStudent
      ? `🚗 Think of a force as a push or a pull. A push or pull can change how something moves.`
      : `Force is an interaction that can change an object's motion. Think about whether the force changes its speed, direction, or both.`;
  }

  if (
    text.includes("light")
  ) {
    return isYoungerStudent
      ? `💡 Light helps us see. When light reaches an object and then enters our eyes, we can see that object.`
      : `Light travels from a source and can interact with objects through reflection, absorption, or transmission. Consider which interaction the question describes.`;
  }

  if (
    text.includes("wrong") ||
    text.includes("mistake")
  ) {
    return `Mistakes are useful information. Let's find the step where your thinking changed, then try a similar question to make the idea stronger.`;
  }

  if (
    text.includes("answer")
  ) {
    return `I won't just give you the answer. I'll help you find it. Start by telling me what information you notice in the question.`;
  }

  if (
    context.reasoningResult?.message
  ) {
    return context.reasoningResult.message;
  }

  if (
    question
  ) {
    return isYoungerStudent
      ? `Let's work on this together. Look at the question and tell me which part you understand first.`
      : `Let's work through this question systematically. Tell me which step or concept is confusing you.`;
  }

  return `I'm here to help you learn. Try asking for a hint, an explanation, a simpler example, or why an answer is wrong.`;
}


export function getQuickTutorResponse(
  action,
  context = {}
) {
  const normalized =
    action.toLowerCase();

  if (
    normalized.includes("hint")
  ) {
    return getTutorResponse(
      "give me a hint",
      context
    );
  }

  if (
    normalized.includes("explain")
  ) {
    return getTutorResponse(
      "explain this",
      context
    );
  }

  if (
    normalized.includes("simpl")
  ) {
    return getTutorResponse(
      "make it simpler",
      context
    );
  }

  return getTutorResponse(
    action,
    context
  );
}
