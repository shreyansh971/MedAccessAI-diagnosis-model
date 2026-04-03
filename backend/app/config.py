# backend/app/config.py
"""
Centralised configuration — reads from environment / .env file.
Never hard-code secrets; use .env.example as a template.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Application
    DEBUG: bool = False
    SECRET_KEY: str                        # RS256 private key PEM or HS256 secret
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    ALLOWED_ORIGINS: List[str] = ["https://medaccess.yourdomain.com"]

    # Model
    MODEL_PATH: str = "models/resnet50_chest.keras"
    CONFIDENCE_THRESHOLD: float = 0.5

    # Database
    DATABASE_URL: str                       # postgresql+asyncpg://user:pass@host/db

    # Storage (AWS S3 example; swap for GCS if needed)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "us-east-1"
    PRESIGNED_URL_EXPIRY: int = 900         # 15 minutes — HIPAA minimum necessary

    # Diagnostics
    POSITIVE_LABEL: str = "ABNORMAL"
    NEGATIVE_LABEL: str = "NORMAL"


settings = Settings()
