export const tutorVisuals = {
  math: {
    fraction: "🍕",
    multiplication: "✖️",
    division: "➗",
    geometry: "📐",
    numbers: "🔢",
    algebra: "🔤",
  },

  science: {
    force: "💪",
    motion: "🚗",
    light: "💡",
    matter: "🧊",
    living: "🌱",
    body: "🫀",
  },

  default: "🧠",
};


export function getTutorVisual(topic = "") {
  const text =
    topic.toLowerCase();

  if (text.includes("fraction")) {
    return tutorVisuals.math.fraction;
  }

  if (text.includes("multiplication")) {
    return tutorVisuals.math.multiplication;
  }

  if (text.includes("division")) {
    return tutorVisuals.math.division;
  }

  if (text.includes("geometry")) {
    return tutorVisuals.math.geometry;
  }

  if (text.includes("algebra")) {
    return tutorVisuals.math.algebra;
  }

  if (
    text.includes("force") ||
    text.includes("motion")
  ) {
    return tutorVisuals.science.force;
  }

  if (text.includes("light")) {
    return tutorVisuals.science.light;
  }

  if (text.includes("matter")) {
    return tutorVisuals.science.matter;
  }

  if (
    text.includes("living") ||
    text.includes("plants")
  ) {
    return tutorVisuals.science.living;
  }

  if (
    text.includes("body") ||
    text.includes("human")
  ) {
    return tutorVisuals.science.body;
  }

  return tutorVisuals.default;
}
