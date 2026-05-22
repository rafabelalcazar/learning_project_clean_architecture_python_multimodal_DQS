import os
import wave
import struct
from PIL import Image

def build_dataset():
    dataset_dir = "sample_dataset"
    os.makedirs(dataset_dir, exist_ok=True)
    os.makedirs(os.path.join(dataset_dir, "nested_folder"), exist_ok=True)

    # 1. Structured Text: CSV
    csv_path = os.path.join(dataset_dir, "data.csv")
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("id,name,score,is_active\n1,Alice,95.5,True\n2,Bob,,False\n3,Charlie,88.0,True\n")
    print(f"Created: {csv_path}")

    # 2. Structured Text: TXT
    txt_path = os.path.join(dataset_dir, "info.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("This is a simple text file.\nIt contains three lines.\nEnjoy the tool!")
    print(f"Created: {txt_path}")

    # 3. Image: PNG
    png_path = os.path.join(dataset_dir, "nested_folder", "image.png")
    img = Image.new("RGB", (640, 480), color="blue")
    img.save(png_path)
    print(f"Created: {png_path}")

    # 4. Audio: WAV
    wav_path = os.path.join(dataset_dir, "nested_folder", "audio.wav")
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(1)  # Mono
        w.setsampwidth(2)  # 16-bit
        w.setframerate(22050)
        # Write 0.25 seconds of silent samples
        num_samples = int(22050 * 0.25)
        for _ in range(num_samples):
            data = struct.pack("<h", 0)
            w.writeframesraw(data)
    print(f"Created: {wav_path}")

    # 5. Unsupported: PDF
    pdf_path = os.path.join(dataset_dir, "doc.pdf")
    with open(pdf_path, "w") as f:
        f.write("%PDF-1.4 mock content")
    print(f"Created: {pdf_path}")

    print("\nSample dataset creation complete.")

if __name__ == "__main__":
    build_dataset()
