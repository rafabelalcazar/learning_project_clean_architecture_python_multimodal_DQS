import unittest
from typing import List, Any
from src.domain.entities import FileItem, QualityReport, Modality
from src.domain.interfaces import FileScanner, UnimodalProcessor, Observer
from src.use_cases.factory import AbstractProcessorFactory
from src.use_cases.scan_dataset import ScanDatasetUseCase

class MockFileScanner(FileScanner):
    def scan(self, directory_path: str) -> List[str]:
        return ["/mock/dir/file1.csv", "/mock/dir/file2.png", "/mock/dir/file3.mp3"]

class MockProcessor(UnimodalProcessor):
    def process(self, file_item: FileItem) -> QualityReport:
        return QualityReport(
            file_item=file_item,
            metrics={"test_metric": 42},
            status="SUCCESS"
        )

class MockProcessorFactory(AbstractProcessorFactory):
    def create_processor(self, file_item: FileItem) -> UnimodalProcessor:
        return MockProcessor()

class MockObserver(Observer):
    def __init__(self):
        self.events = []

    def update(self, event_type: str, data: Any) -> None:
        self.events.append((event_type, data))

class TestScanDatasetUseCase(unittest.TestCase):
    def test_use_case_execution_and_observer_notifications(self):
        scanner = MockFileScanner()
        factory = MockProcessorFactory()
        use_case = ScanDatasetUseCase(scanner, factory)
        
        observer = MockObserver()
        use_case.attach(observer)
        
        reports = use_case.execute("/mock/dir")
        
        # Verify reports counts and identified modalities
        self.assertEqual(len(reports), 3)
        self.assertEqual(reports[0].file_item.modality, Modality.STRUCTURED_TEXT)
        self.assertEqual(reports[1].file_item.modality, Modality.IMAGE)
        self.assertEqual(reports[2].file_item.modality, Modality.AUDIO)
        
        # Verify Observer events triggered (1 start, 3 progress, 1 complete)
        self.assertEqual(len(observer.events), 5)
        
        # Assert start event structure
        self.assertEqual(observer.events[0][0], "SCAN_START")
        self.assertEqual(observer.events[0][1]["total"], 3)
        
        # Assert progress event structures
        self.assertEqual(observer.events[1][0], "SCAN_PROGRESS")
        self.assertEqual(observer.events[1][1]["current"], 1)
        self.assertEqual(observer.events[1][1]["file_path"], "/mock/dir/file1.csv")
        self.assertEqual(observer.events[1][1]["modality"], Modality.STRUCTURED_TEXT.value)
        
        self.assertEqual(observer.events[2][0], "SCAN_PROGRESS")
        self.assertEqual(observer.events[2][1]["current"], 2)
        self.assertEqual(observer.events[2][1]["file_path"], "/mock/dir/file2.png")
        
        self.assertEqual(observer.events[3][0], "SCAN_PROGRESS")
        self.assertEqual(observer.events[3][1]["current"], 3)
        self.assertEqual(observer.events[3][1]["file_path"], "/mock/dir/file3.mp3")
        
        # Assert complete event structure
        self.assertEqual(observer.events[4][0], "SCAN_COMPLETE")
        self.assertEqual(observer.events[4][1]["total"], 3)
        self.assertEqual(observer.events[4][1]["reports_count"], 3)
