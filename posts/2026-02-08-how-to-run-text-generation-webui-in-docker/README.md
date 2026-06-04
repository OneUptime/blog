# How to Run Text Generation WebUI in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Text generation, Oobabooga, LLM, Web UI, AI, Self-Hosted, GPU

Description: Deploy Oobabooga's Text Generation WebUI in Docker to run and interact with large language models through a feature-rich web interface.

---

Text Generation WebUI (now branded as TextGen, and commonly known as Oobabooga) is one of the most popular self-hosted interfaces for running large language models. It supports a wide range of backends and model formats including GGUF, Transformers models, and ExLlamaV3/EXL3 models. The interface includes features like chat mode, notebook mode, extensions for voice and image generation, and a built-in API. Running it in Docker keeps your system clean and makes the setup reproducible.

## Prerequisites

Text Generation WebUI benefits heavily from GPU acceleration. Here is what you need:

- Docker and Docker Compose v2.17 or later installed
- NVIDIA GPU with at least 6 GB VRAM (8+ GB recommended)
- NVIDIA drivers and nvidia-container-toolkit installed
- At least 20 GB of free disk space for models

```bash
# Verify Docker is running

docker --version

# Check GPU availability
nvidia-smi

# Verify the NVIDIA container toolkit is installed
docker run --rm --gpus all nvidia/cuda:12.8.1-base-ubuntu22.04 nvidia-smi
```

If you do not have a GPU, Text Generation WebUI can still run on CPU using GGUF models with llama.cpp, though inference will be significantly slower.

## Quick Start with Docker

The project provides official Docker support through their repository.

```bash
# Clone the repository for the Docker configuration files
git clone https://github.com/oobabooga/textgen.git
cd textgen/docker/nvidia
cp ../.env.example .env
mkdir -p user_data
```

The project includes several Docker Compose configurations under `docker/`. Start with the NVIDIA GPU version:

```bash
# Start the WebUI with NVIDIA GPU support
# This builds the image and starts the container
docker compose up --build -d

# Monitor the build and startup process
docker compose logs -f
```

## Custom Docker Compose Configuration

For more control, use a Docker Compose file based on the project's NVIDIA Docker configuration.

```yaml
# docker-compose.yml
# Text Generation WebUI with GPU support and persistent storage
version: "3.3"

services:
  textgen:
    build:
      context: .
      args:
        # Set this for your GPU architecture if needed
        TORCH_CUDA_ARCH_LIST: ${TORCH_CUDA_ARCH_LIST:-8.6;8.9+PTX}
        BUILD_EXTENSIONS: ${BUILD_EXTENSIONS:-}
        APP_GID: ${APP_GID:-6972}
        APP_UID: ${APP_UID:-6972}
    env_file: .env
    user: "${APP_RUNTIME_UID:-6972}:${APP_RUNTIME_GID:-6972}"
    ports:
      # Main WebUI interface
      - "${HOST_PORT:-7860}:${CONTAINER_PORT:-7860}"
      # API endpoint, enabled with --api
      - "${HOST_API_PORT:-5000}:${CONTAINER_API_PORT:-5000}"
    volumes:
      # Persist models, LoRAs, characters, presets, settings, and CMD_FLAGS.txt
      - ./user_data:/home/app/textgen/user_data
    stdin_open: true
    tty: true
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

```bash
# Create the necessary user data directories and persistent launch flags
cp ../.env.example .env
mkdir -p user_data/models user_data/loras user_data/characters user_data/presets user_data/extensions
printf '%s\n' '--listen --api --verbose' > user_data/CMD_FLAGS.txt

# Start the service
docker compose up --build -d

# Wait for the service to fully start (first run takes longer)
docker compose logs -f textgen
```

## CPU-Only Setup

If you do not have a GPU, use the CPU variant.

```yaml
# docker-compose.yml
# Text Generation WebUI running on CPU only
version: "3.3"

