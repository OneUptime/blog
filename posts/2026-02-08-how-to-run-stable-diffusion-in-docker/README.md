# How to Run Stable Diffusion in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, stable diffusion, AI, machine learning, GPU, NVIDIA, image generation, containers

Description: Run Stable Diffusion image generation models in Docker with GPU support, covering setup, model management, web UI, and API access.

---

Stable Diffusion is an open-source text-to-image AI model that generates images from text prompts. Running it in Docker keeps your host system clean, makes the setup reproducible, and lets you manage different model versions without dependency conflicts. The main challenge is getting GPU passthrough working correctly, since Stable Diffusion needs a GPU to generate images in a reasonable amount of time.

This guide walks you through setting up Stable Diffusion in Docker with NVIDIA GPU support, both for interactive use and API-based generation.

## Prerequisites

You need an NVIDIA GPU with at least 4GB of VRAM (8GB+ recommended), the NVIDIA drivers installed on the host, and the NVIDIA Container Toolkit.

Verify your GPU setup:

```bash
# Check that the NVIDIA driver is installed
nvidia-smi

# Check Docker can see the GPU
docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi
```

If the second command fails, install the NVIDIA Container Toolkit:

```bash
# Add the NVIDIA container toolkit repository
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Install the toolkit
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

## Option 1: Run Stable Diffusion WebUI (AUTOMATIC1111)

The most popular way to use Stable Diffusion is through the AUTOMATIC1111 web interface. Here is how to run it in Docker.

Create the project structure:

```bash
# Create directories for models and outputs
mkdir -p stable-diffusion-docker/{models,outputs,extensions}
cd stable-diffusion-docker
```

Create the Docker Compose file:

```yaml
# docker-compose.yml - Stable Diffusion WebUI with GPU
services:
  stable-diffusion:
    image: ghcr.io/neggles/sd-webui-docker:latest
    container_name: stable-diffusion
    ports:
      - "7860:7860"
    volumes:
      # Persist models so they don't re-download on restart
      - ./models:/app/models
      # Persist generated images
      - ./outputs:/app/outputs
      # Persist extensions
      - ./extensions:/app/extensions
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - CLI_ARGS=--xformers --api --listen
    restart: unless-stopped
```

Start the service:

```bash
# Pull and start the container
docker compose up -d

# Watch the logs (first run downloads the model, which takes a while)
docker compose logs -f stable-diffusion
```

The first startup downloads the Stable Diffusion model weights (several gigabytes). Once it finishes, access the web UI at `http://localhost:7860`.

## Option 2: Build a Custom Image

If you want full control over the setup, build your own image:

```dockerfile
# Dockerfile - Custom Stable Diffusion setup
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    git \
    wget \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -s /bin/bash sduser
USER sduser
WORKDIR /home/sduser

# Clone the WebUI repository
RUN git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git

WORKDIR /home/sduser/stable-diffusion-webui

# Create a virtual environment and install dependencies
RUN python3 -m venv venv && \
    . venv/bin/activate && \
    pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install xformers for memory-efficient attention
RUN . venv/bin/activate && \
    pip install --no-cache-dir xformers

# Expose the WebUI port
EXPOSE 7860

# Start the WebUI with GPU support
CMD ["bash", "-c", ". venv/bin/activate && python3 launch.py --listen --api --xformers"]
```

Build and run:

```bash
# Build the custom image
docker build -t sd-custom:latest .

# Run with GPU access
docker run -d \
  --gpus all \
  -p 7860:7860 \
  -v $(pwd)/models:/home/sduser/stable-diffusion-webui/models \
  -v $(pwd)/outputs:/home/sduser/stable-diffusion-webui/outputs \
  --name sd-custom \
  sd-custom:latest
```

## Option 3: API-Only Setup with Diffusers

For programmatic access without the web UI, use Hugging Face's diffusers library:

```dockerfile
# Dockerfile.api - Stable Diffusion API server
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cu121

RUN pip install --no-cache-dir \
    diffusers \
    transformers \
    accelerate \
    safetensors \
    fastapi \
    uvicorn \
    Pillow

WORKDIR /app
COPY api_server.py /app/

EXPOSE 8000
CMD ["python3", "api_server.py"]
```

Create the API server:

