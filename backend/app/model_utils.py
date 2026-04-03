# backend/app/model_utils.py
"""
Keras 3 Model Manager — Thread-safe singleton.

Loads the ResNet50-based .keras (or .h5) model once at startup.
All inference requests share a single model instance to avoid
repeated I/O overhead and GPU memory fragmentation.
"""

import threading
import time
from pathlib import Path
from typing import Optional

import numpy as np

# Keras 3 imports — must be backend-agnostic
import keras


class ModelManager:
    """Singleton wrapper around the Keras inference model."""

    _model: Optional[keras.Model] = None
    _lock: threading.Lock = threading.Lock()
    _load_time: Optional[float] = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    @classmethod
    def load(cls, model_path: str) -> None:
        """Load model from disk. Called once during FastAPI lifespan startup."""
        path = Path(model_path)
        if not path.exists():
            raise FileNotFoundError(
                f"Model weights not found at '{model_path}'. "
                "Ensure the .keras file is present before starting the server."
            )

        with cls._lock:
            if cls._model is not None:
                return  # Already loaded by another thread

            t0 = time.perf_counter()
            cls._model = keras.models.load_model(str(path), compile=False)
            # Warm-up pass — forces graph compilation / GPU kernel loading
            dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
            cls._model.predict(dummy, verbose=0)
            cls._load_time = time.perf_counter() - t0

        print(f"   ResNet50 ready in {cls._load_time:.2f}s | "
              f"input={cls._model.input_shape} output={cls._model.output_shape}")

    @classmethod
    def unload(cls) -> None:
        with cls._lock:
            cls._model = None
            cls._load_time = None

    @classmethod
    def is_loaded(cls) -> bool:
        return cls._model is not None

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------
    @classmethod
    def predict(cls, image_array: np.ndarray) -> float:
        """
        Run inference on a pre-processed image tensor.

        Args:
            image_array: shape (1, 224, 224, 3), dtype float32, values in [0, 1].

        Returns:
            confidence: float in [0.0, 1.0] from the sigmoid output neuron.
        """
        if cls._model is None:
            raise RuntimeError("Model is not loaded. Check server startup logs.")

        # Keras models are NOT thread-safe for concurrent predictions
        # without re-entrancy; use the lock to serialise inference.
        with cls._lock:
            raw_output: np.ndarray = cls._model.predict(image_array, verbose=0)

        # Output shape: (1, 1) — single sigmoid neuron
        confidence: float = float(raw_output[0][0])
        return confidence
