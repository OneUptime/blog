# How to Run Jan AI in Docker for Local LLM Chat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, jan ai, llm, local chat, ai, self-hosted, docker compose, privacy

Description: Deploy Jan AI in Docker for a private, offline-capable local LLM chat application with model management and OpenAI-compatible API support.

---

Jan AI is an open-source desktop and server application for running large language models locally. It provides a clean chat interface, built-in model management, and an OpenAI-compatible API server. What makes Jan interesting is its focus on privacy - everything runs offline on your hardware, and no data leaves your machine. Running Jan in Docker makes it available as a network service, accessible from any device on your network while maintaining the same privacy guarantees.

## What Jan AI Offers

Jan provides several features that make local LLM usage practical:

- Clean, modern chat interface
- Built-in model hub for downloading GGUF models from Hugging Face
- OpenAI-compatible API for integration with other tools
- Conversation history with local storage
- Model parameter tuning (temperature, top_p, max_tokens, etc.)
- Support for multiple simultaneous conversations
- Extension system for adding functionality

## Prerequisites

- Docker and Docker Compose installed
- At least 8 GB of RAM (16 GB recommended for larger models)
- 10 GB of free disk space for models
- GPU with NVIDIA drivers is optional but improves performance significantly

```bash
# Verify Docker is available
docker --version
docker compose version

# Check available system memory
free -h

# If using GPU, verify NVIDIA toolkit
nvidia-smi 2>/dev/null && echo "GPU available" || echo "CPU only"
```

## Quick Start with Docker

Run Jan AI's server component in Docker.

```bash
# Run Jan AI server on port 1337
docker run -d \
  --name jan-ai \
  -p 1337:1337 \
  -v jan_data:/app/server/jan \
  -v jan_models:/app/server/models \
  ghcr.io/janhq/jan-server:latest
```

For GPU-accelerated inference:

```bash
# Run with NVIDIA GPU support
docker run -d \
  --name jan-ai \
  --gpus all \
  -p 1337:1337 \
  -v jan_data:/app/server/jan \
  -v jan_models:/app/server/models \
  ghcr.io/janhq/jan-server:latest
```

## Docker Compose Setup

A complete Docker Compose setup for Jan AI with all the necessary configuration.

```yaml
# docker-compose.yml
# Jan AI server with persistent storage and configuration
version: "3.8"

services:
  jan:
    image: ghcr.io/janhq/jan-server:latest
    container_name: jan-ai
    ports:
      # API and web interface port
      - "1337:1337"
    volumes:
      # Persist conversation data and settings
      - jan_data:/app/server/jan
      # Persist downloaded models
      - jan_models:/app/server/models
    environment:
      # API server configuration
      - JAN_API_HOST=0.0.0.0
      - JAN_API_PORT=1337
    # Uncomment for GPU support
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]
    restart: unless-stopped

volumes:
  jan_data:
  jan_models:
```

```bash
# Start Jan AI
docker compose up -d

# Watch the startup
docker compose logs -f jan
```

## Custom Docker Image with Pre-loaded Models

Build a custom image that includes models pre-downloaded for faster deployment.

```dockerfile
# Dockerfile
# Custom Jan AI server with pre-configured settings
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl wget git build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install llama-cpp-python for GGUF model serving
RUN pip install --no-cache-dir \
    llama-cpp-python \
    fastapi \
    uvicorn \
    python-multipart \
    sse-starlette

WORKDIR /app

# Create directories for models and data
RUN mkdir -p models data conversations

# Copy the API server
COPY jan_server.py /app/

EXPOSE 1337

CMD ["uvicorn", "jan_server:app", "--host", "0.0.0.0", "--port", "1337"]
```

Create a lightweight server that mimics Jan's API:

