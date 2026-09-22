# Smart Tutor — No-Database Prototype

Smart Tutor is a curated personalized-learning prototype for Classes 3–10. The class selector shows Classes 3–10, while the current question bank contains learning content only for Classes 3 and 8.

## Current learning content
- Class 3: age-appropriate Mathematics and Science questions
- Class 8: age-appropriate Mathematics and Science questions
- 5-question topic sessions
- Reasoning/reflection after answers
- Visual explanations for incorrect answers
- Similar-question retry flow
- End-of-session learning reflection

## Smart Tutor modes
- Text chat
- Voice input using browser Speech Recognition
- Read-aloud using browser Speech Synthesis
- Camera capture / image upload
- Image-question tutoring through the optional FastAPI vision endpoint

## Run the frontend
```bash
cd backend
npm install
npm run dev
```
Open http://localhost:5173

## Run the optional AI backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/health

The backend does **not** require Supabase or a database in this version. It only provides the optional AI Tutor endpoints.

## Environment
Copy `backend/.env.example` to `backend/.env`.

For typed AI tutoring, provide one supported text-provider key.
For image/camera understanding, provide:
```env
OPENROUTER_API_KEY=your_key
OPENROUTER_VISION_MODEL=google/gemini-2.0-flash-001
```
Keep all AI keys in the backend `.env`; never use `VITE_*` for secrets.

## Browser permissions
- Voice requires microphone permission and browser Speech Recognition support.
- Camera requires camera permission and HTTPS or localhost.
- Voice read-aloud uses the browser's Speech Synthesis API.

## Architecture
```text
React / Vite
   |
   +-- Local curated question bank
   |      +-- Class 3
   |      +-- Class 8
   |
   +-- Local learning / reflection / visual explanation
   |
   +-- Smart Tutor UI
          +-- Text -> /api/tutor/message
          +-- Voice -> speech-to-text -> Tutor
          +-- Image -> /api/tutor/image -> vision model
          +-- Tutor response -> optional read-aloud
```
