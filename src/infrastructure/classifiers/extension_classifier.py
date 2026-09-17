from src.domain.interfaces import ModalityClassifier
from src.domain.entities import Modality
import os

class OsExtensionClassifier(ModalityClassifier):
    def classify(self, file_path: str) -> Modality:
        _, ext = os.path.splitext(file_path.lower())
        
        mapping = {
            ".csv": Modality.STRUCTURED_TEXT,
            ".txt": Modality.STRUCTURED_TEXT,
            ".xlsx": Modality.STRUCTURED_TEXT,
            ".jpg": Modality.IMAGE,
            ".jpeg": Modality.IMAGE,
            ".png": Modality.IMAGE,
            ".mp3": Modality.AUDIO,
            ".wav": Modality.AUDIO,
            ".mo3": Modality.AUDIO,
        }
        return mapping.get(ext, Modality.UNKNOWN)