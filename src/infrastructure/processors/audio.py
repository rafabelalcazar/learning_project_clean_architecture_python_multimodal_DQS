import os
import shutil
import wave
import numpy as np
from typing import Dict, Any
from mutagen.mp3 import MP3
from pydub import AudioSegment
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

        metrics.update(self._extract_waveform_metrics(file_path))
        return metrics

    def _extract_waveform_metrics(self, file_path: str) -> Dict[str, Any]:
        try:
            audio = AudioSegment.from_file(file_path)
            samples = np.array(audio.get_array_of_samples()).astype(np.float64)
            if audio.channels > 1:
                samples = samples.reshape(-1, audio.channels).mean(axis=1)

            if len(samples) == 0:
                raise ValueError("Decoded audio contains no samples")

            max_val = float(2 ** (8 * audio.sample_width - 1))
            norm = samples / max_val

            rms = float(np.sqrt(np.mean(norm ** 2)))
            peak = float(np.max(np.abs(norm)))
            clipping_ratio = float(np.mean(np.abs(norm) >= 0.99))
            silence_ratio = float(np.mean(np.abs(norm) < 0.01))
            zero_crossings = int(np.sum(np.diff(np.sign(norm)) != 0))
            zero_crossing_rate = zero_crossings / len(norm)

            spectrum = np.abs(np.fft.rfft(norm))
            freqs = np.fft.rfftfreq(len(norm), d=1.0 / audio.frame_rate)
            spectral_centroid_hz = float(np.sum(freqs * spectrum) / (np.sum(spectrum) + 1e-12))

            dynamic_range_db = float(20 * np.log10((peak + 1e-12) / (rms + 1e-12)))

            return {
                "is_corrupted": False,
                "rms_energy": round(rms, 4),
                "peak_amplitude": round(peak, 4),
                "clipping_ratio": round(clipping_ratio, 5),
                "silence_ratio": round(silence_ratio, 5),
                "zero_crossing_rate": round(zero_crossing_rate, 5),
                "spectral_centroid_hz": round(spectral_centroid_hz, 1),
                "dynamic_range_db": round(dynamic_range_db, 2),
            }
        except Exception as e:
            if shutil.which("ffmpeg") is None:
                error_message = (
                    "ffmpeg was not found on PATH. It is a system binary required by pydub "
                    "to decode audio (not installable via pip) - install it separately "
                    "(e.g. 'winget install ffmpeg', 'apt install ffmpeg', 'brew install ffmpeg') "
                    "and ensure it is on PATH. See README.md."
                )
            else:
                error_message = f"Failed to compute waveform metrics: {str(e)}"

            return {
                "is_corrupted": True,
                "waveform_metrics_error": error_message,
                "rms_energy": 0.0,
                "peak_amplitude": 0.0,
                "clipping_ratio": 0.0,
                "silence_ratio": 0.0,
                "zero_crossing_rate": 0.0,
                "spectral_centroid_hz": 0.0,
                "dynamic_range_db": 0.0,
            }

class AudioProcessor(BaseUnimodalProcessor):
    def __init__(self, strategy: AudioQualityStrategy):
        super().__init__(strategy)
