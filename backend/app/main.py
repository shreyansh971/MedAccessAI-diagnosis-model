from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.model_utils import ModelManager
from app.routers import analyze, patients, auth as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("⚕  MedAccess AI — Starting in dev mode (model loading skipped)")
    yield
    print("🛑  Shutting down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="MedAccess AI",
        description="HIPAA-compliant radiographic diagnostic API powered by ResNet50.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router.router, prefix="/v1/auth", tags=["Authentication"])
    app.include_router(analyze.router,     prefix="/v1",      tags=["Analysis"])
    app.include_router(patients.router,    prefix="/v1",      tags=["Patients"])

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "model_loaded": ModelManager.is_loaded(),
            "version": "1.0.0",
        }

    return app


app = create_app()