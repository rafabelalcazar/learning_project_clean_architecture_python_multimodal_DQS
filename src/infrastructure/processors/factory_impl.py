from src.domain.entities import FileItem, Modality
from src.domain.interfaces import UnimodalProcessor
from src.use_cases.factory import AbstractProcessorFactory
from src.infrastructure.processors.base import UnknownFileProcessor
from src.infrastructure.processors.structured_text import StructuredTextProcessor, StructuredTextQualityStrategy
from src.infrastructure.processors.image import ImageProcessor, ImageQualityStrategy
from src.infrastructure.processors.audio import AudioProcessor, AudioQualityStrategy

class ProcessorFactory(AbstractProcessorFactory):
    def __init__(self) -> None:
        # Cache strategies so they are not re-instantiated multiple times (flyweight strategy caching)
        self._text_strategy = StructuredTextQualityStrategy()
        self._image_strategy = ImageQualityStrategy()
        self._audio_strategy = AudioQualityStrategy()

    def create_processor(self, file_item: FileItem) -> UnimodalProcessor:
        modality = file_item.modality
        
        if modality == Modality.STRUCTURED_TEXT:
            return StructuredTextProcessor(self._text_strategy)
        elif modality == Modality.IMAGE:
            return ImageProcessor(self._image_strategy)
        elif modality == Modality.AUDIO:
            return AudioProcessor(self._audio_strategy)
        else:
            return UnknownFileProcessor()
