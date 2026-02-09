# How to Run Whisper (Speech-to-Text) in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, whisper, speech-to-text, openai, transcription, ai, audio, docker compose

Description: Deploy OpenAI's Whisper speech-to-text model in Docker for accurate audio transcription with support for multiple languages and GPU acceleration.

---

OpenAI's Whisper is an automatic speech recognition model that handles transcription and translation across 97 languages. It achieves near-human accuracy on many benchmarks and works well even with background noise, accents, and domain-specific vocabulary. Running Whisper in Docker gives you a self-hosted transcription service that keeps your audio data private and avoids per-minute API charges.

## Model Sizes and Requirements

Whisper comes in several sizes. Larger models are more accurate but require more resources.

| Model | Parameters | VRAM Required | Relative Speed | English Accuracy |
|-------|-----------|---------------|----------------|-----------------|
| tiny | 39M | ~1 GB | 32x | Good |
| base | 74M | ~1 GB | 16x | Better |
| small | 244M | ~2 GB | 6x | Good+ |
| medium | 769M | ~5 GB | 2x | Very Good |
| large-v3 | 1550M | ~10 GB | 1x | Best |

## Quick Start with Docker

The simplest way to run Whisper is using a pre-built container.

```bash
# Run Whisper with the base model on CPU
docker run --rm \
  -v $(pwd)/audio:/audio \
  onerahmet/openai-whisper-asr-webservice:latest \
  --model base \
  --port 9000
```

For a more practical setup, use Docker Compose.

```yaml
# docker-compose.yml
# Whisper ASR service with GPU support and persistent model cache
version: "3.8"

services:
  whisper:
    image: onerahmet/openai-whisper-asr-webservice:latest-gpu
    container_name: whisper
    ports:
      - "9000:9000"
    volumes:
      # Cache downloaded models to avoid re-downloading
      - whisper_cache:/root/.cache/whisper
      # Mount a directory for audio files
      - ./audio:/audio
    environment:
      # Select the model size (tiny, base, small, medium, large-v3)
      - ASR_MODEL=medium
      # Set the compute device
      - ASR_ENGINE=openai_whisper
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

volumes:
  whisper_cache:
```

```bash
# Start the Whisper service
docker compose up -d

# Watch the logs (model download happens on first run)
docker compose logs -f whisper
```

## Building a Custom Whisper Container

If you need more control, build your own container.

```dockerfile
# Dockerfile
# Custom Whisper ASR container with API endpoint
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and Python
RUN apt-get update && apt-get install -y \
    python3 python3-pip ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Whisper and the web framework
RUN pip3 install --no-cache-dir \
    openai-whisper \
    fastapi \
    uvicorn \
    python-multipart

# Create the application directory
WORKDIR /app

# Copy the API server code
COPY server.py /app/server.py

EXPOSE 9000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "9000"]
```

Create the API server:

```python
# server.py
# FastAPI server that exposes Whisper as a REST API
import whisper
import tempfile
import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse

app = FastAPI(title="Whisper ASR API")

# Load the model at startup (stored in memory)
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "medium")
print(f"Loading Whisper model: {MODEL_SIZE}")
model = whisper.load_model(MODEL_SIZE)
print("Model loaded successfully")


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form(default=None),
    task: str = Form(default="transcribe")
):
    """Transcribe an audio file. Set task to 'translate' for English translation."""
    # Save the uploaded file temporarily
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Run Whisper transcription
        options = {"task": task}
        if language:
            options["language"] = language

        result = model.transcribe(tmp_path, **options)

        return JSONResponse({
            "text": result["text"],
            "segments": [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"]
                }
                for seg in result["segments"]
            ],
            "language": result.get("language", "unknown")
        })
    finally:
        os.unlink(tmp_path)


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_SIZE}
```

Build and run:

```bash
# Build the custom image
docker build -t whisper-api .

# Run with GPU support
docker run -d \
  --name whisper-api \
  --gpus all \
  -p 9000:9000 \
  -e WHISPER_MODEL=medium \
  -v whisper-cache:/root/.cache/whisper \
  whisper-api
```

## Using the Transcription API

Send audio files to the API for transcription.

