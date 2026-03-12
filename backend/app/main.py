from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import json
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend/ so it works even when uvicorn is run from project root
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

import jwt
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from .database import engine, SessionLocal
from . import models
from .analysis import stt, scoring, video_features

# JWT ayarları (üretimde env'den alınmalı)
SECRET_KEY = "sizin-gizli-anahtar-buraya-degisitirin"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 gün

security = HTTPBearer(auto_error=False)

# Tabloları oluştur
models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Uygulama açılırken: yoksa 2 kategori ekle (general, technical)
    db = SessionLocal()
    try:
        if db.query(models.Category).count() == 0:
            db.add(models.Category(name="general", description="Genel mülakat soruları"))
            db.add(models.Category(name="technical", description="Teknik sorular"))
            db.commit()
    finally:
        db.close()
    yield
    # Uygulama kapanırken (şimdilik boş)


app = FastAPI(lifespan=lifespan)

# Password hash sistemi
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# DB bağlantısı dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Giriş yapmanız gerekiyor")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Geçersiz token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    return user

# Kullanıcı oluştur
@app.post("/create-user")
def create_user(email: str, password: str, db: Session = Depends(get_db)):
    
    # Email zaten var mı kontrol
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        return {"error": "Email already registered"}

    hashed_pw = hash_password(password)

    new_user = models.User(email=email, password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "email": new_user.email
    }

# Tüm kullanıcıları listele
@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users

# Login endpoint – başarılı girişte JWT token döner
@app.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    if not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Şifre hatalı")
    token = create_access_token(data={"user_id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
    }


# --- Kategoriler (mülakat formu dropdown için) ---
@app.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).all()
    return [{"id": c.id, "name": c.name, "description": c.description} for c in categories]


class InterviewCreate(BaseModel):
    title: str
    domain: str
    language: str


@app.post("/interviews")
def create_interview(
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_interview = models.Interview(
        user_id=current_user.id,
        title=payload.title,
        domain=payload.domain,
        language=payload.language,
    )
    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    return {
        "id": new_interview.id,
        "title": new_interview.title,
        "domain": new_interview.domain,
        "language": new_interview.language,
        "status": new_interview.status,
        "created_at": new_interview.created_at,
    }


# --- Mülakat listesi (dashboard; giriş yapan kullanıcının listesi) ---
@app.get("/interviews")
def list_interviews(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    interviews = db.query(models.Interview).filter(models.Interview.user_id == current_user.id).order_by(models.Interview.created_at.desc()).all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "domain": i.domain,
            "language": i.language,
            "status": i.status,
            "created_at": i.created_at,
        }
        for i in interviews
    ]


# --- Tek mülakat detayı (sorular, transcript, feedback dahil) ---
@app.get("/interviews/{interview_id}")
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Mülakat bulunamadı")
    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu mülakata erişim yetkiniz yok")
    # Sorular (interview_questions + questions)
    iqs = db.query(models.InterviewQuestion).filter(models.InterviewQuestion.interview_id == interview_id).order_by(models.InterviewQuestion.order).all()
    questions = []
    for iq in iqs:
        q = db.query(models.Question).filter(models.Question.id == iq.question_id).first()
        if q:
            questions.append({"order": iq.order, "text": q.text})
    # Transcript
    transcript_row = db.query(models.Transcript).filter(models.Transcript.interview_id == interview_id).first()
    transcript = transcript_row.text if transcript_row else None
    duration = transcript_row.duration_seconds if transcript_row else None
    # Feedback
    feedback_row = db.query(models.Feedback).filter(models.Feedback.interview_id == interview_id).first()
    feedback = None
    if feedback_row:
        feedback = {
            "scores_json": feedback_row.scores_json,
            "summary": feedback_row.summary,
            "strengths": feedback_row.strengths,
            "improvements": feedback_row.improvements,
        }
    return {
        "id": interview.id,
        "user_id": interview.user_id,
        "title": interview.title,
        "domain": interview.domain,
        "language": interview.language,
        "status": interview.status,
        "created_at": interview.created_at,
        "questions": questions,
        "transcript": transcript,
        "duration_seconds": duration,
        "feedback": feedback,
    }


# --- Video upload endpoint (skeleton) ---
@app.post("/interviews/{interview_id}/video")
async def upload_interview_video(
    interview_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this interview")

    # Ensure upload directory exists: uploads/interviews/{id}/
    base_dir = Path("uploads") / "interviews" / str(interview_id)
    base_dir.mkdir(parents=True, exist_ok=True)

    # Build a safe file path
    original_name = Path(file.filename or "video.mp4").name
    target_path = base_dir / original_name

    # Save file to disk
    with target_path.open("wb") as out_file:
        content = await file.read()
        out_file.write(content)

    # Store relative path on the interview record
    interview.video_path = str(target_path)
    db.add(interview)
    db.commit()
    db.refresh(interview)

    return {
        "status": "video upload - OK",
        "filename": original_name,
        "stored_path": interview.video_path,
    }


# --- Interview analysis endpoint ---
@app.post("/interviews/{interview_id}/analyze")
def analyze_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this interview")

    # 1) Transcript (dummy if video/API missing; real via Whisper otherwise)
    text, duration_seconds, stt_fallback_reason, stt_error_detail = stt.get_transcript(
        interview_id=interview_id,
        video_path=interview.video_path,
    )

    # 2) Upsert into Transcript table
    transcript_row = db.query(models.Transcript).filter(models.Transcript.interview_id == interview_id).first()
    if transcript_row:
        transcript_row.text = text
        transcript_row.duration_seconds = duration_seconds
    else:
        transcript_row = models.Transcript(
            interview_id=interview_id,
            text=text,
            duration_seconds=duration_seconds,
        )
        db.add(transcript_row)

    # 3) Rule-based scoring (transcript) + basic video metrics
    feedback_data = scoring.score_transcript(text, duration_seconds=duration_seconds)

    video_metrics = {}
    if interview.video_path:
        try:
            video_metrics = video_features.extract_features(interview.video_path)
        except Exception:
            video_metrics = {}

    # Merge scores + video metrics into a single dict for storage
    combined_scores = dict(feedback_data.get("scores", {}))
    combined_scores["video_metrics"] = video_metrics
    scores_json = json.dumps(combined_scores, ensure_ascii=False)

    feedback_row = db.query(models.Feedback).filter(models.Feedback.interview_id == interview_id).first()
    if feedback_row:
        feedback_row.scores_json = scores_json
        feedback_row.summary = feedback_data.get("summary")
        feedback_row.strengths = feedback_data.get("strengths")
        feedback_row.improvements = feedback_data.get("improvements")
    else:
        feedback_row = models.Feedback(
            interview_id=interview_id,
            scores_json=scores_json,
            summary=feedback_data.get("summary"),
            strengths=feedback_data.get("strengths"),
            improvements=feedback_data.get("improvements"),
        )
        db.add(feedback_row)

    db.commit()

    return {
        "status": "analyze - OK",
        "transcript": transcript_row.text,
        "duration_seconds": transcript_row.duration_seconds,
        "scores": combined_scores,
        "summary": feedback_data.get("summary"),
        "strengths": feedback_data.get("strengths"),
        "improvements": feedback_data.get("improvements"),
        "stt_fallback_reason": stt_fallback_reason,
        "stt_error_detail": stt_error_detail,
    }