import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any
from skimage.measure import shannon_entropy
from skimage.restoration import estimate_sigma
from src.domain.interfaces import QualityStrategy
from src.infrastructure.processors.base import BaseUnimodalProcessor

class ImageQualityStrategy(QualityStrategy):
    def extract_metrics(self, file_path: str) -> Dict[str, Any]:
        metrics = {"is_corrupted": self._is_corrupted(file_path)}
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                aspect_ratio = round(width / height, 3) if height > 0 else 0.0

                # Retrieve standard image properties
                metrics.update({
                    "width_pixels": width,
                    "height_pixels": height,
                    "aspect_ratio": aspect_ratio,
                    "image_format": img.format,
                    "color_mode": img.mode
                })
        except Exception as e:
            metrics.update({
                "error": f"Failed to parse Image: {str(e)}",
                "width_pixels": 0,
                "height_pixels": 0,
                "aspect_ratio": 0.0,
                "image_format": "UNKNOWN",
                "color_mode": "UNKNOWN"
            })

        metrics.update(self._extract_quality_metrics(file_path))
        return metrics

    def _is_corrupted(self, file_path: str) -> bool:
        try:
            with Image.open(file_path) as img:
                img.verify()
            return False
        except Exception:
            return True

    def _extract_quality_metrics(self, file_path: str) -> Dict[str, Any]:
        try:
            image = cv2.imread(file_path, cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError("OpenCV could not decode the image")

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            b_channel, g_channel, r_channel = cv2.split(image)

            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            saturation = hsv[:, :, 1]

            # Hasler-Susstrunk colorfulness metric
            r_f, g_f, b_f = r_channel.astype("float"), g_channel.astype("float"), b_channel.astype("float")
            rg = r_f - g_f
            yb = 0.5 * (r_f + g_f) - b_f
            colorfulness = np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)

            edges = cv2.Canny(gray, 100, 200)

            return {
                "blur_score": round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 3),
                "brightness": round(float(gray.mean()), 3),
                "contrast": round(float(gray.std()), 3),
                "entropy": round(float(shannon_entropy(gray)), 3),
                "r_mean": round(float(r_channel.mean()), 3),
                "g_mean": round(float(g_channel.mean()), 3),
                "b_mean": round(float(b_channel.mean()), 3),
                "noise_sigma": round(float(estimate_sigma(gray)), 3),
                "colorfulness": round(float(colorfulness), 3),
                "saturation_mean": round(float(saturation.mean()), 3),
                "overexposed_ratio": round(float(np.mean(gray >= 250)), 4),
                "underexposed_ratio": round(float(np.mean(gray <= 5)), 4),
                "dynamic_range": int(gray.max()) - int(gray.min()),
                "edge_density": round(float(np.count_nonzero(edges) / edges.size), 4),
            }
        except Exception as e:
            return {
                "quality_metrics_error": f"Failed to compute image quality metrics: {str(e)}",
                "blur_score": 0.0,
                "brightness": 0.0,
                "contrast": 0.0,
                "entropy": 0.0,
                "r_mean": 0.0,
                "g_mean": 0.0,
                "b_mean": 0.0,
                "noise_sigma": 0.0,
                "colorfulness": 0.0,
                "saturation_mean": 0.0,
                "overexposed_ratio": 0.0,
                "underexposed_ratio": 0.0,
                "dynamic_range": 0,
                "edge_density": 0.0,
            }

class ImageProcessor(BaseUnimodalProcessor):
    def __init__(self, strategy: ImageQualityStrategy):
        super().__init__(strategy)