```python
# jan_server.py
# OpenAI-compatible API server for local LLM inference
import os
import json
import time
import uuid
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from llama_cpp import Llama

app = FastAPI(title="Jan AI Server")

# Model storage
models = {}
current_model = None

MODELS_DIR = os.environ.get("MODELS_DIR", "/app/models")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = False
    top_p: float = 0.9


class ModelInfo(BaseModel):
    id: str
    object: str = "model"
    owned_by: str = "local"


def load_model(model_name: str):
    """Load a GGUF model from the models directory."""
    global current_model

    model_path = os.path.join(MODELS_DIR, model_name)
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail=f"Model not found: {model_name}")

    if model_name not in models:
        print(f"Loading model: {model_name}")
        n_gpu_layers = int(os.environ.get("GPU_LAYERS", "0"))
        models[model_name] = Llama(
            model_path=model_path,
            n_ctx=4096,
            n_gpu_layers=n_gpu_layers,
            verbose=False
        )
        print(f"Model loaded: {model_name}")

    current_model = models[model_name]
    return current_model


@app.get("/v1/models")
async def list_models():
    """List available models in the models directory."""
    available = []
    if os.path.exists(MODELS_DIR):
        for f in os.listdir(MODELS_DIR):
            if f.endswith(".gguf"):
                available.append(ModelInfo(id=f))
    return {"object": "list", "data": available}


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """OpenAI-compatible chat completions endpoint."""
    model = load_model(request.model)

    # Format messages for the model
    prompt_parts = []
    for msg in request.messages:
        if msg.role == "system":
            prompt_parts.append(f"System: {msg.content}")
        elif msg.role == "user":
            prompt_parts.append(f"User: {msg.content}")
        elif msg.role == "assistant":
            prompt_parts.append(f"Assistant: {msg.content}")
    prompt_parts.append("Assistant:")
    prompt = "\n".join(prompt_parts)

    if request.stream:
        # Streaming response
        def generate():
            stream = model.create_completion(
                prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                stream=True
            )
            for chunk in stream:
                token = chunk["choices"][0]["text"]
                data = {
                    "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": request.model,
                    "choices": [{
                        "index": 0,
                        "delta": {"content": token},
                        "finish_reason": None
                    }]
                }
                yield f"data: {json.dumps(data)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    else:
        # Non-streaming response
        output = model.create_completion(
            prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
        )

        return {
            "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": output["choices"][0]["text"]
                },
                "finish_reason": "stop"
            }],
            "usage": output.get("usage", {})
        }


@app.get("/health")
async def health():
    """Health check endpoint."""
    model_count = len([f for f in os.listdir(MODELS_DIR) if f.endswith(".gguf")]) if os.path.exists(MODELS_DIR) else 0
    return {
        "status": "ok",
        "models_available": model_count,
        "models_loaded": len(models)
    }
```

Build and run the custom server:

```bash
# Build the image
docker build -t jan-server-custom .

# Run with model directory mounted
docker run -d \
  --name jan-custom \
  -p 1337:1337 \
  -v $(pwd)/models:/app/models \
  -e GPU_LAYERS=0 \
  jan-server-custom
```

## Downloading Models

Download GGUF models from Hugging Face for use with Jan.

```bash
# Create the models directory
mkdir -p models

# Download a small, fast model (Phi-3 Mini, ~2.4 GB)
wget -P models/ \
  "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf"

# Download a larger, more capable model (Llama 3.1 8B, ~4.7 GB)
wget -P models/ \
  "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf"

# Download a tiny model for testing (~100 MB)
wget -P models/ \
  "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"

# List available models
ls -lh models/
```

## Using the OpenAI-Compatible API

Since Jan exposes an OpenAI-compatible API, you can use it with any OpenAI client library.

```bash
# List available models
curl http://localhost:1337/v1/models | python3 -m json.tool

# Send a chat request
curl -X POST http://localhost:1337/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Phi-3-mini-4k-instruct-q4.gguf",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What are the benefits of running LLMs locally?"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }' | python3 -m json.tool
```

## Python Client

