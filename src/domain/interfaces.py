from abc import ABC, abstractmethod
from typing import List, Dict, Any
from src.domain.entities import FileItem, QualityReport, Modality

class Observer(ABC):
    @abstractmethod
    def update(self, event_type: str, data: Any) -> None:
        pass

class Subject:
    def __init__(self) -> None:
        self._observers: List[Observer] = []

    def attach(self, observer: Observer) -> None:
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        if observer in self._observers:
            self._observers.remove(observer)

    def notify(self, event_type: str, data: Any) -> None:
        for observer in self._observers:
            observer.update(event_type, data)

class FileScanner(ABC):
    @abstractmethod
    def scan(self, directory_path: str) -> List[str]:
        pass

class QualityStrategy(ABC):
    @abstractmethod
    def extract_metrics(self, file_path: str) -> Dict[str, Any]:
        pass

class UnimodalProcessor(ABC):
    @abstractmethod
    def process(self, file_item: FileItem) -> QualityReport:
        pass

class MetricsExporter(ABC):
    @abstractmethod
    def export(self, reports: List[QualityReport], output_path: str) -> None:
        pass

class ModalityClassifier(ABC):
    @abstractmethod
    def classify(self, file_path: str) -> Modality:
        pass