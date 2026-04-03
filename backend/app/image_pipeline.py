# backend/app/image_pipeline.py
"""
HIPAA-Compliant Image Preprocessing Pipeline

Responsibilities:
  1. Validate incoming image bytes (magic bytes check).
  2. Strip ALL EXIF / XMP / IPTC metadata (PHI removal — HIPAA §164.514).
  3. Resize and normalise to ResNet50 input spec: 224×224 RGB, float32 [0,1].
  4. Return clean numpy array ready for model inference.
"""

import io
from typing import Tuple

import numpy as np
import piexif                  # pip install piexif
from PIL import Image, UnidentifiedImageError

# Accepted MIME types for radiographic uploads
ALLOWED_MIME_PREFIXES = (b"\xff\xd8\xff",   # JPEG
                         b"\x89PNG",         # PNG
                         b"II*\x00",         # TIFF (little-endian)
                         b"MM\x00*")         # TIFF (big-endian)

TARGET_SIZE: Tuple[int, int] = (224, 224)
MAX_FILE_BYTES: int = 25 * 1024 * 1024     # 25 MB hard cap


class ImageValidationError(ValueError):
    """Raised when uploaded bytes fail format or size validation."""


def validate_magic_bytes(data: bytes) -> None:
    """Reject files that don't match known radiographic image headers."""
    for prefix in ALLOWED_MIME_PREFIXES:
        if data[:len(prefix)] == prefix:
            return
    raise ImageValidationError(
        "Unsupported image format. Upload JPEG, PNG, or TIFF radiographic images."
    )


def strip_metadata(image_bytes: bytes) -> bytes:
    """
    Remove all EXIF, XMP, and IPTC metadata from image bytes.
    This is a HIPAA-required step to eliminate embedded PHI
    (patient name, DOB, institution, etc.) before storage.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except UnidentifiedImageError as exc:
        raise ImageValidationError("Cannot decode image data.") from exc

    # Build a clean copy with no metadata
    clean_buffer = io.BytesIO()
    # Strip EXIF by saving without info dict
    img_no_meta = Image.new(img.mode, img.size)
    img_no_meta.putdata(list(img.getdata()))

    save_kwargs = {"format": img.format or "JPEG"}
    if img.format == "JPEG":
        save_kwargs["exif"] = b""          # Empty EXIF segment
        save_kwargs["quality"] = 95
    img_no_meta.save(clean_buffer, **save_kwargs)

    return clean_buffer.getvalue()


def preprocess_for_inference(image_bytes: bytes) -> np.ndarray:
    """
    Full pipeline: validate → strip EXIF → resize → normalise.

    Returns:
        np.ndarray of shape (1, 224, 224, 3), dtype float32, values in [0.0, 1.0]
    """
    if len(image_bytes) > MAX_FILE_BYTES:
        raise ImageValidationError(
            f"File size {len(image_bytes) / 1e6:.1f} MB exceeds 25 MB limit."
        )

    validate_magic_bytes(image_bytes)
    clean_bytes = strip_metadata(image_bytes)

    img = Image.open(io.BytesIO(clean_bytes))

    # Ensure RGB — DICOM/grayscale X-rays may arrive as 'L' or 'RGBA'
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize with high-quality Lanczos resampling (preserves fine structure)
    img_resized = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)

    # → numpy float32, normalised to [0, 1]
    array = np.array(img_resized, dtype=np.float32) / 255.0

    # Add batch dimension: (224, 224, 3) → (1, 224, 224, 3)
    return np.expand_dims(array, axis=0)
