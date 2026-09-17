import os
import struct
import tempfile
import unittest
import wave
from PIL import Image

from src.domain.entities import FileItem, Modality
from src.infrastructure.processors.factory_impl import ProcessorFactory
from src.infrastructure.processors.base import UnknownFileProcessor
from src.infrastructure.processors.structured_text import StructuredTextProcessor, StructuredTextQualityStrategy
from src.infrastructure.processors.image import ImageProcessor, ImageQualityStrategy
from src.infrastructure.processors.audio import AudioProcessor, AudioQualityStrategy

class TestProcessorFactoryAndStrategies(unittest.TestCase):
    def setUp(self):
        self.factory = ProcessorFactory()
        self.temp_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_factory_method_instantiation(self):
        # Verify text processors
        item_csv = FileItem("mock.csv", "mock.csv", ".csv", Modality.STRUCTURED_TEXT)
        item_xlsx = FileItem("mock.xlsx", "mock.xlsx", ".xlsx", Modality.STRUCTURED_TEXT)
        item_txt = FileItem("mock.txt", "mock.txt", ".txt", Modality.STRUCTURED_TEXT)
        self.assertIsInstance(self.factory.create_processor(item_csv), StructuredTextProcessor)
        self.assertIsInstance(self.factory.create_processor(item_xlsx), StructuredTextProcessor)
        self.assertIsInstance(self.factory.create_processor(item_txt), StructuredTextProcessor)

        # Verify image processors
        item_png = FileItem("mock.png", "mock.png", ".png", Modality.IMAGE)
        self.assertIsInstance(self.factory.create_processor(item_png), ImageProcessor)

        # Verify audio processors
        item_wav = FileItem("mock.wav", "mock.wav", ".wav", Modality.AUDIO)
        self.assertIsInstance(self.factory.create_processor(item_wav), AudioProcessor)

        # Verify fallback unknown processors
        item_pdf = FileItem("mock.pdf", "mock.pdf", ".pdf", Modality.UNKNOWN)
        self.assertIsInstance(self.factory.create_processor(item_pdf), UnknownFileProcessor)

    def test_structured_text_strategy_csv(self):
        # Generate temporary CSV file
        file_path = os.path.join(self.temp_dir.name, "test.csv")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("col1,col2,col3\nvalue1,value2,\nvalue4,value5,value6")
            
        strategy = StructuredTextQualityStrategy()
        metrics = strategy.extract_metrics(file_path)
        
        self.assertEqual(metrics.get("row_count"), 2)
        self.assertEqual(metrics.get("column_count"), 3)
        self.assertEqual(metrics.get("null_count"), 1)  # col3 is empty for first row
        self.assertEqual(metrics.get("columns"), ["col1", "col2", "col3"])

    def test_structured_text_strategy_txt(self):
        # Generate temporary TXT file
        file_path = os.path.join(self.temp_dir.name, "test.txt")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("Line one\nLine two is longer\nLine three")
            
        strategy = StructuredTextQualityStrategy()
        metrics = strategy.extract_metrics(file_path)
        
        self.assertEqual(metrics.get("line_count"), 3)
        self.assertEqual(metrics.get("word_count"), 8)
        self.assertTrue(metrics.get("char_count") > 20)

    def test_image_strategy(self):
        # Generate temporary PNG file using PIL
        img_path = os.path.join(self.temp_dir.name, "test.png")
        img = Image.new("RGB", (100, 200), color="blue")
        img.save(img_path)
        
        strategy = ImageQualityStrategy()
        metrics = strategy.extract_metrics(img_path)
        
        self.assertEqual(metrics.get("width_pixels"), 100)
        self.assertEqual(metrics.get("height_pixels"), 200)
        self.assertEqual(metrics.get("aspect_ratio"), 0.5)
        self.assertEqual(metrics.get("color_mode"), "RGB")
        self.assertEqual(metrics.get("image_format"), "PNG")

        # A solid-color image has no edges/variation, so blur, contrast and entropy are 0
        self.assertEqual(metrics.get("blur_score"), 0.0)
        self.assertEqual(metrics.get("contrast"), 0.0)
        self.assertEqual(metrics.get("entropy"), 0.0)
        # PIL "blue" == RGB(0, 0, 255)
        self.assertEqual(metrics.get("r_mean"), 0.0)
        self.assertEqual(metrics.get("g_mean"), 0.0)
        self.assertEqual(metrics.get("b_mean"), 255.0)
        self.assertGreater(metrics.get("brightness"), 0.0)

    def test_audio_strategy_wav(self):
        # Generate temporary WAV file
        wav_path = os.path.join(self.temp_dir.name, "test.wav")
        with wave.open(wav_path, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)  # 16-bit
            w.setframerate(44100)
            # Write 0.5 seconds of silence
            num_frames = int(44100 * 0.5)
            for _ in range(num_frames):
                # Write 2 channels of 0
                data = struct.pack("<hh", 0, 0)
                w.writeframesraw(data)
                
        strategy = AudioQualityStrategy()
        metrics = strategy.extract_metrics(wav_path)
        
        self.assertEqual(metrics.get("channels"), 2)
        self.assertEqual(metrics.get("sample_rate_hz"), 44100)
        self.assertEqual(metrics.get("duration_seconds"), 0.5)
        self.assertEqual(metrics.get("bit_depth"), 16)
        self.assertEqual(metrics.get("audio_format"), "WAV")