```python
# jan_client.py
# Use the OpenAI Python library to connect to Jan AI
from openai import OpenAI

# Point the client at the Jan AI server
client = OpenAI(
    base_url="http://localhost:1337/v1",
    api_key="not-needed"
)

# List available models
models = client.models.list()
for model in models.data:
    print(f"Model: {model.id}")

# Chat with the model
response = client.chat.completions.create(
    model="Phi-3-mini-4k-instruct-q4.gguf",
    messages=[
        {"role": "system", "content": "You are a knowledgeable DevOps engineer."},
        {"role": "user", "content": "How do I optimize Docker image layer caching?"}
    ],
    temperature=0.7,
    max_tokens=500
)

print(response.choices[0].message.content)
```

## Streaming Responses

```python
# jan_stream.py
# Stream responses from Jan AI for real-time output
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:1337/v1",
    api_key="not-needed"
)

# Stream the response token by token
stream = client.chat.completions.create(
    model="Phi-3-mini-4k-instruct-q4.gguf",
    messages=[
        {"role": "user", "content": "Write a brief guide to Docker networking."}
    ],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()
```

## Adding a Web Interface

Pair Jan's API with Open WebUI for a full chat experience.

```yaml
# docker-compose-full.yml
# Jan AI backend with Open WebUI frontend
version: "3.8"

services:
  jan:
    image: ghcr.io/janhq/jan-server:latest
    container_name: jan-ai
    ports:
      - "1337:1337"
    volumes:
      - jan_data:/app/server/jan
      - jan_models:/app/server/models
    restart: unless-stopped

  webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: jan-webui
    ports:
      - "3000:8080"
    volumes:
      - webui_data:/app/backend/data
    environment:
      # Point Open WebUI at Jan's API
      - OPENAI_API_BASE_URLS=http://jan:1337/v1
      - OPENAI_API_KEYS=not-needed
    depends_on:
      - jan
    restart: unless-stopped

volumes:
  jan_data:
  jan_models:
  webui_data:
```

```bash
# Start both services
docker compose -f docker-compose-full.yml up -d

# Access the web UI at http://localhost:3000
# Jan's API is available at http://localhost:1337
```

## GPU Acceleration

Enable GPU support for faster inference.

```yaml
# GPU-enabled configuration
services:
  jan:
    image: ghcr.io/janhq/jan-server:latest
    container_name: jan-ai
    ports:
      - "1337:1337"
    volumes:
      - jan_data:/app/server/jan
      - jan_models:/app/server/models
    environment:
      # Set the number of GPU layers to offload
      - GPU_LAYERS=35
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
```

```bash
# Monitor GPU usage during inference
watch -n 1 nvidia-smi
```

## Monitoring and Maintenance

```bash
# Check server health
curl http://localhost:1337/health

# Monitor resource usage
docker stats jan-ai

# View server logs
docker compose logs -f jan

# Check model storage size
docker exec jan-ai du -sh /app/server/models/

# Restart the server if needed
docker compose restart jan
```

## Backup Conversations and Data

```bash
# Backup all Jan data including conversations
docker run --rm \
  -v jan_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/jan-data-backup.tar.gz -C /data .

# Backup models separately (these can be large)
docker run --rm \
  -v jan_models:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/jan-models-backup.tar.gz -C /data .

# Restore data
docker run --rm \
  -v jan_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/jan-data-backup.tar.gz"
```

## Updating Jan AI

```bash
# Pull the latest image
docker compose pull

# Recreate with the new version
docker compose up -d

# Check the new version
docker compose logs jan | head -10
```

## Summary

Jan AI in Docker provides a private, self-hosted LLM chat experience with an OpenAI-compatible API. The server runs entirely offline, keeping your conversations and data on your own hardware. Docker handles the deployment, while volume mounts ensure your models and conversations persist across updates. The OpenAI-compatible API means you can integrate Jan with any tool that supports the OpenAI format, from Open WebUI to custom applications. For teams and individuals who want local LLM access without cloud dependencies, Jan in Docker is a straightforward solution.
