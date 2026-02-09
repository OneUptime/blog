# How to Run ComfyUI in Docker for AI Image Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, comfyui, stable diffusion, image generation, ai, gpu, docker compose

Description: Deploy ComfyUI in Docker for node-based AI image generation workflows using Stable Diffusion, SDXL, and other diffusion models.

---

ComfyUI is a node-based interface for Stable Diffusion that gives you granular control over every step of the image generation pipeline. Unlike simpler interfaces that hide the internals, ComfyUI lets you build custom workflows by connecting nodes that handle loading models, setting samplers, applying LoRAs, and post-processing. Running it in Docker keeps your host system clean from the heavy Python and CUDA dependencies it requires.

## Prerequisites

ComfyUI performs best with GPU acceleration. Here is what you need:

- Docker and Docker Compose installed
- NVIDIA GPU with at least 6 GB VRAM (12+ GB recommended for SDXL)
- NVIDIA drivers and nvidia-container-toolkit installed
- At least 30 GB of free disk space for models and generated images

```bash
# Verify GPU is available to Docker
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi

# Check available VRAM
nvidia-smi --query-gpu=memory.total,memory.free --format=csv
```

## Docker Compose Setup

Create a Docker Compose configuration for ComfyUI.

```yaml
# docker-compose.yml
# ComfyUI with GPU support, persistent models and output
version: "3.8"

services:
  comfyui:
    image: ghcr.io/ai-dock/comfyui:latest-cuda
    container_name: comfyui
    ports:
      # ComfyUI web interface
      - "8188:8188"
    volumes:
      # Persist models (checkpoints, LoRAs, VAEs, etc.)
      - ./models:/workspace/ComfyUI/models
      # Persist generated images
      - ./output:/workspace/ComfyUI/output
      # Persist custom nodes
      - ./custom_nodes:/workspace/ComfyUI/custom_nodes
      # Persist workflow files
      - ./workflows:/workspace/ComfyUI/user
    environment:
      - CLI_ARGS=--listen 0.0.0.0
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
# Create the required directories
mkdir -p models/checkpoints models/loras models/vae models/controlnet output custom_nodes workflows

# Start ComfyUI
docker compose up -d

# Monitor the startup process
docker compose logs -f comfyui
```

Once startup completes, open `http://localhost:8188` in your browser.

## Building a Custom Docker Image

If you need more control over the environment, build your own image.

```dockerfile
# Dockerfile
# Custom ComfyUI image with pre-installed dependencies
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# Install system dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv git wget && \
    rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Clone ComfyUI
RUN git clone https://github.com/comfyanonymous/ComfyUI.git /app

# Install Python dependencies
RUN pip3 install --no-cache-dir torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu121

RUN pip3 install --no-cache-dir -r requirements.txt

# Expose the default ComfyUI port
EXPOSE 8188

# Start ComfyUI listening on all interfaces
CMD ["python3", "main.py", "--listen", "0.0.0.0"]
```

Build and run:

```bash
# Build the custom image
docker build -t comfyui-custom .

# Run with GPU access and mounted directories
docker run -d \
  --name comfyui \
  --gpus all \
  -p 8188:8188 \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/custom_nodes:/app/custom_nodes \
  comfyui-custom
```

## Downloading Models

ComfyUI needs Stable Diffusion checkpoints in the models directory.

```bash
# Download Stable Diffusion 1.5 checkpoint
wget -P ./models/checkpoints/ \
  "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors"

# Download SDXL base model
wget -P ./models/checkpoints/ \
  "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"

# Download SDXL refiner model
wget -P ./models/checkpoints/ \
  "https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/resolve/main/sd_xl_refiner_1.0.safetensors"

# Download a VAE (improves color and detail quality)
wget -P ./models/vae/ \
  "https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors"
```

After downloading, refresh the ComfyUI interface to see the new models in the node dropdowns.

## Installing Custom Nodes

Custom nodes extend ComfyUI with additional functionality like face restoration, upscaling, and advanced controlnet support.

```bash
# Install ComfyUI Manager (the most useful custom node - provides a UI for installing other nodes)
cd custom_nodes
git clone https://github.com/ltdrdata/ComfyUI-Manager.git

# Install other popular custom nodes
git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git
git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git
git clone https://github.com/WASasquatch/was-node-suite-comfyui.git

# Go back to the project root
cd ..

# Restart ComfyUI to load the new custom nodes
docker compose restart comfyui

# Install node dependencies inside the container
docker exec comfyui pip3 install -r /app/custom_nodes/ComfyUI-Manager/requirements.txt
```

