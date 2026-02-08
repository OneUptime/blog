# How to Run Text Generation WebUI in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, text generation, oobabooga, llm, web ui, ai, self-hosted, gpu

Description: Deploy Oobabooga's Text Generation WebUI in Docker to run and interact with large language models through a feature-rich web interface.

---

Text Generation WebUI (commonly known as Oobabooga) is one of the most popular self-hosted interfaces for running large language models. It supports a wide range of model formats including GGUF, GPTQ, AWQ, and EXL2. The interface includes features like chat mode, notebook mode, extensions for voice and image generation, and a built-in API. Running it in Docker keeps your system clean and makes the setup reproducible.

## Prerequisites

Text Generation WebUI benefits heavily from GPU acceleration. Here is what you need:

- Docker and Docker Compose installed
- NVIDIA GPU with at least 6 GB VRAM (8+ GB recommended)
- NVIDIA drivers and nvidia-container-toolkit installed
- At least 20 GB of free disk space for models

```bash
# Verify Docker is running
docker --version

# Check GPU availability
nvidia-smi

# Verify the NVIDIA container toolkit is installed
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

If you do not have a GPU, Text Generation WebUI can still run on CPU using GGUF models with llama.cpp, though inference will be significantly slower.

## Quick Start with Docker

The project provides official Docker support through their repository.

```bash
# Clone the repository for the Docker configuration files
git clone https://github.com/oobabooga/text-generation-webui.git
cd text-generation-webui
```

The project includes several Docker Compose configurations. Start with the GPU version:

```bash
# Start the WebUI with NVIDIA GPU support
# This builds the image and starts the container
docker compose up -d

# Monitor the build and startup process
docker compose logs -f
```

## Custom Docker Compose Configuration

For more control, create your own Docker Compose file.

```yaml
# docker-compose.yml
# Text Generation WebUI with GPU support and persistent storage
version: "3.8"

services:
  text-gen-webui:
    image: atinoda/text-generation-webui:default-nvidia
    container_name: text-gen-webui
    ports:
      # Main WebUI interface
      - "7860:7860"
      # API endpoint
      - "5000:5000"
      # Streaming API endpoint
      - "5005:5005"
    volumes:
      # Persist downloaded models
      - ./models:/app/models
      # Persist LoRA adapters
      - ./loras:/app/loras
      # Persist character definitions
      - ./characters:/app/characters
      # Persist presets and settings
      - ./presets:/app/presets
      # Persist extensions
      - ./extensions:/app/extensions
    environment:
      # Extra launch arguments for the WebUI
      - EXTRA_LAUNCH_ARGS=--listen --api --verbose
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped
```

```bash
# Create the necessary directories for volume mounts
mkdir -p models loras characters presets extensions

# Start the service
docker compose up -d

# Wait for the service to fully start (first run takes longer)
docker compose logs -f text-gen-webui
```

## CPU-Only Setup

If you do not have a GPU, use the CPU variant.

```yaml
# docker-compose-cpu.yml
# Text Generation WebUI running on CPU only
version: "3.8"

services:
  text-gen-webui:
    image: atinoda/text-generation-webui:default-cpu
    container_name: text-gen-webui
    ports:
      - "7860:7860"
      - "5000:5000"
      - "5005:5005"
    volumes:
      - ./models:/app/models
      - ./characters:/app/characters
    environment:
      # Use llama.cpp backend for CPU inference
      - EXTRA_LAUNCH_ARGS=--listen --api --loader llama.cpp
    deploy:
      resources:
        limits:
          # Limit memory usage to prevent OOM
          memory: 16G
    restart: unless-stopped
```

```bash
# Start with the CPU configuration
docker compose -f docker-compose-cpu.yml up -d
```

## Downloading Models

Models can be downloaded through the WebUI interface or via command line.

```bash
# Download a model using the WebUI's built-in downloader
# Navigate to http://localhost:7860 and use the Model tab

# Or download manually from Hugging Face
# Example: Download a quantized Llama model in GGUF format
docker exec text-gen-webui python3 download-model.py TheBloke/Llama-2-7B-Chat-GGUF

