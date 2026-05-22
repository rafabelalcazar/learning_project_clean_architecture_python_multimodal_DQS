import os
import sys
from typing import Any
from src.domain.interfaces import Observer

class ConsoleProgressObserver(Observer):
    def update(self, event_type: str, data: Any) -> None:
        if event_type == "SCAN_START":
            total = data.get("total", 0)
            print(f"\n[+] Starting scan. Found {total} files to evaluate...\n")
        elif event_type == "SCAN_PROGRESS":
            current = data.get("current", 0)
            total = data.get("total", 0)
            file_path = data.get("file_path", "")
            modality = data.get("modality", "")
            
            percentage = (current / total) * 100 if total > 0 else 0.0
            file_name = os.path.basename(file_path)
            
            # Print inline progress
            sys.stdout.write(f"\r[*] Progress: {current}/{total} ({percentage:.1f}%) | Current: {file_name} [{modality}]")
            sys.stdout.flush()
        elif event_type == "SCAN_COMPLETE":
            total = data.get("total", 0)
            reports_count = data.get("reports_count", 0)
            print(f"\n\n[+] Scan finished. Processed {reports_count}/{total} files.\n")
