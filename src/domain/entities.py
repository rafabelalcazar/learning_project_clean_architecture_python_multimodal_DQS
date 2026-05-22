from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, Any

class Modality(Enum):
    STRUCTURED_TEXT = "structured_text"
    IMAGE = "image"
    AUDIO = "audio"
    UNKNOWN = "unknown"

@dataclass(frozen=True)
class FileItem:
    path: str
    name: str
    extension: str
    modality: Modality

@dataclass(frozen=True)
class QualityReport:
    file_item: FileItem
    metrics: Dict[str, Any]
    status: str  # "SUCCESS", "ERROR", "UNSUPPORTED"
    processed_at: datetime = field(default_factory=datetime.now)