```bash
# Transcribe an audio file
curl -X POST http://localhost:9000/transcribe \
  -F "file=@recording.wav" \
  -F "language=en" | python3 -m json.tool

# Translate audio from another language to English
curl -X POST http://localhost:9000/transcribe \
  -F "file=@german_audio.mp3" \
  -F "task=translate" | python3 -m json.tool
```

## Python Client Example

```python
# transcribe_client.py
# Client script for batch transcription of audio files
import requests
import os
import json

WHISPER_URL = "http://localhost:9000/transcribe"

def transcribe_file(file_path, language=None):
    """Send an audio file to the Whisper API and return the transcription."""
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f)}
        data = {}
        if language:
            data["language"] = language

        response = requests.post(WHISPER_URL, files=files, data=data)
        return response.json()

# Transcribe a single file
result = transcribe_file("meeting_recording.wav", language="en")
print(f"Transcription: {result['text']}")

# Print timestamps for each segment
for segment in result["segments"]:
    start = segment["start"]
    end = segment["end"]
    text = segment["text"]
    print(f"[{start:.1f}s - {end:.1f}s] {text}")
```

## Batch Processing

For processing multiple files, create a batch processing script.

```python
# batch_transcribe.py
# Process all audio files in a directory
import os
import requests
import json
from pathlib import Path

WHISPER_URL = "http://localhost:9000/transcribe"
AUDIO_DIR = "./audio"
OUTPUT_DIR = "./transcriptions"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Supported audio formats
AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"}

for file_path in Path(AUDIO_DIR).iterdir():
    if file_path.suffix.lower() not in AUDIO_EXTENSIONS:
        continue

    print(f"Transcribing: {file_path.name}")

    with open(file_path, "rb") as f:
        response = requests.post(
            WHISPER_URL,
            files={"file": (file_path.name, f)}
        )

    result = response.json()

    # Save the full transcription as a text file
    output_path = Path(OUTPUT_DIR) / f"{file_path.stem}.txt"
    with open(output_path, "w") as f:
        f.write(result["text"])

    # Save the timestamped segments as JSON
    json_path = Path(OUTPUT_DIR) / f"{file_path.stem}.json"
    with open(json_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"  Saved to: {output_path}")
```

## Using faster-whisper for Better Performance

faster-whisper uses CTranslate2 for significantly faster inference with lower memory usage.

```yaml
# docker-compose-faster.yml
# faster-whisper for improved transcription speed
version: "3.8"

services:
  whisper:
    image: fedirz/faster-whisper-server:latest-cuda
    container_name: faster-whisper
    ports:
      - "9000:8000"
    volumes:
      - whisper_models:/root/.cache/huggingface
    environment:
      - WHISPER__MODEL=Systran/faster-whisper-medium
      - WHISPER__INFERENCE_DEVICE=cuda
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

volumes:
  whisper_models:
```

## Subtitle Generation

Generate SRT subtitle files from audio.

```python
# generate_subtitles.py
# Create SRT subtitle files from Whisper transcription
import requests

def format_timestamp(seconds):
    """Convert seconds to SRT timestamp format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def create_srt(audio_file, output_file):
    """Transcribe audio and create an SRT subtitle file."""
    with open(audio_file, "rb") as f:
        response = requests.post(
            "http://localhost:9000/transcribe",
            files={"file": (audio_file, f)}
        )

    result = response.json()

    with open(output_file, "w") as f:
        for i, segment in enumerate(result["segments"], 1):
            start = format_timestamp(segment["start"])
            end = format_timestamp(segment["end"])
            text = segment["text"].strip()
            f.write(f"{i}\n{start} --> {end}\n{text}\n\n")

    print(f"Subtitles saved to {output_file}")

create_srt("video_audio.wav", "subtitles.srt")
```

## Monitoring and Troubleshooting

```bash
# Check Whisper service health
curl http://localhost:9000/health

# Monitor GPU memory during transcription
nvidia-smi -l 1

# View processing logs
docker compose logs -f whisper

# Check container resource usage
docker stats whisper
```

## Summary

Running Whisper in Docker gives you a private, cost-effective speech-to-text service. The model handles multiple languages, background noise, and varying audio quality with impressive accuracy. Docker containers make deployment simple and reproducible, while GPU acceleration keeps transcription fast enough for real-time use cases. Whether you are transcribing meetings, generating subtitles, or building voice-powered applications, a self-hosted Whisper instance in Docker is a practical and reliable solution.