services:
  textgen:
    build:
      context: .
      args:
        BUILD_EXTENSIONS: ${BUILD_EXTENSIONS:-}
        APP_GID: ${APP_GID:-6972}
        APP_UID: ${APP_UID:-6972}
    env_file: .env
    user: "${APP_RUNTIME_UID:-6972}:${APP_RUNTIME_GID:-6972}"
    ports:
      - "${HOST_PORT:-7860}:${CONTAINER_PORT:-7860}"
      - "${HOST_API_PORT:-5000}:${CONTAINER_API_PORT:-5000}"
    volumes:
      - ./user_data:/home/app/textgen/user_data
    stdin_open: true
    tty: true
```

```bash
# Start with the CPU configuration
cd textgen/docker/cpu
cp ../.env.example .env
mkdir -p user_data
printf '%s\n' '--listen --api --loader llama.cpp' > user_data/CMD_FLAGS.txt
docker compose up --build -d
```

## Downloading Models

Models can be downloaded through the WebUI interface or via command line.

```bash
# Download a model using the WebUI's built-in downloader
# Navigate to http://localhost:7860 and use the Model tab

# Or download manually from Hugging Face
# Example: Download a quantized Llama model in GGUF format
docker compose exec textgen python3 download-model.py TheBloke/Llama-2-7B-Chat-GGUF

# For GGUF files, you can also download directly
wget -P ./user_data/models/ https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
```

After downloading, refresh the model list in the WebUI and select your model from the dropdown.

## Configuring Model Loading

Different model formats require different loaders. Here are the common configurations:

### GGUF Models (recommended for CPU and mixed CPU/GPU)

```bash
# In the WebUI, set these parameters on the Model tab:
# Loader: llama.cpp
# gpu-layers or n-gpu-layers: 35 (adjust based on VRAM, or use -1 for auto)
# threads: 8 (match your CPU cores)
# ctx-size: 4096
# batch-size: 512
```

### ExLlamaV3/EXL3 Models (GPU only)

```bash
# Loader: ExLlamav3_HF or ExLlamav3
# gpu-split: 20,7,7 (for multi-GPU systems, adjust based on available VRAM)
# ctx-size: 4096
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
# Open a shell inside the running container
docker compose exec textgen bash

# From inside the container, bundled extensions are in /home/app/textgen/extensions/
ls /home/app/textgen/extensions/

# Popular extensions include:
# - silero_tts (text-to-speech)
# - whisper_stt (speech-to-text)
# - superbooga (long-term memory with embeddings)
# - send_pictures (send images to multimodal models)
```

Enable extensions through the Session tab in the WebUI or via launch arguments:

```bash
# Add extensions to the persistent launch arguments
printf '%s\n' '--listen --api --extensions silero_tts whisper_stt' > user_data/CMD_FLAGS.txt
```

## Character Cards and Chat Modes

Text Generation WebUI supports multiple interaction modes:

- **Chat mode**: Conversational interface with system prompts
- **Instruct mode**: Follows specific instruction templates
- **Notebook mode**: Free-form text completion

Character cards define personality, system prompts, and example conversations. Place custom YAML files in the `user_data/characters` directory:

```yaml
# user_data/characters/docker-expert.yaml
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
docker compose stats textgen

# Monitor GPU memory during model loading
watch -n 1 nvidia-smi

# View application logs
docker compose logs -f textgen

# Check if the WebUI port is accessible
curl -s -o /dev/null -w "%{http_code}" http://localhost:7860

# Restart the container if the model gets stuck
docker compose restart textgen
```

## Updating the WebUI

```bash
# Pull the latest project source
cd ../..
git pull

# Rebuild and recreate the container
cd docker/nvidia
docker compose up --build -d

# Verify the update
docker compose logs -f textgen
```

## Performance Tips

- Use GGUF quantized models (Q4_K_M is a good balance of quality and speed)
- Set `gpu-layers` or `n-gpu-layers` to offload as many layers to GPU as your VRAM allows
- Reduce `ctx-size` if you are running out of memory
- Enable `mlock` to prevent the model from being swapped to disk
- Use the `--no-mmap` flag if you experience slow loading times on network storage

## Summary

Text Generation WebUI gives you a full-featured interface for running large language models locally. Docker simplifies the deployment by handling the complex dependency chain of CUDA libraries, Python packages, and model backends. Whether you use it for experimentation, development, or as a private AI assistant, the combination of Docker and Text Generation WebUI provides a flexible and powerful setup for local LLM inference.