# For GGUF files, you can also download directly
wget -P ./models/ https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
```

After downloading, refresh the model list in the WebUI and select your model from the dropdown.

## Configuring Model Loading

Different model formats require different loaders. Here are the common configurations:

### GGUF Models (recommended for CPU and mixed CPU/GPU)

```bash
# In the WebUI, set these parameters on the Model tab:
# Loader: llama.cpp
# n-gpu-layers: 35 (adjust based on VRAM)
# threads: 8 (match your CPU cores)
# context_length: 4096
# n_batch: 512
```

### GPTQ Models (GPU only)

```bash
# Loader: ExLlamav2_HF or AutoGPTQ
# gpu-memory: auto
# context_length: 4096
```

## Using the API

Text Generation WebUI provides an OpenAI-compatible API when launched with the `--api` flag.

```bash
# Test the API with a simple completion request
curl http://localhost:5000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-2-7b-chat",
    "messages": [
      {"role": "user", "content": "What is Docker?"}
    ],
    "temperature": 0.7,
    "max_tokens": 200
  }' | python3 -m json.tool
```

```python
# Use the OpenAI Python library to connect to Text Generation WebUI
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:5000/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="llama-2-7b-chat",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain the benefits of containerization."}
    ],
    temperature=0.7
)

print(response.choices[0].message.content)
```

## Extensions

Text Generation WebUI supports extensions that add functionality like voice input, image generation, and long-term memory.

```bash
# Install extensions inside the container
docker exec -it text-gen-webui bash

# From inside the container, extensions are in /app/extensions/
ls /app/extensions/

# Popular extensions include:
# - silero_tts (text-to-speech)
# - whisper_stt (speech-to-text)
# - superbooga (long-term memory with embeddings)
# - multimodal (image input support)
```

Enable extensions through the Session tab in the WebUI or via launch arguments:

```yaml
# Add extensions to the launch arguments
  environment:
    - EXTRA_LAUNCH_ARGS=--listen --api --extensions silero_tts whisper_stt
```

## Character Cards and Chat Modes

Text Generation WebUI supports multiple interaction modes:

- **Chat mode**: Conversational interface with system prompts
- **Instruct mode**: Follows specific instruction templates
- **Notebook mode**: Free-form text completion

Character cards define personality, system prompts, and example conversations. Place custom YAML files in the `characters` directory:

```yaml
# characters/docker-expert.yaml
# Custom character definition for a Docker expert assistant
name: Docker Expert
context: |
  You are an experienced Docker and container infrastructure engineer.
  You provide clear, practical advice about Docker, Kubernetes, and container best practices.
  You always include specific commands and examples in your responses.
greeting: |
  Hello! I am your Docker expert assistant. Ask me anything about containers, images, Docker Compose, or container orchestration.
```

## Monitoring and Troubleshooting

```bash
# Check container resource usage
docker stats text-gen-webui

# Monitor GPU memory during model loading
watch -n 1 nvidia-smi

# View application logs
docker compose logs -f text-gen-webui

# Check if the WebUI port is accessible
curl -s -o /dev/null -w "%{http_code}" http://localhost:7860

# Restart the container if the model gets stuck
docker compose restart text-gen-webui
```

## Updating the WebUI

```bash
# Pull the latest image
docker compose pull

# Recreate the container with the new image
docker compose up -d

# Verify the update
docker compose logs -f text-gen-webui
```

## Performance Tips

- Use GGUF quantized models (Q4_K_M is a good balance of quality and speed)
- Set `n-gpu-layers` to offload as many layers to GPU as your VRAM allows
- Reduce `context_length` if you are running out of memory
- Enable `mlock` to prevent the model from being swapped to disk
- Use the `--no-mmap` flag if you experience slow loading times on network storage

## Summary

Text Generation WebUI gives you a full-featured interface for running large language models locally. Docker simplifies the deployment by handling the complex dependency chain of CUDA libraries, Python packages, and model backends. Whether you use it for experimentation, development, or as a private AI assistant, the combination of Docker and Text Generation WebUI provides a flexible and powerful setup for local LLM inference.
