from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime, timedelta
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    is_admin = Column(Integer, default=0)

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    full_name = Column(String(255), nullable=True)
    university = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    class_year = Column(String(20), nullable=True)
    cv_path = Column(String(512), nullable=True)

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    domain = Column(String(100), nullable=False)
    language = Column(String(20), nullable=False)
    status = Column(String(50), default="created")
    created_at = Column(DateTime, default=datetime.utcnow)
    video_path = Column(String, nullable=True)    # path of uploaded interview video

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(255), nullable=True)

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(1024), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    language = Column(String(10), nullable=False)
    difficulty = Column(Integer, nullable=True)
    is_active = Column(Integer, default=1)

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    order = Column(Integer, nullable=False)

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    text = Column(String(5000), nullable=False)
    duration_seconds = Column(Integer, nullable=True)

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    scores_json = Column(String(5000), nullable=True)
    summary = Column(String(1000), nullable=True)
    strengths = Column(String(2000), nullable=True)
    improvements = Column(String(2000), nullable=True)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False, default=lambda: datetime.utcnow() + timedelta(hours=1))
    used = Column(Integer, default=0)