# How to Run Jan AI in Docker for Local LLM Chat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Jan ai, LLM, Local chat, AI, Self-Hosted, Docker Compose, Privacy

Description: Deploy Jan AI in Docker for a private, offline-capable local LLM chat application with model management and OpenAI-compatible API support.

---

Jan AI is an open-source desktop application for running large language models locally, and Jan Server is the related self-hostable server stack for OpenAI-compatible APIs. The desktop app provides a clean chat interface, built-in model management, and a local API server on port 1337. Jan Server is deployed with Docker Compose from the official repository and exposes its API gateway on port 8000. What makes Jan interesting is its focus on privacy - you can run models on your own hardware and keep data under your control.

## What Jan AI Offers

Jan provides several features that make local LLM usage practical:

- Clean, modern chat interface
- Built-in model hub for downloading GGUF models from Hugging Face
- OpenAI-compatible API for integration with other tools
- Conversation history with local storage
- Model parameter tuning (temperature, top_p, max_tokens, etc.)
- Support for multiple simultaneous conversations
- MCP support for adding tool integrations

## Prerequisites

- Docker and Docker Compose installed
- At least 8 GB of RAM (12 GB recommended for the Jan Server stack, 16 GB recommended for larger local models)
- 10 GB of free disk space for models
- Git and Make for the official Jan Server Docker Compose workflow
- GPU with NVIDIA drivers is optional but improves performance significantly for local inference

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

Run Jan Server with the official Docker Compose workflow.

```bash
# Clone the Jan Server repository
git clone https://github.com/janhq/jan-server.git
cd jan-server

# Run the setup wizard and start Docker Compose
make quickstart
```

For GPU-accelerated inference:

```bash
# Rerun the wizard and choose the local vLLM/GPU option
make quickstart

# Or start the GPU profile after configuration
make up-gpu
```

## Docker Compose Setup

Jan Server ships its own Docker Compose configuration. Use the repository commands instead of a single `ghcr.io/janhq/jan-server` image.

```bash
# Generate or update .env and config/secrets.env
make setup

# Start the full Docker Compose stack
make up-full

# Watch the startup
make logs

# Check service health
make health-check
```

## Custom Docker Image with Local GGUF Models

If you specifically want a small single-container GGUF server, build a custom OpenAI-compatible llama.cpp service. This is not Jan Server, but it can be useful for testing local models with the same OpenAI-style client examples.

```dockerfile
# Dockerfile
# Custom OpenAI-compatible GGUF server
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

Create a lightweight server that exposes an OpenAI-compatible API:

```python
# jan_server.py
# OpenAI-compatible API server for local LLM inference
import os
import json
import time
import uuid
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from llama_cpp import Llama

app = FastAPI(title="Local GGUF Server")

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

Download GGUF models from Hugging Face for use with the custom llama.cpp server or the Jan desktop app.

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

Jan Server exposes an OpenAI-compatible API through its gateway. Get a short-lived guest token, then include it as a bearer token in API requests.

```bash
# Get a guest access token
export JAN_ACCESS_TOKEN=$(curl -s -X POST http://localhost:8000/llm/auth/guest-login | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

# Send a chat request
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer $JAN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jan-v1-4b",
    "messages": [
      {"role": "user", "content": "What are the benefits of running LLMs locally?"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }' | python3 -m json.tool
```

## Python Client

```python
# jan_client.py
import os
from openai import OpenAI

# Point the client at the Jan Server gateway
client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key=os.environ["JAN_ACCESS_TOKEN"],
)

# Chat with the model
response = client.chat.completions.create(
    model="jan-v1-4b",
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
import os
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key=os.environ["JAN_ACCESS_TOKEN"],
)

# Stream the response token by token
stream = client.chat.completions.create(
    model="jan-v1-4b",
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

Pair the custom GGUF server above with Open WebUI for a full chat experience.

```yaml
# docker-compose-full.yml
# Local GGUF backend with Open WebUI frontend
services:
  local-gguf:
    build: .
    container_name: local-gguf
    ports:
      - "1337:1337"
    volumes:
      - ./models:/app/models
    environment:
      - GPU_LAYERS=0
    restart: unless-stopped

  webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: jan-webui
    ports:
      - "3000:8080"
    volumes:
      - webui_data:/app/backend/data
    environment:
      # Point Open WebUI at the local OpenAI-compatible API
      - OPENAI_API_BASE_URL=http://local-gguf:1337/v1
      - OPENAI_API_KEY=not-needed
    depends_on:
      - local-gguf
    restart: unless-stopped

volumes:
  webui_data:
```

```bash
# Start both services
docker compose -f docker-compose-full.yml up -d

# Access the web UI at http://localhost:3000
# The local API is available at http://localhost:1337
```

## GPU Acceleration

Enable GPU support for faster inference. For Jan Server, choose the local vLLM/GPU option in `make quickstart` or run `make up-gpu` after setup. For the custom GGUF server, pass Docker's GPU flag and set the number of layers to offload.

```bash
# Start Jan Server with the GPU inference profile
make up-gpu

# Or run the custom GGUF container with NVIDIA GPU access
docker run -d \
  --name local-gguf \
  --gpus all \
  -p 1337:1337 \
  -v $(pwd)/models:/app/models \
  -e GPU_LAYERS=35 \
  jan-server-custom
```

```bash
# Monitor GPU usage during inference
watch -n 1 nvidia-smi
```

## Monitoring and Maintenance

```bash
# Check server health
make health-check

# Monitor resource usage
docker compose stats

# View server logs
make logs

# Restart the server if needed
make restart-full
```

## Backup Conversations and Data

```bash
# Back up the Jan Server application database
docker compose exec -T api-db \
  pg_dump -U "${POSTGRES_USER:-jan_user}" "${POSTGRES_DB:-jan_llm_api}" \
  > jan-llm-api.sql

# Restore data
cat jan-llm-api.sql | docker compose exec -T api-db \
  psql -U "${POSTGRES_USER:-jan_user}" "${POSTGRES_DB:-jan_llm_api}"
```

## Updating Jan AI

```bash
# Pull the latest repository changes
git pull

# Recreate with updated images
make up-full

# Check the new version
make health-check
```

## Summary

Jan Server in Docker provides a private, self-hosted OpenAI-compatible API stack, while the Jan desktop app provides the local chat interface and model management on port 1337. Docker Compose handles the server deployment, and the OpenAI-compatible API means you can integrate Jan Server with tools that support the OpenAI format. For teams and individuals who want local LLM access without relying entirely on cloud APIs, Jan's desktop and server options provide a practical path.
