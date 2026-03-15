import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Varsayılan: lokal geliştirme için SQLite.
# DATABASE_URL ortam değişkeni ile MySQL veya başka bir DB'ye geçebilirsin.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Sadece SQLite için check_same_thread gerekiyor.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
