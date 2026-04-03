from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from app.config import settings
from app.schemas import TokenResponse
from datetime import datetime, timedelta, timezone

router = APIRouter()

# Simple plain-text comparison for dev — no bcrypt at all
FAKE_USERS = {
    "admin@medaccess.com": {
        "password": "secret",
        "role": "RADIOLOGIST"
    }
}

def create_token(subject: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/token", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = FAKE_USERS.get(form_data.username)
    if not user or form_data.password != user["password"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )
    return TokenResponse(
        access_token=create_token(form_data.username, user["role"]),
        expires_in=3600
    )