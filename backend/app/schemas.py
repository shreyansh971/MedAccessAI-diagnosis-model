# backend/app/schemas.py
"""
Pydantic v2 schemas for MedAccess AI API.
Strict typing ensures the API contract is machine-verifiable.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class DiagnosticLabel(str, Enum):
    NORMAL   = "NORMAL"
    ABNORMAL = "ABNORMAL"


class ScanStatus(str, Enum):
    PENDING    = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETE   = "COMPLETE"
    FAILED     = "FAILED"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class TokenRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int       # seconds


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------
class AnalysisResponse(BaseModel):
    """Returned by POST /v1/analyze"""
    scan_id:          UUID            = Field(description="Unique identifier for this scan result.")
    patient_id:       Optional[UUID] = Field(None, description="Associated patient, if provided.")
    confidence_score: float           = Field(ge=0.0, le=1.0, description="Sigmoid output probability.")
    diagnostic_label: DiagnosticLabel = Field(description="Binary classification result.")
    threshold_used:   float           = Field(description="Confidence threshold applied.")
    processing_time_ms: float         = Field(description="End-to-end inference latency in milliseconds.")
    image_key:        str             = Field(description="Anonymised S3/GCS object key for the stripped image.")
    analyzed_at:      datetime        = Field(description="UTC timestamp of analysis.")
    model_version:    str             = Field(description="Model identifier for audit trail.")

    model_config = {"from_attributes": True}


class AnalysisError(BaseModel):
    detail:  str
    code:    str
    scan_id: Optional[UUID] = None


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------
class PatientCreate(BaseModel):
    mrn:          str  = Field(min_length=4, max_length=32, description="Medical Record Number.")
    display_name: str  = Field(min_length=2, max_length=120)
    date_of_birth: str = Field(description="ISO 8601 date, e.g. 1980-05-14")
    sex:          Optional[str] = Field(None, pattern="^(M|F|O|U)$")
    notes:        Optional[str] = None

    @field_validator("mrn")
    @classmethod
    def mrn_alphanumeric(cls, v: str) -> str:
        if not v.replace("-", "").isalnum():
            raise ValueError("MRN must be alphanumeric (hyphens allowed).")
        return v.upper()


class PatientResponse(PatientCreate):
    id:         UUID
    created_at: datetime
    scan_count: int = 0

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Scan history (lightweight, for sidebar)
# ---------------------------------------------------------------------------
class ScanSummary(BaseModel):
    scan_id:          UUID
    diagnostic_label: DiagnosticLabel
    confidence_score: float
    analyzed_at:      datetime
    status:           ScanStatus

    model_config = {"from_attributes": True}
