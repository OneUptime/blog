# How to Run LocalAI in Docker for OpenAI-Compatible API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, localai, openai, api, llm, self-hosted, ai, docker compose

Description: Deploy LocalAI in Docker to run a self-hosted OpenAI-compatible API for text generation, embeddings, image generation, and speech processing.

---

LocalAI is an open-source project that provides an OpenAI-compatible API you can run on your own hardware. It supports text generation, embeddings, image generation, text-to-speech, and speech-to-text. Since it implements the same API contract as OpenAI, you can point any application that uses the OpenAI SDK at LocalAI and it works without code changes. Running it in Docker makes deployment clean and reproducible.

## Why LocalAI?

LocalAI stands out for several reasons:

- Drop-in replacement for the OpenAI API
- Supports multiple model backends (llama.cpp, whisper.cpp, stablediffusion, etc.)
- Runs on CPU, with optional GPU acceleration
- No telemetry or data collection
- Compatible with any OpenAI client library

## Quick Start

The simplest way to start LocalAI is with a single Docker command.

```bash
# Run LocalAI on port 8080 with a persistent models directory
docker run -d \
  --name localai \
  -p 8080:8080 \
  -v localai_models:/build/models \
  localai/localai:latest-cpu
```

For GPU support:

```bash
# Run LocalAI with NVIDIA GPU support
docker run -d \
  --name localai \
  -p 8080:8080 \
  -v localai_models:/build/models \
  --gpus all \
  localai/localai:latest-gpu-nvidia-cuda-12
```

Verify LocalAI is running:

```bash
# Check the health endpoint
curl http://localhost:8080/readyz

# List available models
curl http://localhost:8080/v1/models | python3 -m json.tool
```

## Docker Compose Setup

A Docker Compose configuration gives you more control over the deployment.

```yaml
# docker-compose.yml
# LocalAI deployment with persistent storage and configuration
version: "3.8"

services:
  localai:
    image: localai/localai:latest-cpu
    container_name: localai
    ports:
      - "8080:8080"
    volumes:
      # Persist downloaded models
      - localai_models:/build/models
      # Mount custom model configurations
      - ./model-configs:/build/models
    environment:
      # Number of threads for model inference
      - THREADS=4
      # Enable debug logging for troubleshooting
      - DEBUG=false
      # Set the default context size
      - CONTEXT_SIZE=512
      # Preload specific models at startup
      - PRELOAD_MODELS=[{"url": "github:mudler/LocalAI/gallery/llama3.1-8b-instruct.yaml", "name": "llama3.1"}]
    restart: unless-stopped
    # Resource limits to prevent runaway memory usage
    deploy:
      resources:
        limits:
          memory: 8G

volumes:
  localai_models:
```

Start the service:

```bash
# Launch LocalAI
docker compose up -d

# Monitor the startup (model downloading can take time)
docker compose logs -f localai
```

## Installing Models

LocalAI has a built-in model gallery that simplifies model installation.

```bash
# List available models from the gallery
curl http://localhost:8080/models/available | python3 -m json.tool | head -50

# Install a model from the gallery
curl -X POST http://localhost:8080/models/apply \
  -H "Content-Type: application/json" \
  -d '{"id": "llama3.1-8b-instruct"}'

# Check installation progress
curl http://localhost:8080/models/jobs | python3 -m json.tool

# Once installed, verify the model is available
curl http://localhost:8080/v1/models | python3 -m json.tool
```

You can also manually place GGUF model files in the models directory:

```bash
# Download a model manually (example: Phi-3 Mini GGUF)
wget -P ./model-configs/ https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf
```

Then create a configuration file for it:

```yaml
# ./model-configs/phi3.yaml
# Model configuration for Phi-3 Mini
name: phi3
backend: llama-cpp
parameters:
  model: Phi-3-mini-4k-instruct-q4.gguf
  temperature: 0.7
  top_p: 0.9
  context_size: 4096
```

## Using the OpenAI-Compatible API

LocalAI implements the same endpoints as OpenAI. Here is how to use them.

### Chat Completions

