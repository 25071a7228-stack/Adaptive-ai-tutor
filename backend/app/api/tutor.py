from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_gateway import generate_tutor_response, generate_vision_tutor_response

router = APIRouter(prefix="/tutor", tags=["tutor"])


class TutorMessage(BaseModel):
    student_id: str = "local-student"
    student_class: int = 3
    message: str
    topic: str | None = None
    question: str | None = None
    mode: str = "teach"


class TutorImage(BaseModel):
    student_class: int = 3
    subject: str | None = None
    topic: str | None = None
    message: str = "Read this question and teach me how to solve it step by step."
    image_data: str


def build_system_prompt(student_class: int) -> str:
    age_style = (
        "Use very simple language, short sentences, concrete examples and visual thinking."
        if student_class <= 5 else
        "Use clear school-level language, mathematical notation where useful, and step-by-step reasoning."
    )
    return (
        "You are Smart Tutor, a patient personal tutor for school students. "
        "Teach rather than behave like a generic chatbot. Never shame the learner. "
        "Do not simply dump the final answer when a hint or explanation would teach the concept. "
        "Stay focused on Mathematics and Science. " + age_style
    )


@router.post("/message")
async def tutor_message(payload: TutorMessage):
    context = (
        f"Class: {payload.student_class}\n"
        f"Topic: {payload.topic or 'not specified'}\n"
        f"Current question: {payload.question or 'not specified'}\n"
        f"Mode: {payload.mode}"
    )
    user_message = (
        f"Learner context:\n{context}\n\n"
        f"Student message: {payload.message}\n\n"
        "Respond as a helpful tutor. If the student asks for an answer, explain the reasoning as well."
    )
    response = await generate_tutor_response(build_system_prompt(payload.student_class), user_message)
    return {"message": response, "mode": payload.mode}


@router.post("/image")
async def tutor_image(payload: TutorImage):
    if not payload.image_data.startswith("data:image/"):
        raise HTTPException(400, "image_data must be a data URL such as data:image/jpeg;base64,...")

    prompt = (
        f"The learner is in Class {payload.student_class}. "
        f"Subject: {payload.subject or 'school learning'}. Topic: {payload.topic or 'unknown'}.\n\n"
        f"Learner request: {payload.message}\n\n"
        "Inspect the image carefully. Identify the visible question, equation, diagram or exercise. "
        "If the image is unclear, say exactly what is unclear instead of inventing text. "
        "Then teach the learner step by step. Include the final answer when it is appropriate, but explain why it is correct. "
        "Use child-friendly language suitable for the stated class."
    )
    response = await generate_vision_tutor_response(
        build_system_prompt(payload.student_class),
        prompt,
        payload.image_data,
    )
    return {"message": response, "mode": "image_tutor"}
