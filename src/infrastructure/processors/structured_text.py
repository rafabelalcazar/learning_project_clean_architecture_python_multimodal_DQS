import os
import pandas as pd
from typing import Dict, Any
from src.domain.interfaces import QualityStrategy
from src.infrastructure.processors.base import BaseUnimodalProcessor

class StructuredTextQualityStrategy(QualityStrategy):
    def extract_metrics(self, file_path: str) -> Dict[str, Any]:
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()
        metrics = {}

        if ext == ".csv":
            try:
                # Read entire file for accurate counts, fallback if error
                df = pd.read_csv(file_path)
                metrics.update({
                    "row_count": len(df),
                    "column_count": len(df.columns),
                    "null_count": int(df.isnull().sum().sum()),
                    "columns": list(df.columns)
                })
            except Exception as e:
                metrics.update({
                    "error": f"Failed to parse CSV: {str(e)}",
                    "row_count": 0,
                    "column_count": 0,
                    "null_count": 0,
                    "columns": []
                })

        elif ext == ".xlsx":
            try:
                excel_file = pd.ExcelFile(file_path)
                sheet_names = excel_file.sheet_names
                # Read first sheet as reference
                df = pd.read_excel(file_path, sheet_name=sheet_names[0])
                metrics.update({
                    "sheet_count": len(sheet_names),
                    "sheet_names": sheet_names,
                    "row_count": len(df),
                    "column_count": len(df.columns),
                    "null_count": int(df.isnull().sum().sum()),
                    "columns": list(df.columns)
                })
            except Exception as e:
                metrics.update({
                    "error": f"Failed to parse Excel: {str(e)}",
                    "sheet_count": 0,
                    "row_count": 0,
                    "column_count": 0,
                    "null_count": 0
                })

        elif ext == ".txt":
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                line_count = len(lines)
                word_count = sum(len(line.split()) for line in lines)
                char_count = sum(len(line) for line in lines)
                metrics.update({
                    "line_count": line_count,
                    "word_count": word_count,
                    "char_count": char_count
                })
            except Exception as e:
                metrics.update({
                    "error": f"Failed to parse Text: {str(e)}",
                    "line_count": 0,
                    "word_count": 0,
                    "char_count": 0
                })

        return metrics

class StructuredTextProcessor(BaseUnimodalProcessor):
    def __init__(self, strategy: StructuredTextQualityStrategy):
        super().__init__(strategy)
