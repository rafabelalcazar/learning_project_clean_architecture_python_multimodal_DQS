from abc import ABC, abstractmethod
from src.domain.entities import FileItem
from src.domain.interfaces import UnimodalProcessor

class AbstractProcessorFactory(ABC):
    @abstractmethod
    def create_processor(self, file_item: FileItem) -> UnimodalProcessor:
        pass
