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

    def to_flat_dict(self) -> Dict[str, Any]:
        row = {
            "file_path": self.file_item.path,
            "file_name": self.file_item.name,
            "extension": self.file_item.extension,
            "modality": self.file_item.modality.value,
            "status": self.status,
            "processed_at": self.processed_at.isoformat()
        }

        # Flatten metrics into columns, avoiding collisions with base keys
        for key, val in self.metrics.items():
            column_name = key if key not in row else f"metric_{key}"
            row[column_name] = val

        return row