## Using the ComfyUI API

ComfyUI exposes an API that accepts workflow JSON definitions. This lets you automate image generation.

```python
# comfyui_api.py
# Script to submit a workflow to ComfyUI via its API
import json
import requests
import uuid
import time

COMFYUI_URL = "http://localhost:8188"

# Define a simple text-to-image workflow
workflow = {
    "3": {
        "class_type": "KSampler",
        "inputs": {
            "seed": 42,
            "steps": 20,
            "cfg": 7.0,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1.0,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["5", 0]
        }
    },
    "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
            "ckpt_name": "v1-5-pruned-emaonly.safetensors"
        }
    },
    "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
            "width": 512,
            "height": 512,
            "batch_size": 1
        }
    },
    "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "text": "a beautiful mountain landscape at sunset, detailed, photorealistic",
            "clip": ["4", 1]
        }
    },
    "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "text": "blurry, low quality, distorted",
            "clip": ["4", 1]
        }
    },
    "8": {
        "class_type": "VAEDecode",
        "inputs": {
            "samples": ["3", 0],
            "vae": ["4", 2]
        }
    },
    "9": {
        "class_type": "SaveImage",
        "inputs": {
            "filename_prefix": "api_output",
            "images": ["8", 0]
        }
    }
}

# Submit the workflow to ComfyUI
client_id = str(uuid.uuid4())
payload = {"prompt": workflow, "client_id": client_id}

response = requests.post(f"{COMFYUI_URL}/prompt", json=payload)
print(f"Queued: {response.json()}")
```

```bash
# Run the API script
python3 comfyui_api.py

# Check the output directory for the generated image
ls -la output/
```

## LoRA Support

LoRAs (Low-Rank Adaptations) let you add trained styles or concepts on top of base models.

```bash
# Download a LoRA model
wget -P ./models/loras/ \
  "https://civitai.com/api/download/models/example-lora.safetensors"
```

In the ComfyUI interface, add a "Load LoRA" node between the checkpoint loader and the CLIP text encoder to apply the LoRA to your generation.

## ControlNet Setup

ControlNet provides precise control over image composition through depth maps, edge detection, and pose estimation.

```bash
# Download ControlNet models
mkdir -p models/controlnet

wget -P ./models/controlnet/ \
  "https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_canny.pth"

wget -P ./models/controlnet/ \
  "https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth.pth"
```

## Monitoring and Resource Management

AI image generation is resource-intensive. Keep track of usage.

```bash
# Monitor GPU memory and utilization during generation
watch -n 1 nvidia-smi

# Check container resource usage
docker stats comfyui

# View ComfyUI logs for errors or warnings
docker compose logs -f comfyui

# If you run into out-of-memory errors, try these settings:
# - Use --lowvram or --medvram launch arguments
# - Reduce image resolution
# - Use fp16 instead of fp32 models
```

Add memory-saving arguments to the Docker Compose environment:

```yaml
  environment:
    # Use low VRAM mode for GPUs with less than 8 GB
    - CLI_ARGS=--listen 0.0.0.0 --lowvram
```

## Backing Up Workflows

Save your ComfyUI workflows as JSON files for version control.

```bash
# ComfyUI saves workflows to the user directory
# Back up all workflows
tar czf workflows-backup.tar.gz workflows/

# Share workflows by committing them to a git repository
cd workflows
git init && git add . && git commit -m "Saved ComfyUI workflows"
```

## Updating ComfyUI

```bash
# Pull the latest image
docker compose pull

# Recreate the container
docker compose up -d

# Update custom nodes inside the container
docker exec comfyui bash -c "cd /app/custom_nodes/ComfyUI-Manager && git pull"
```

## Summary

ComfyUI in Docker provides a powerful, node-based workflow for AI image generation. The visual node editor gives you complete control over the generation pipeline, from model loading through sampling to post-processing. Docker handles the complex CUDA and Python dependency management, while volume mounts keep your models, outputs, and custom nodes persistent. Whether you are experimenting with new diffusion models or building production image generation pipelines, this setup gives you a solid foundation.
