import os
from typing import List
import pandas as pd
from src.domain.entities import QualityReport
from src.domain.interfaces import MetricsExporter

class CsvMetricsExporter(MetricsExporter):
    def export(self, reports: List[QualityReport], output_path: str) -> None:
        flat_data = [report.to_flat_dict() for report in reports]

        # Create DataFrame
        df = pd.DataFrame(flat_data)

        # Ensure destination directory exists
        parent_dir = os.path.dirname(os.path.abspath(output_path))
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)

        # Export to CSV
        df.to_csv(output_path, index=False, encoding="utf-8")