```python
# api_server.py - Simple Stable Diffusion API
import io
import base64
from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel
import torch
from diffusers import StableDiffusionPipeline

app = FastAPI(title="Stable Diffusion API")

# Load the model at startup
print("Loading Stable Diffusion model...")
pipe = StableDiffusionPipeline.from_pretrained(
    "stabilityai/stable-diffusion-2-1",
    torch_dtype=torch.float16,
    variant="fp16",
)
pipe = pipe.to("cuda")
# Enable memory-efficient attention
pipe.enable_attention_slicing()
print("Model loaded successfully")


class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 30
    guidance_scale: float = 7.5
    seed: int = -1


@app.post("/generate")
async def generate_image(req: GenerateRequest):
    """Generate an image from a text prompt."""
    generator = None
    if req.seed >= 0:
        generator = torch.Generator("cuda").manual_seed(req.seed)

    image = pipe(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        width=req.width,
        height=req.height,
        num_inference_steps=req.steps,
        guidance_scale=req.guidance_scale,
        generator=generator,
    ).images[0]

    # Convert image to PNG bytes
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)

    return Response(content=buf.getvalue(), media_type="image/png")


@app.get("/health")
async def health_check():
    return {"status": "ok", "device": str(pipe.device)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

Run the API server:

```yaml
# docker-compose.api.yml - API-only Stable Diffusion
services:
  sd-api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "8000:8000"
    volumes:
      # Cache downloaded models between restarts
      - model-cache:/root/.cache/huggingface
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 120s  # Model loading takes time

volumes:
  model-cache:
```

Test the API:

```bash
# Generate an image using the API
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a cat sitting on a mountain at sunset, digital art", "steps": 30}' \
  --output generated.png

# Check the API health
curl http://localhost:8000/health
```

## Managing Models

Store models in a shared volume to avoid re-downloading:

```bash
# Download a specific model checkpoint
mkdir -p models/Stable-diffusion
wget -O models/Stable-diffusion/v2-1_768-ema-pruned.safetensors \
  "https://huggingface.co/stabilityai/stable-diffusion-2-1/resolve/main/v2-1_768-ema-pruned.safetensors"
```

Mount additional model types:

```yaml
# docker-compose.yml with full model directory structure
services:
  stable-diffusion:
    image: sd-webui:latest
    volumes:
      - ./models/Stable-diffusion:/app/models/Stable-diffusion
      - ./models/Lora:/app/models/Lora
      - ./models/VAE:/app/models/VAE
      - ./models/ControlNet:/app/models/ControlNet
      - ./outputs:/app/outputs
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Memory Optimization

For GPUs with limited VRAM (4-6GB), enable memory optimizations:

```yaml
# docker-compose.yml with memory optimization flags
services:
  stable-diffusion:
    image: sd-webui:latest
    environment:
      # Enable memory optimizations for lower VRAM GPUs
      - CLI_ARGS=--xformers --medvram --api --listen
      # For very low VRAM (4GB), use --lowvram instead of --medvram
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

The flags explained:
- `--xformers` - Memory-efficient cross-attention (recommended for all GPUs)
- `--medvram` - Moves parts of the model to CPU when not needed (6GB VRAM)
- `--lowvram` - Aggressive memory saving at the cost of speed (4GB VRAM)
- `--opt-sub-quad-attention` - Alternative to xformers if it does not install

## Running Without GPU (CPU Only)

If you do not have a GPU, you can still run Stable Diffusion on CPU, but image generation will take several minutes per image instead of seconds:

```yaml
# docker-compose.cpu.yml - CPU-only Stable Diffusion
services:
  stable-diffusion:
    image: sd-webui:latest
    ports:
      - "7860:7860"
    environment:
      - CLI_ARGS=--use-cpu all --no-half --listen --api
    volumes:
      - ./models:/app/models
      - ./outputs:/app/outputs
    restart: unless-stopped
```

## Security Considerations

Stable Diffusion WebUI should not be exposed to the public internet without protection:

```yaml
# docker-compose.yml with basic auth via Nginx
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./htpasswd:/etc/nginx/.htpasswd:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - stable-diffusion
    restart: unless-stopped

  stable-diffusion:
    image: sd-webui:latest
    # No ports exposed - only accessible through Nginx
    environment:
      - CLI_ARGS=--xformers --api --listen
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

Create basic auth credentials:

```bash
# Generate htpasswd file
sudo apt-get install apache2-utils
htpasswd -c htpasswd admin
```

## Summary

Running Stable Diffusion in Docker keeps your setup clean and reproducible. The key requirements are NVIDIA GPU drivers on the host, the NVIDIA Container Toolkit, and a GPU with at least 4GB of VRAM. Use the AUTOMATIC1111 WebUI for interactive use, or build an API server with the diffusers library for programmatic access. Store models in mounted volumes so they persist across container restarts. For GPUs with limited memory, enable `--xformers` and `--medvram` flags. Always put a reverse proxy with authentication in front of the WebUI if it will be accessible from the network.