```bash
# Send a chat completion request (same format as OpenAI)
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain Docker volumes in two sentences."}
    ],
    "temperature": 0.7
  }' | python3 -m json.tool
```

### Text Embeddings

```bash
# Generate text embeddings for semantic search
curl http://localhost:8080/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-ada-002",
    "input": "Docker containers provide isolated environments for applications."
  }' | python3 -m json.tool
```

### Streaming Responses

```bash
# Stream chat completions for real-time output
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1",
    "messages": [{"role": "user", "content": "Write a haiku about containers."}],
    "stream": true
  }'
```

## Using LocalAI with Python

Since LocalAI is OpenAI-compatible, you can use the official OpenAI Python library.

```python
# pip install openai
from openai import OpenAI

# Point the client at your LocalAI instance instead of OpenAI
client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="not-needed"  # LocalAI does not require an API key by default
)

# Chat completion - identical code to using OpenAI
response = client.chat.completions.create(
    model="llama3.1",
    messages=[
        {"role": "system", "content": "You are a helpful DevOps engineer."},
        {"role": "user", "content": "How do I optimize a Docker image for production?"}
    ],
    temperature=0.7,
    max_tokens=500
)

print(response.choices[0].message.content)
```

```python
# Generate embeddings using the same OpenAI client
embedding = client.embeddings.create(
    model="text-embedding-ada-002",
    input="Container orchestration with Kubernetes"
)

print(f"Embedding dimension: {len(embedding.data[0].embedding)}")
```

## GPU Acceleration with NVIDIA

For significantly faster inference, enable GPU support.

```yaml
# docker-compose.yml with GPU support
version: "3.8"

services:
  localai:
    image: localai/localai:latest-gpu-nvidia-cuda-12
    container_name: localai
    ports:
      - "8080:8080"
    volumes:
      - localai_models:/build/models
    environment:
      - THREADS=4
      - CONTEXT_SIZE=2048
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped

volumes:
  localai_models:
```

Verify GPU usage:

```bash
# Check that LocalAI detects the GPU
docker exec localai nvidia-smi

# Monitor GPU usage during inference
watch -n 1 nvidia-smi
```

## Image Generation

LocalAI supports image generation using Stable Diffusion backends.

```bash
# Install a Stable Diffusion model
curl -X POST http://localhost:8080/models/apply \
  -H "Content-Type: application/json" \
  -d '{"id": "stablediffusion"}'

# Generate an image using the OpenAI-compatible endpoint
curl http://localhost:8080/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "model": "stablediffusion",
    "prompt": "A container ship sailing through digital clouds",
    "size": "512x512"
  }' -o response.json
```

## Speech-to-Text with Whisper

LocalAI includes Whisper support for audio transcription.

```bash
# Install the Whisper model
curl -X POST http://localhost:8080/models/apply \
  -H "Content-Type: application/json" \
  -d '{"id": "whisper-1"}'

# Transcribe an audio file
curl http://localhost:8080/v1/audio/transcriptions \
  -F "file=@recording.wav" \
  -F "model=whisper-1"
```

## Performance Tuning

Optimize LocalAI performance through environment variables.

```yaml
# Key performance-related environment variables
  localai:
    environment:
      # Match the number of CPU cores available
      - THREADS=8
      # Increase context size for longer conversations
      - CONTEXT_SIZE=4096
      # Enable memory mapping for faster model loading
      - MMAP=true
      # Set the number of GPU layers to offload (if using GPU)
      - GPU_LAYERS=35
```

## Monitoring and Health Checks

```bash
# Health check endpoint
curl http://localhost:8080/readyz

# Detailed system information
curl http://localhost:8080/system | python3 -m json.tool

# Monitor resource usage
docker stats localai
```

## Summary

LocalAI gives you a self-hosted OpenAI-compatible API that runs on your own hardware. Docker makes it easy to deploy, and the OpenAI API compatibility means you can swap it into existing applications with minimal changes. Whether you need text generation, embeddings, image generation, or speech processing, LocalAI handles it all behind a familiar API interface. The combination of Docker containers and local model inference keeps your data private and your costs predictable.
