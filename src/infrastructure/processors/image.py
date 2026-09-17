import cv2
from PIL import Image
from typing import Dict, Any
from skimage.measure import shannon_entropy
from src.domain.interfaces import QualityStrategy
from src.infrastructure.processors.base import BaseUnimodalProcessor

class ImageQualityStrategy(QualityStrategy):
    def extract_metrics(self, file_path: str) -> Dict[str, Any]:
        metrics = {}
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

    def _extract_quality_metrics(self, file_path: str) -> Dict[str, Any]:
        try:
            image = cv2.imread(file_path, cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError("OpenCV could not decode the image")

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            b_channel, g_channel, r_channel = cv2.split(image)

            return {
                "blur_score": round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 3),
                "brightness": round(float(gray.mean()), 3),
                "contrast": round(float(gray.std()), 3),
                "entropy": round(float(shannon_entropy(gray)), 3),
                "r_mean": round(float(r_channel.mean()), 3),
                "g_mean": round(float(g_channel.mean()), 3),
                "b_mean": round(float(b_channel.mean()), 3),
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
            }

class ImageProcessor(BaseUnimodalProcessor):
    def __init__(self, strategy: ImageQualityStrategy):
        super().__init__(strategy)
