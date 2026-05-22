import argparse
from src.infrastructure.scanner import OsFileScanner
from src.infrastructure.processors.factory_impl import ProcessorFactory
from src.adapters.exporters import CsvMetricsExporter
from src.adapters.controllers import CliController

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Unimodal Data Quality Analyzer - Clean Architecture CLI"
    )
    parser.add_argument(
        "--path",
        required=True,
        help="Absolute or relative path to the directory containing dataset files."
    )
    parser.add_argument(
        "--output",
        default="metrics_report.csv",
        help="Path where the output CSV file will be written (default: metrics_report.csv)."
    )

    args = parser.parse_args()

    # Composition Root: Bootstrap system components via Dependency Injection
    scanner = OsFileScanner()
    factory = ProcessorFactory()
    exporter = CsvMetricsExporter()

    controller = CliController(scanner, factory, exporter)
    controller.run(args.path, args.output)

if __name__ == "__main__":
    main()
