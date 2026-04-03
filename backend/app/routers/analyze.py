import time
import uuid
from datetime import datetime, timezone
from typing import Optional
import random

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from app.auth import get_current_practitioner
from app.image_pipeline import ImageValidationError, preprocess_for_inference
from app.schemas import AnalysisResponse, DiagnosticLabel

router = APIRouter()

@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyse a radiographic image with ResNet50",
)
async def analyze_scan(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    practitioner: dict = Depends(get_current_practitioner),
):
    t_start = time.perf_counter()
    scan_id = uuid.uuid4()

    # Read bytes
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file received.")

    # Validate image
    try:
        image_array = preprocess_for_inference(raw_bytes)
    except ImageValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Mock inference — random confidence score
    confidence = round(random.uniform(0.1, 0.95), 6)
    label = DiagnosticLabel.ABNORMAL if confidence >= 0.5 else DiagnosticLabel.NORMAL
    processing_ms = round((time.perf_counter() - t_start) * 1000, 2)

    return AnalysisResponse(
        scan_id=scan_id,
        patient_id=uuid.UUID(patient_id) if patient_id else None,
        confidence_score=confidence,
        diagnostic_label=label,
        threshold_used=0.5,
        processing_time_ms=processing_ms,
        image_key=f"mock/scans/{scan_id}.jpg",
        analyzed_at=datetime.now(timezone.utc),
        model_version="resnet50-chest-v1-mock",
    )
