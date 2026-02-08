# How to Run Automatic1111 Web UI in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, automatic1111, stable diffusion, web ui, image generation, ai, gpu, self-hosted

Description: Deploy the Automatic1111 Stable Diffusion Web UI in Docker for AI image generation with a user-friendly interface and extensive extension support.

---

Automatic1111 (also known as AUTOMATIC1111/stable-diffusion-webui) is the most widely used web interface for Stable Diffusion. It offers a comprehensive feature set including text-to-image, image-to-image, inpainting, outpainting, upscaling, and support for hundreds of community extensions. Running it in Docker isolates the complex Python and CUDA dependencies from your host system and makes the setup portable.

## Prerequisites

- Docker and Docker Compose installed
- NVIDIA GPU with at least 4 GB VRAM (8+ GB recommended)
- NVIDIA drivers and nvidia-container-toolkit
- 20 GB of free disk space minimum

```bash
# Verify NVIDIA GPU access in Docker
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi

# Check available disk space
df -h .
```

## Docker Compose Setup

Here is a production-ready Docker Compose configuration for Automatic1111.

```yaml
# docker-compose.yml
# Automatic1111 Stable Diffusion WebUI with GPU support
version: "3.8"

services:
  automatic1111:
    image: ghcr.io/ai-dock/stable-diffusion-webui:latest-cuda
    container_name: automatic1111
    ports:
      # Web UI interface
      - "7860:7860"
    volumes:
      # Persist model checkpoints
      - ./models/Stable-diffusion:/workspace/stable-diffusion-webui/models/Stable-diffusion
      # Persist LoRA models
      - ./models/Lora:/workspace/stable-diffusion-webui/models/Lora
      # Persist VAE models
      - ./models/VAE:/workspace/stable-diffusion-webui/models/VAE
      # Persist ControlNet models
      - ./models/ControlNet:/workspace/stable-diffusion-webui/models/ControlNet
      # Persist generated images
      - ./outputs:/workspace/stable-diffusion-webui/outputs
      # Persist extensions
      - ./extensions:/workspace/stable-diffusion-webui/extensions
    environment:
      - CLI_ARGS=--xformers --api --listen
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
# Create all required directories
mkdir -p models/Stable-diffusion models/Lora models/VAE models/ControlNet outputs extensions

# Start the service
docker compose up -d

# Watch the logs for progress (first start downloads dependencies)
docker compose logs -f automatic1111
```

## Building from Source

If you need full control over the build process, create a custom Dockerfile.

```dockerfile
# Dockerfile
# Automatic1111 Web UI built from source
FROM nvidia/cuda:12.1.1-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    git wget libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash sduser
WORKDIR /home/sduser

# Clone the repository
RUN git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
WORKDIR /home/sduser/stable-diffusion-webui

# Set up the Python virtual environment and install dependencies
RUN python3 -m venv venv && \
    . venv/bin/activate && \
    pip install --no-cache-dir torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu121

# Set ownership
RUN chown -R sduser:sduser /home/sduser

USER sduser

EXPOSE 7860

# Launch the WebUI with automatic dependency installation
ENTRYPOINT ["bash", "-c", ". venv/bin/activate && python3 launch.py --listen --api --xformers --skip-torch-cuda-test"]
```

```bash
# Build the image (this takes 10-15 minutes)
docker build -t automatic1111-custom .

# Run the custom image
docker run -d \
  --name automatic1111 \
  --gpus all \
  -p 7860:7860 \
  -v $(pwd)/models/Stable-diffusion:/home/sduser/stable-diffusion-webui/models/Stable-diffusion \
  -v $(pwd)/outputs:/home/sduser/stable-diffusion-webui/outputs \
  automatic1111-custom
```

## Downloading Models

Download Stable Diffusion model checkpoints into the models directory.

```bash
# Download Stable Diffusion 1.5
wget -P ./models/Stable-diffusion/ \
  "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors"

# Download SDXL Base
wget -P ./models/Stable-diffusion/ \
  "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"

# Download a popular community model (example: Dreamshaper)
# Visit civitai.com for more community models

# Download LoRA models for style customization
wget -P ./models/Lora/ \
  "https://huggingface.co/example/lora-model/resolve/main/style-lora.safetensors"

# Download a VAE for better color accuracy
wget -P ./models/VAE/ \
  "https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors"
```

After downloading, the models appear in the checkpoint dropdown at the top of the WebUI.

## Using the API

Automatic1111 exposes a comprehensive REST API when started with the `--api` flag.

