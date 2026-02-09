# How to Run Coqui TTS in Docker for Text-to-Speech

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, coqui tts, text-to-speech, ai, voice synthesis, self-hosted, docker compose

Description: Deploy Coqui TTS in Docker for self-hosted text-to-speech synthesis with support for multiple languages, voice cloning, and custom models.

---

Coqui TTS is an open-source text-to-speech engine that generates natural-sounding speech from text. It supports multiple languages, offers voice cloning capabilities, and provides several model architectures ranging from fast lightweight models to high-quality neural vocoders. Running Coqui TTS in Docker gives you a private speech synthesis service without sending your text data to third-party APIs.

## What Coqui TTS Offers

Coqui TTS includes several model types:

- **Tacotron2**: A sequence-to-sequence model for mel-spectrogram generation
- **VITS**: A high-quality end-to-end model that generates speech directly
- **XTTS**: A multi-lingual model with voice cloning support
- **Bark**: Generates expressive speech with emotion and style control

The XTTS model is particularly interesting because it can clone a voice from a short audio sample and generate speech in 17 languages.

## Quick Start

Run Coqui TTS with a single Docker command.

```bash
# Run the Coqui TTS server with the default VITS model
docker run -d \
  --name coqui-tts \
  -p 5002:5002 \
  -v tts_models:/root/.local/share/tts \
  ghcr.io/coqui-ai/tts \
  --model_name tts_models/en/ljspeech/vits \
  --server
```

Wait for the model to download and the server to start, then test it:

```bash
# Generate speech from text
curl "http://localhost:5002/api/tts?text=Hello%20world%2C%20this%20is%20Coqui%20TTS%20running%20in%20Docker" -o output.wav

# Play the generated audio (on macOS)
afplay output.wav

# Or on Linux
aplay output.wav
```

## Docker Compose Setup

A more complete setup with GPU support and persistent storage.

```yaml
# docker-compose.yml
# Coqui TTS server with GPU acceleration and model persistence
version: "3.8"

services:
  coqui-tts:
    image: ghcr.io/coqui-ai/tts
    container_name: coqui-tts
    ports:
      # TTS API and web interface
      - "5002:5002"
    volumes:
      # Persist downloaded models
      - tts_models:/root/.local/share/tts
      # Mount directory for voice cloning samples
      - ./voice_samples:/voice_samples
      # Mount output directory
      - ./output:/output
    command: >
      --model_name tts_models/en/ljspeech/vits
      --server
    # Uncomment for GPU support
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]
    restart: unless-stopped

volumes:
  tts_models:
```

```bash
# Create required directories
mkdir -p voice_samples output

# Start the service
docker compose up -d

# Monitor the startup and model download
docker compose logs -f coqui-tts
```

## Available Models

Coqui TTS ships with many pre-trained models. List them to find the one that suits your needs.

```bash
# List all available TTS models
docker run --rm ghcr.io/coqui-ai/tts --list_models

# The output is organized by category:
# tts_models/<language>/<dataset>/<model_name>
# vocoder_models/<language>/<dataset>/<model_name>
```

Popular model choices include:

| Model | Quality | Speed | Size | Languages |
|-------|---------|-------|------|-----------|
| tts_models/en/ljspeech/vits | Good | Fast | 100 MB | English |
| tts_models/en/ljspeech/tacotron2-DDC | Good | Medium | 200 MB | English |
| tts_models/multilingual/multi-dataset/xtts_v2 | Excellent | Slow | 1.8 GB | 17 languages |
| tts_models/en/ljspeech/glow-tts | Good | Fast | 100 MB | English |

## Using the XTTS Model for Multi-Language Support

XTTS v2 is the most capable model, supporting voice cloning and multiple languages.

```yaml
# docker-compose-xtts.yml
# XTTS v2 model with GPU for multi-language voice synthesis
version: "3.8"

services:
  coqui-tts:
    image: ghcr.io/coqui-ai/tts
    container_name: coqui-xtts
    ports:
      - "5002:5002"
    volumes:
      - tts_models:/root/.local/share/tts
      - ./voice_samples:/voice_samples
    command: >
      --model_name tts_models/multilingual/multi-dataset/xtts_v2
      --server
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

volumes:
  tts_models:
```

```bash
# Start the XTTS server (downloads a 1.8 GB model on first run)
docker compose -f docker-compose-xtts.yml up -d

# Generate speech in different languages using XTTS
# English
curl "http://localhost:5002/api/tts?text=Hello%20from%20Docker&language_id=en" -o english.wav

# Spanish
curl "http://localhost:5002/api/tts?text=Hola%20desde%20Docker&language_id=es" -o spanish.wav

# French
curl "http://localhost:5002/api/tts?text=Bonjour%20depuis%20Docker&language_id=fr" -o french.wav
```

## Voice Cloning

XTTS supports voice cloning from a short audio sample (6-30 seconds of clean speech).

```bash
# Place a voice sample in the voice_samples directory
# The sample should be a WAV file with clear speech, minimal background noise

# Clone a voice and generate speech
curl -X POST "http://localhost:5002/api/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is generated speech using a cloned voice from Docker.",
    "language_id": "en",
    "speaker_wav": "/voice_samples/reference_voice.wav"
  }' -o cloned_voice.wav
```

