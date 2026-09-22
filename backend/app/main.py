from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.tutor import router as tutor_router

app = FastAPI(title="Smart Tutor AI Tutor API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tutor_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Smart Tutor AI Tutor API is running"}


@app.get("/health")
def health():
    return {"status": "ok", "database": False, "features": ["text_tutor", "voice_context", "image_tutor"]}
