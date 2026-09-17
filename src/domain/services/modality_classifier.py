import os
from src.domain.entities import Modality
from src.domain.interfaces import ModalityClassifier

class FileExtensionClassifier(ModalityClassifier):
    _MAPPING = {
        ".csv": Modality.STRUCTURED_TEXT,
        ".txt": Modality.STRUCTURED_TEXT,
        ".xlsx": Modality.STRUCTURED_TEXT,
        ".jpg": Modality.IMAGE,
        ".jpeg": Modality.IMAGE,
        ".png": Modality.IMAGE,
        ".mp3": Modality.AUDIO,
        ".wav": Modality.AUDIO,
        # ".mp3": Modality.AUDIO,
    }

    def classify(self, file_path: str) -> Modality:
        _, ext = os.path.splitext(file_path.lower())
        return self._MAPPING.get(ext, Modality.UNKNOWN)