from PIL import Image
from typing import Dict, Any
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
        return metrics

class ImageProcessor(BaseUnimodalProcessor):
    def __init__(self, strategy: ImageQualityStrategy):
        super().__init__(strategy)
