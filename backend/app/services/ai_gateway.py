import base64
import os
import httpx
from dotenv import load_dotenv

load_dotenv()


async def generate_tutor_response(system_prompt: str, user_message: str) -> str:
    providers = [
        ("CEREBRAS_API_KEY", "https://api.cerebras.ai/v1/chat/completions", os.getenv("CEREBRAS_MODEL", "llama-3.3-70b")),
        ("GROQ_API_KEY", "https://api.groq.com/openai/v1/chat/completions", os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")),
        ("OPENROUTER_API_KEY", "https://openrouter.ai/api/v1/chat/completions", os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")),
    ]
    for key_name, url, model in providers:
        key = os.getenv(key_name)
        if not key:
            continue
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                        "temperature": 0.3,
                        "max_tokens": 500,
                    },
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
        except Exception:
            continue
    return "Let’s work through it together. Tell me which step feels confusing, and I’ll guide you one step at a time."


async def generate_vision_tutor_response(system_prompt: str, user_message: str, image_data_url: str) -> str:
    # OpenRouter provides an OpenAI-compatible multimodal endpoint. Keep the key on the backend.
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        return (
            "I received your image, but image understanding is not connected yet. "
            "Add OPENROUTER_API_KEY and OPENROUTER_VISION_MODEL to the backend .env, then try the photo again. "
            "You can still ask me about typed questions or use the browser voice controls."
        )

    model = os.getenv("OPENROUTER_VISION_MODEL", "google/gemini-2.0-flash-001")
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Smart Tutor",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": user_message},
                                {"type": "image_url", "image_url": {"url": image_data_url}},
                            ],
                        },
                    ],
                    "temperature": 0.2,
                    "max_tokens": 700,
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        return f"I could not read that image clearly. Please take a sharper photo with the full question visible, then try again. ({type(exc).__name__})"
