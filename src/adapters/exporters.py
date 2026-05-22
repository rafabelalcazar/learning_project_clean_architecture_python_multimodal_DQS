import os
from typing import List
import pandas as pd
from src.domain.entities import QualityReport
from src.domain.interfaces import MetricsExporter

class CsvMetricsExporter(MetricsExporter):
    def export(self, reports: List[QualityReport], output_path: str) -> None:
        flat_data = []
        for report in reports:
            row = {
                "file_path": report.file_item.path,
                "file_name": report.file_item.name,
                "extension": report.file_item.extension,
                "modality": report.file_item.modality.value,
                "status": report.status,
                "processed_at": report.processed_at.isoformat()
            }
            
            # Flatten metrics into columns
            for key, val in report.metrics.items():
                # Prevent colliding with base keys
                column_name = key if key not in row else f"metric_{key}"
                row[column_name] = val
                
            flat_data.append(row)

        # Create DataFrame
        df = pd.DataFrame(flat_data)

        # Ensure destination directory exists
        parent_dir = os.path.dirname(os.path.abspath(output_path))
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)

        # Export to CSV
        df.to_csv(output_path, index=False, encoding="utf-8")
