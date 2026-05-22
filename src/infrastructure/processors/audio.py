import os
import wave
from typing import Dict, Any
from mutagen.mp3 import MP3
from src.domain.interfaces import QualityStrategy
from src.infrastructure.processors.base import BaseUnimodalProcessor

class AudioQualityStrategy(QualityStrategy):
    def extract_metrics(self, file_path: str) -> Dict[str, Any]:
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()
        metrics = {}

        if ext == ".wav":
            try:
                with wave.open(file_path, "rb") as w:
                    channels = w.getnchannels()
                    sample_rate = w.getframerate()
                    frames = w.getnframes()
                    duration = frames / float(sample_rate) if sample_rate > 0 else 0.0
                    bit_depth = w.getsampwidth() * 8
                    
                    metrics.update({
                        "channels": channels,
                        "sample_rate_hz": sample_rate,
                        "duration_seconds": round(duration, 3),
                        "bit_depth": bit_depth,
                        "audio_format": "WAV"
                    })
            except Exception as e:
                metrics.update({
                    "error": f"Failed to parse WAV: {str(e)}",
                    "channels": 0,
                    "sample_rate_hz": 0,
                    "duration_seconds": 0.0,
                    "bit_depth": 0
                })

        elif ext in [".mp3", ".mo3"]:
            try:
                # Mutagen MP3 specific reader
                audio = MP3(file_path)
                metrics.update({
                    "channels": audio.info.channels,
                    "sample_rate_hz": audio.info.sample_rate,
                    "duration_seconds": round(audio.info.length, 3),
                    "bitrate_kbps": int(audio.info.bitrate / 1000) if audio.info.bitrate else 0,
                    "audio_format": "MP3"
                })
            except Exception:
                # General mutagen fallback for tracker formats, typos or corrupt files
                try:
                    from mutagen import File as MutagenFile
                    audio = MutagenFile(file_path)
                    if audio is not None and audio.info is not None:
                        metrics.update({
                            "channels": getattr(audio.info, "channels", 0),
                            "sample_rate_hz": getattr(audio.info, "sample_rate", 0),
                            "duration_seconds": round(getattr(audio.info, "length", 0.0), 3),
                            "audio_format": ext[1:].upper()
                        })
                    else:
                        raise ValueError("Mutagen could not parse metadata")
                except Exception as e:
                    metrics.update({
                        "error": f"Failed to parse audio: {str(e)}",
                        "channels": 0,
                        "sample_rate_hz": 0,
                        "duration_seconds": 0.0,
                        "audio_format": ext[1:].upper()
                    })

        return metrics

class AudioProcessor(BaseUnimodalProcessor):
    def __init__(self, strategy: AudioQualityStrategy):
        super().__init__(strategy)