## Building a Custom TTS API

For production use, create a custom API with more features.

```dockerfile
# Dockerfile
# Custom Coqui TTS API server
FROM python:3.10-slim

# Install system dependencies including audio processing libraries
RUN apt-get update && apt-get install -y \
    ffmpeg libsndfile1 espeak-ng \
    && rm -rf /var/lib/apt/lists/*

# Install Coqui TTS
RUN pip install --no-cache-dir TTS fastapi uvicorn python-multipart

WORKDIR /app
COPY tts_server.py /app/

EXPOSE 8000

CMD ["uvicorn", "tts_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

```python
# tts_server.py
# Custom FastAPI server for Coqui TTS with multiple endpoints
import io
import os
import tempfile
from TTS.api import TTS
from fastapi import FastAPI, Query, UploadFile, File
from fastapi.responses import StreamingResponse

app = FastAPI(title="Coqui TTS API")

# Load the model at startup
MODEL_NAME = os.environ.get("TTS_MODEL", "tts_models/en/ljspeech/vits")
print(f"Loading TTS model: {MODEL_NAME}")
tts = TTS(model_name=MODEL_NAME)
print("Model loaded successfully")


@app.get("/api/tts")
async def text_to_speech(
    text: str = Query(..., description="Text to synthesize"),
    language: str = Query(default="en", description="Language code"),
    speed: float = Query(default=1.0, description="Speech speed multiplier")
):
    """Generate speech from text and return WAV audio."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tts.tts_to_file(
            text=text,
            file_path=tmp.name,
            language=language,
            speed=speed
        )
        tmp.seek(0)
        audio_data = open(tmp.name, "rb").read()
        os.unlink(tmp.name)

    return StreamingResponse(
        io.BytesIO(audio_data),
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=speech.wav"}
    )


@app.post("/api/tts/clone")
async def clone_voice(
    text: str = Query(...),
    language: str = Query(default="en"),
    speaker_wav: UploadFile = File(...)
):
    """Generate speech using a cloned voice from an uploaded audio sample."""
    # Save the uploaded voice sample temporarily
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as ref_tmp:
        content = await speaker_wav.read()
        ref_tmp.write(content)
        ref_path = ref_tmp.name

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_tmp:
        tts.tts_to_file(
            text=text,
            file_path=out_tmp.name,
            speaker_wav=ref_path,
            language=language
        )
        audio_data = open(out_tmp.name, "rb").read()
        os.unlink(out_tmp.name)
        os.unlink(ref_path)

    return StreamingResponse(
        io.BytesIO(audio_data),
        media_type="audio/wav"
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME}
```

Build and run:

```bash
# Build the custom image
docker build -t coqui-tts-api .

# Run with a specific model
docker run -d \
  --name coqui-api \
  -p 8000:8000 \
  -e TTS_MODEL=tts_models/en/ljspeech/vits \
  -v tts-cache:/root/.local/share/tts \
  coqui-tts-api
```

## Python Client

```python
# tts_client.py
# Client for batch text-to-speech generation
import requests

TTS_URL = "http://localhost:5002/api/tts"

texts = [
    "Docker containers provide isolated runtime environments for applications.",
    "Coqui TTS generates natural sounding speech from text input.",
    "Self-hosted AI services keep your data private and under your control.",
]

for i, text in enumerate(texts):
    response = requests.get(TTS_URL, params={"text": text})

    filename = f"speech_{i}.wav"
    with open(filename, "wb") as f:
        f.write(response.content)
    print(f"Generated: {filename}")
```

## Performance Optimization

```bash
# Monitor resource usage during speech generation
docker stats coqui-tts

# For faster inference, use GPU acceleration
# Check if GPU is being utilized
nvidia-smi -l 1

# The VITS model is the fastest for CPU-only setups
# XTTS requires GPU for reasonable speed
```

## Integration with Other Services

Combine Coqui TTS with Whisper for a complete speech pipeline.

```yaml
# docker-compose-speech.yml
# Complete speech pipeline: TTS + STT
version: "3.8"

services:
  tts:
    image: ghcr.io/coqui-ai/tts
    container_name: tts
    ports:
      - "5002:5002"
    volumes:
      - tts_models:/root/.local/share/tts
    command: --model_name tts_models/en/ljspeech/vits --server
    restart: unless-stopped

  stt:
    image: onerahmet/openai-whisper-asr-webservice:latest
    container_name: stt
    ports:
      - "9000:9000"
    volumes:
      - whisper_models:/root/.cache/whisper
    environment:
      - ASR_MODEL=base
    restart: unless-stopped

volumes:
  tts_models:
  whisper_models:
```

## Summary

Coqui TTS in Docker gives you a private, self-hosted text-to-speech service with impressive voice quality. The XTTS model supports 17 languages and voice cloning from short audio samples. Docker containers handle the complex dependency chain of audio processing libraries and neural network frameworks, while volume mounts keep your downloaded models persistent. Whether you need TTS for accessibility features, content creation, or voice assistants, Coqui TTS in Docker provides a flexible and capable solution.
