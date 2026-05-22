import os
import tempfile
import unittest
from src.infrastructure.scanner import OsFileScanner

class TestOsFileScanner(unittest.TestCase):
    def setUp(self):
        self.scanner = OsFileScanner()
        self.temp_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_scan_empty_directory(self):
        files = self.scanner.scan(self.temp_dir.name)
        self.assertEqual(files, [])

    def test_scan_recursive_files(self):
        dir_path = self.temp_dir.name
        sub_dir = os.path.join(dir_path, "subdir")
        os.makedirs(sub_dir, exist_ok=True)
        
        file1 = os.path.join(dir_path, "file1.txt")
        file2 = os.path.join(sub_dir, "file2.csv")
        
        with open(file1, "w") as f:
            f.write("hello")
        with open(file2, "w") as f:
            f.write("a,b\n1,2")
            
        files = self.scanner.scan(dir_path)
        
        # Verify the scanner found both files
        expected = {os.path.abspath(file1), os.path.abspath(file2)}
        self.assertEqual(set(files), expected)

    def test_scan_non_existent_directory(self):
        with self.assertRaises(FileNotFoundError):
            self.scanner.scan("non_existent_directory_path_9999")
