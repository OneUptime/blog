# How to Deploy Ollama for Local LLM Inference via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Ollama, LLM, AI, Docker

Description: Deploy Ollama to run large language models locally using Portainer for simplified LLM inference management.

## Introduction

Ollama makes it trivially easy to run large language models like Llama 3, Mistral, CodeLlama, and many others locally on your own hardware. By deploying Ollama via Portainer, you get a centrally managed LLM inference server that your entire team can access, with full control over your data - no API keys, no data leaving your infrastructure.

## Prerequisites

- Portainer installed with Docker
- At least 8 GB RAM (16 GB recommended for larger models)
- NVIDIA GPU with CUDA support (optional but significantly faster)
- At least 20 GB free disk space for models
- Docker 25+ with NVIDIA container toolkit for GPU support

## Step 1: Install NVIDIA Container Toolkit (for GPU support)

```bash
# Add NVIDIA container toolkit repository

curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify GPU access
docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu22.04 nvidia-smi
```

## Step 2: Deploy Ollama via Portainer Stack

Create a new stack in Portainer:

```yaml
# docker-compose.yml for Ollama + Open WebUI
version: "3.8"

services:
  # Ollama LLM inference engine
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    restart: always
    ports:
      - "11434:11434"
    volumes:
      # Persist downloaded models (can be large - 4-40GB per model)
      - ollama-models:/root/.ollama
    # GPU configuration (remove if CPU-only)
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    environment:
      # Maximum parallel requests each model will process
      - OLLAMA_NUM_PARALLEL=4
      # Keep models in memory (0 = unload after use)
      - OLLAMA_KEEP_ALIVE=5m
      # Host to bind to
      - OLLAMA_HOST=0.0.0.0:11434
    healthcheck:
      test: ["CMD", "ollama", "list"]
      interval: 30s
      timeout: 30s
      retries: 5
      start_period: 60s
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "3"
    networks:
      - ai-net

  # Open WebUI - beautiful chat interface
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    restart: always
    ports:
      - "3000:8080"
    depends_on:
      ollama:
        condition: service_healthy
    volumes:
      - open-webui-data:/app/backend/data
    environment:
      # Point to Ollama backend
      - OLLAMA_BASE_URL=http://ollama:11434
      # Disable authentication for fresh internal-only installs (enable for production)
      - WEBUI_AUTH=false
      # Default models to show
      - DEFAULT_MODELS=llama3.2:3b
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - ai-net

volumes:
  ollama-models:
  open-webui-data:

networks:
  ai-net:
    driver: bridge
```

## Step 3: Pull Language Models

After deployment, pull models via the Portainer container console:

```bash
# Access Ollama container via Portainer > Containers > ollama > Console

# Pull popular models
ollama pull llama3.2:3b        # Fast, 3B parameter model (~2GB)
ollama pull llama3.1:8b        # Better quality, 8B model (~5GB)
ollama pull mistral:7b          # Great all-around model (~4GB)
ollama pull codellama:13b       # Excellent for code generation
ollama pull phi3:mini           # Very fast Microsoft model (~2GB)
ollama pull deepseek-r1:7b     # Strong reasoning model

# List downloaded models
ollama list

# Get model information
ollama show llama3.1:8b
```

## Step 4: Test Ollama API

Test the REST API directly:

```bash
# Chat completion (via API)
curl http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "messages": [
      {"role": "user", "content": "Explain Docker containers in 3 sentences."}
    ],
    "stream": false
  }'

# Generate completion
curl http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "prompt": "Write a Python function to reverse a string",
    "stream": false
  }'

# List available models
curl http://localhost:11434/api/tags
```

## Step 5: Pre-Pull Models on Startup

Set up automatic model pulling on startup:

```bash
#!/bin/bash
# pull-models.sh - run as entrypoint or helper service

# Wait for Ollama to start
until ollama list &>/dev/null; do
  echo "Waiting for Ollama..."
  sleep 2
done

# Pull frequently used models
echo "Pulling required models..."
ollama pull llama3.2:3b
ollama pull mistral:7b
ollama pull codellama:7b

echo "Models ready:"
ollama list
```

Create this as a one-time service in Portainer:

```yaml
services:
  ollama-init:
    image: ollama/ollama:latest
    depends_on:
      ollama:
        condition: service_healthy
    command: >
      sh -c "
        ollama pull llama3.2:3b &&
        ollama pull mistral:7b &&
        echo 'Models pulled successfully'
      "
    environment:
      - OLLAMA_HOST=http://ollama:11434
    networks:
      - ai-net
    restart: "no"
```

## Step 6: Integrate with Applications

Use Ollama in your applications via the OpenAI-compatible API:

```python
# Python example using OpenAI SDK (compatible with Ollama)
from openai import OpenAI

# Point to local Ollama instance
client = OpenAI(
    base_url='http://localhost:11434/v1',
    api_key='ollama'  # Required but unused
)

response = client.chat.completions.create(
    model="llama3.2:3b",
    messages=[
        {"role": "system", "content": "You are a helpful DevOps assistant."},
        {"role": "user", "content": "How do I reduce Docker image sizes?"}
    ]
)

print(response.choices[0].message.content)
```

## Step 7: CPU-Only Deployment

For servers without GPUs, optimize for CPU inference:

```yaml
# CPU-optimized Ollama configuration
services:
  ollama:
    image: ollama/ollama:latest
    environment:
      # Limit parallel requests to reduce RAM pressure on CPU-only hosts
      - OLLAMA_NUM_PARALLEL=2
      # Smaller models work better on CPU
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 16G
```

For CPU inference, prefer smaller models:
- `phi3:mini` (~2GB, fast on CPU)
- `llama3.2:3b` (~2GB, good balance)
- `qwen2.5:3b` (~2GB, multilingual)

## Monitoring Ollama

Track inference performance via Portainer's container logs and metrics:

```bash
# View Ollama logs for performance metrics
docker logs ollama --tail 100 -f

# Check GPU utilization during inference
nvidia-smi dmon -s u
```

## Conclusion

Deploying Ollama via Portainer provides organizations with a private, self-hosted LLM inference platform that keeps sensitive data on-premises. With GPU support, Ollama can handle production inference workloads for coding assistants, document processing, and customer service applications. Portainer's management capabilities make it easy to update Ollama, manage model storage, and monitor inference performance across your infrastructure.
