import os
from typing import List
from src.domain.entities import FileItem, QualityReport, Modality
from src.domain.interfaces import Subject, FileScanner
from src.use_cases.factory import AbstractProcessorFactory

class ScanDatasetUseCase(Subject):
    def __init__(self, scanner: FileScanner, processor_factory: AbstractProcessorFactory):
        super().__init__()
        self._scanner = scanner
        self._processor_factory = processor_factory

    def execute(self, directory_path: str) -> List[QualityReport]:
        # 1. Scan directory for all file paths
        file_paths = self._scanner.scan(directory_path)
        total_files = len(file_paths)

        # Notify UI of scan start
        self.notify("SCAN_START", {"total": total_files})

        reports: List[QualityReport] = []

        for index, path in enumerate(file_paths, start=1):
            file_item = self._create_file_item(path)
            
            # Notify UI of current progress
            self.notify("SCAN_PROGRESS", {
                "current": index,
                "total": total_files,
                "file_path": path,
                "modality": file_item.modality.value
            })

            # Get the correct processor from factory and run it
            processor = self._processor_factory.create_processor(file_item)
            report = processor.process(file_item)
            reports.append(report)

        # Notify UI of completion
        self.notify("SCAN_COMPLETE", {"total": total_files, "reports_count": len(reports)})
        return reports

    def _create_file_item(self, path: str) -> FileItem:
        name = os.path.basename(path)
        _, ext = os.path.splitext(name)
        ext = ext.lower()

        # Identify modality based on file extension
        if ext in [".csv", ".txt", ".xlsx"]:
            modality = Modality.STRUCTURED_TEXT
        elif ext in [".jpg", ".jpeg", ".png"]:
            modality = Modality.IMAGE
        elif ext in [".mp3", ".wav", ".mo3"]:
            modality = Modality.AUDIO
        else:
            modality = Modality.UNKNOWN

        return FileItem(path=path, name=name, extension=ext, modality=modality)
