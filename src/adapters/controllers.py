import os
from src.domain.interfaces import FileScanner, MetricsExporter
from src.use_cases.scan_dataset import ScanDatasetUseCase
from src.use_cases.factory import AbstractProcessorFactory
from src.adapters.observers import ConsoleProgressObserver
from src.domain.interfaces import ModalityClassifier

class CliController:
    def __init__(self, scanner: FileScanner, factory: AbstractProcessorFactory, exporter: MetricsExporter, classifier: ModalityClassifier):
        self._scanner = scanner
        self._factory = factory
        self._exporter = exporter
        self._classifier = classifier   

    def run(self, dataset_path: str, output_csv_path: str) -> None:
        if not os.path.exists(dataset_path):
            print(f"\n[!] Error: The dataset directory path '{dataset_path}' does not exist.")
            return

        if not os.path.isdir(dataset_path):
            print(f"\n[!] Error: The path '{dataset_path}' is not a directory.")
            return

        # Construct use case
        use_case = ScanDatasetUseCase(self._scanner, self._factory, self._classifier)

        # Attach CLI Observer to get progress feedback
        observer = ConsoleProgressObserver()
        use_case.attach(observer)

        try:
            # Run the scanning and processing pipeline
            reports = use_case.execute(dataset_path)

            # Export results to CSV
            self._exporter.export(reports, output_csv_path)
            print(f"[+] Saved results to: {os.path.abspath(output_csv_path)}\n")
        except Exception as e:
            print(f"\n[!] Pipeline execution failed: {str(e)}")
