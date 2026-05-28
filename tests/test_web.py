import unittest
from src.main_web import create_app

class TestWebInterface(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    def test_index_route(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        # Verify dashboard header text and input components are present
        self.assertIn(b"Unimodal Data Quality Analyzer", response.data)
        self.assertIn(b"id=\"dataset-path\"", response.data)
        self.assertIn(b"id=\"btn-scan\"", response.data)

    def test_scan_api_missing_path(self):
        response = self.client.get('/api/scan')
        data = response.data.decode('utf-8')
        # SSE stream response should immediately emit a SCAN_ERROR
        self.assertIn("SCAN_ERROR", data)
        self.assertIn("Path parameter is required", data)

    def test_scan_api_invalid_path(self):
        response = self.client.get('/api/scan?path=non_existent_path_directory_123')
        data = response.data.decode('utf-8')
        self.assertIn("SCAN_ERROR", data)
        self.assertIn("does not exist", data)
