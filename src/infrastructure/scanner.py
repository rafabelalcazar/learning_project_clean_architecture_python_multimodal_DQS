import os
from typing import List
from src.domain.interfaces import FileScanner

class OsFileScanner(FileScanner):
    def scan(self, directory_path: str) -> List[str]:
        if not os.path.exists(directory_path):
            raise FileNotFoundError(f"The path '{directory_path}' does not exist.")
        if not os.path.isdir(directory_path):
            raise NotADirectoryError(f"The path '{directory_path}' is not a directory.")

        file_paths = []
        for root, _, files in os.walk(directory_path):
            for file in files:
                full_path = os.path.abspath(os.path.join(root, file))
                file_paths.append(full_path)
        
        # Sort for deterministic processing order
        file_paths.sort()
        return file_paths