```bash
# Check the API is available
curl http://localhost:7860/sdapi/v1/sd-models | python3 -m json.tool

# Generate an image via the API
curl -X POST http://localhost:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a futuristic city skyline at night, neon lights, cyberpunk, detailed",
    "negative_prompt": "blurry, low quality, distorted, watermark",
    "steps": 25,
    "width": 512,
    "height": 512,
    "cfg_scale": 7,
    "sampler_name": "DPM++ 2M Karras",
    "seed": -1,
    "batch_size": 1
  }' -o response.json
```

Extract and save the generated image:

```python
# save_image.py
# Extract the base64 image from the API response and save it
import json
import base64

with open("response.json") as f:
    data = json.load(f)

# The image is returned as base64-encoded PNG
image_data = base64.b64decode(data["images"][0])
with open("generated_image.png", "wb") as f:
    f.write(image_data)

print("Image saved as generated_image.png")
```

## Batch Image Generation

```python
# batch_generate.py
# Generate multiple images with different prompts
import requests
import base64
import json

API_URL = "http://localhost:7860/sdapi/v1/txt2img"

prompts = [
    "a serene mountain lake at dawn, photorealistic, 8k",
    "a cozy cabin in the snow, warm lighting, detailed",
    "an underwater coral reef, tropical fish, vibrant colors",
]

for i, prompt in enumerate(prompts):
    payload = {
        "prompt": prompt,
        "negative_prompt": "blurry, low quality",
        "steps": 25,
        "width": 512,
        "height": 512,
        "cfg_scale": 7,
        "sampler_name": "DPM++ 2M Karras",
        "seed": -1
    }

    response = requests.post(API_URL, json=payload)
    data = response.json()

    image_data = base64.b64decode(data["images"][0])
    filename = f"batch_image_{i}.png"
    with open(filename, "wb") as f:
        f.write(image_data)
    print(f"Saved {filename}")
```

## Installing Extensions

Extensions add powerful features like ControlNet, face restoration, and animation.

```bash
# Install extensions by cloning them into the extensions directory
cd extensions

# ControlNet - precise image composition control
git clone https://github.com/Mikubill/sd-webui-controlnet.git

# Deforum - animation and video generation
git clone https://github.com/deforum-art/sd-webui-deforum.git

# Image browser - gallery for generated images
git clone https://github.com/AlUlkesh/stable-diffusion-webui-images-browser.git

# Ultimate SD Upscale - high-resolution image upscaling
git clone https://github.com/Coyote-A/ultimate-upscale-for-automatic1111.git

cd ..

# Restart to load the new extensions
docker compose restart automatic1111
```

## Memory Optimization

Running on GPUs with limited VRAM requires optimization flags.

```yaml
# Environment variables for different VRAM scenarios
  environment:
    # For 8+ GB VRAM (recommended)
    - CLI_ARGS=--xformers --api --listen

    # For 6 GB VRAM
    # - CLI_ARGS=--medvram --xformers --api --listen

    # For 4 GB VRAM
    # - CLI_ARGS=--lowvram --xformers --api --listen

    # For CPU only (very slow)
    # - CLI_ARGS=--skip-torch-cuda-test --use-cpu all --api --listen
```

## Configuring Settings

You can set default parameters by mounting a config file.

```json
// config.json - Place in the WebUI root directory
// Sets default generation parameters
{
  "sd_model_checkpoint": "v1-5-pruned-emaonly.safetensors",
  "sd_vae": "vae-ft-mse-840000-ema-pruned.safetensors",
  "CLIP_stop_at_last_layers": 2,
  "samples_save": true,
  "samples_format": "png",
  "grid_save": true,
  "save_txt": true,
  "enable_pnginfo": true
}
```

## Monitoring

```bash
# Watch GPU utilization during image generation
watch -n 1 nvidia-smi

# Monitor container resource usage
docker stats automatic1111

# Check the output directory for generated images
ls -lt outputs/txt2img-images/ | head -10

# View recent logs
docker compose logs --tail 50 automatic1111
```

## Updating

```bash
# Pull the latest image
docker compose pull

# Recreate the container with the updated image
docker compose up -d

# Update extensions
for ext in extensions/*/; do
  (cd "$ext" && git pull)
done

# Restart after updating extensions
docker compose restart automatic1111
```

## Summary

Automatic1111's Stable Diffusion Web UI in Docker gives you a powerful, self-contained image generation platform. The extensive API support makes it easy to integrate into automated workflows, while the extension ecosystem adds capabilities like ControlNet and animation. Docker containers handle the dependency management, and volume mounts keep your models, outputs, and extensions persistent across updates. This combination makes Automatic1111 in Docker a practical choice for both experimentation and production image generation.
