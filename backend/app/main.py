from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import random

import jwt
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from .database import engine, SessionLocal
from . import models

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
class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    if not verify_password(payload.password, user.password):
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


# --- Soru modelleri ---
class QuestionCreate(BaseModel):
    text: str
    category_id: int
    language: str                 # "tr" / "en"
    difficulty: int | None = None
    is_active: int = 1            # 1 = aktif, 0 = pasif


class QuestionUpdate(BaseModel):
    text: str | None = None
    category_id: int | None = None
    language: str | None = None
    difficulty: int | None = None
    is_active: int | None = None


# --- Soru havuzu endpoint'leri (GET/POST/PUT) ---
@app.get("/questions")
def get_questions(
    category_id: int | None = None,
    language: str | None = None,
    is_active: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Question)

    if category_id is not None:
        query = query.filter(models.Question.category_id == category_id)
    if language is not None:
        query = query.filter(models.Question.language == language)
    if is_active is not None:
        query = query.filter(models.Question.is_active == is_active)

    questions = query.all()
    return [
        {
            "id": q.id,
            "text": q.text,
            "category_id": q.category_id,
            "language": q.language,
            "difficulty": q.difficulty,
            "is_active": q.is_active,
        }
        for q in questions
    ]


@app.post("/questions")
def create_question(
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # Şimdilik herkes ekleyebilsin
):
    new_q = models.Question(
        text=payload.text,
        category_id=payload.category_id,
        language=payload.language,
        difficulty=payload.difficulty,
        is_active=payload.is_active,
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return {
        "id": new_q.id,
        "text": new_q.text,
        "category_id": new_q.category_id,
        "language": new_q.language,
        "difficulty": new_q.difficulty,
        "is_active": new_q.is_active,
    }


@app.put("/questions/{question_id}")
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Soru bulunamadı")

    if payload.text is not None:
        q.text = payload.text
    if payload.category_id is not None:
        q.category_id = payload.category_id
    if payload.language is not None:
        q.language = payload.language
    if payload.difficulty is not None:
        q.difficulty = payload.difficulty
    if payload.is_active is not None:
        q.is_active = payload.is_active

    db.commit()
    db.refresh(q)
    return {
        "id": q.id,
        "text": q.text,
        "category_id": q.category_id,
        "language": q.language,
        "difficulty": q.difficulty,
        "is_active": q.is_active,
    }


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

    # Sistem soruları seçer: domain + dildeki havuzdan en az 5, en fazla 7 rastgele
    category = db.query(models.Category).filter(models.Category.name == payload.domain).first()
    if category:
        pool = (
            db.query(models.Question)
            .filter(
                models.Question.category_id == category.id,
                models.Question.language == payload.language,
                models.Question.is_active == 1,
            )
            .all()
        )
        # En az 5, en fazla 7; havuzda daha az varsa hepsini al
        target = random.randint(5, 7)
        count = min(target, len(pool))
        if count > 0:
            chosen = random.sample(pool, count)
            for order, q in enumerate(chosen, start=1):
                iq = models.InterviewQuestion(
                    interview_id=new_interview.id,
                    question_id=q.id,
                    order=order,
                )
                db.add(iq)
            db.commit()

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