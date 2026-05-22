import os
from src.domain.entities import FileItem, QualityReport
from src.domain.interfaces import UnimodalProcessor, QualityStrategy

class BaseUnimodalProcessor(UnimodalProcessor):
    def __init__(self, strategy: QualityStrategy):
        self._strategy = strategy

    def process(self, file_item: FileItem) -> QualityReport:
        try:
            # Calculate file size as a standard metric
            file_size = os.path.getsize(file_item.path)
            
            # Delegate metadata & quality metric extraction to Strategy
            metrics = self._strategy.extract_metrics(file_item.path)
            
            # Add general metrics
            metrics["file_size_bytes"] = file_size
            
            return QualityReport(
                file_item=file_item,
                metrics=metrics,
                status="SUCCESS"
            )
        except Exception as e:
            return QualityReport(
                file_item=file_item,
                metrics={"error": str(e)},
                status="ERROR"
            )

class UnknownFileProcessor(UnimodalProcessor):
    def process(self, file_item: FileItem) -> QualityReport:
        try:
            file_size = os.path.getsize(file_item.path)
        except Exception:
            file_size = 0

        return QualityReport(
            file_item=file_item,
            metrics={
                "error": "Unsupported file format / unknown modality",
                "file_size_bytes": file_size
            },
            status="UNSUPPORTED"
        )
