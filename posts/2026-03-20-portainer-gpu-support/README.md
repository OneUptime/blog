# How to Enable GPU Support for Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, GPU, Machine Learning

Description: Learn how to enable GPU access for Docker containers in Portainer using NVIDIA Container Toolkit for machine learning and compute workloads.

## Introduction

GPU-accelerated containers are essential for machine learning inference, model training, video transcoding, and scientific computing. Portainer supports configuring GPU access through the NVIDIA Container Toolkit. This guide covers the setup from host configuration to deploying GPU-enabled containers.

## Prerequisites

- NVIDIA GPU on the Docker host
- NVIDIA drivers installed on the host
- Docker Engine installed
- Portainer installed and connected to the GPU-enabled host

## Step 1: Install NVIDIA Container Toolkit on the Host

Before configuring in Portainer, the host must have the NVIDIA Container Toolkit installed:

```bash
# Install NVIDIA Container Toolkit (Ubuntu/Debian)

# Install prerequisites and add the NVIDIA package repository
sudo apt-get update
sudo apt-get install -y --no-install-recommends ca-certificates curl gnupg2
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
    sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Install the toolkit
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use the NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker

# Restart Docker
sudo systemctl restart docker
```

```bash
# For RHEL/CentOS/Fedora:
sudo dnf install -y curl
curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | \
    sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo

sudo dnf install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

## Step 2: Verify GPU Access Works

```bash
# Test GPU access from a container (without Portainer first):
docker run --rm --gpus all ubuntu nvidia-smi

# Expected output (example):
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 545.23.08    Driver Version: 545.23.08    CUDA Version: 12.3    |
|-------------------------------|----------------------|----------------------+
| GPU  Name        Persistence-M | Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap |         Memory-Usage | GPU-Util  Compute M. |
|===============================|======================|======================|
|   0  NVIDIA A100-SXM...    On  | 00000000:00:04.0 Off |                    0 |
| N/A   30C    P0    55W / 400W  |      0MiB / 40960MiB |      0%      Default |
+-----------------------------------------------------------------------------+
```

## Step 3: Enable GPU in Portainer (Docker Compose / Stack)

In Portainer on a Docker Standalone environment, configure GPU access in the stack's Compose file under `deploy.resources`:

```yaml
# gpu-workload-stack.yml
services:
  # ML inference service with GPU access
  inference:
    image: myorg/ml-inference:cuda12
    restart: unless-stopped
    shm_size: '8g'   # Large shared memory for ML workloads
    deploy:
      resources:
        reservations:
          devices:
            # Reserve all available GPUs
            - driver: nvidia
              count: all
              capabilities: [gpu]
    environment:
      - MODEL_PATH=/models/my-model
    volumes:
      - model_data:/models

  # Training job (uses specific GPU)
  trainer:
    image: pytorch/pytorch:2.2.0-cuda12.1-cudnn8-devel
    restart: "no"   # One-time training job
    shm_size: '16g'
    deploy:
      resources:
        reservations:
          devices:
            # Reserve a specific GPU by index
            - driver: nvidia
              device_ids: ["0"]   # GPU 0 only
              capabilities: [gpu]
    command: python train.py --epochs 100 --batch-size 32

volumes:
  model_data:
```

## Step 4: Enable GPU for Individual Containers

For a single container (not a stack) on a Docker Standalone environment, Portainer BE allows GPU configuration in the container creation form. If the GPU section is missing, first enable **Show GPU in the UI** and add the GPU under **Environment details > Setup**:

1. Navigate to **Containers > Add container**.
2. Scroll to **Runtime & Resources**.
3. Find the **GPU** section.
4. Enable **Use all GPUs** or specify individual GPU IDs.

The equivalent Docker CLI:

```bash
# Access all GPUs:
docker run --gpus all \
  myorg/ml-app:latest

# Access specific GPU by index:
docker run --gpus '"device=0"' \
  myorg/ml-app:latest

# Access two specific GPUs:
docker run --gpus '"device=0,1"' \
  myorg/ml-app:latest

# Access GPU with specific capabilities:
docker run --gpus 'all,"capabilities=compute,utility"' \
  myorg/ml-app:latest
```

## Step 5: Common GPU Workloads

### Ollama (Local LLM Inference)

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

### Stable Diffusion

```yaml
services:
  stable-diffusion:
    image: ghcr.io/automatic1111/stable-diffusion-webui:latest
    restart: unless-stopped
    ports:
      - "7860:7860"
    volumes:
      - sd_models:/app/models
    shm_size: '8g'
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Transcoding with NVENC

```yaml
services:
  ffmpeg-transcoder:
    image: jrottenberg/ffmpeg:5.1-nvidia
    restart: unless-stopped
    environment:
      - NVIDIA_DRIVER_CAPABILITIES=video,utility
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              capabilities: [gpu]
```

## Step 6: Monitor GPU Usage

Inside the container:

```bash
# Via Portainer console:
nvidia-smi   # Static GPU info
watch -n 1 nvidia-smi   # Live GPU monitoring

# GPU memory usage:
nvidia-smi --query-gpu=memory.used,memory.free --format=csv
```

On the host:

```bash
# Monitor GPU usage across all containers:
nvidia-smi dmon -s u   # Utilization monitoring
```

## Troubleshooting GPU Access

```bash
# Error: "could not select device driver "nvidia" with capabilities: [[gpu]]"
# Fix: ensure NVIDIA Container Toolkit is installed and configured
sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker

# Error: "Failed to initialize NVML"
# Fix: check NVIDIA driver installation
nvidia-smi   # Should work on the host

# Error: GPU not visible inside container
# Fix: check the container GPU request and any CUDA_VISIBLE_DEVICES restriction
# If CUDA_VISIBLE_DEVICES is set, use a comma-separated list like "0" or "0,1",
# or unset it to expose all GPUs requested by --gpus / Compose
```

## Conclusion

Enabling GPU support for containers in Portainer requires proper host setup (NVIDIA drivers + Container Toolkit) followed by configuring GPU resources in the container or stack definition. Once set up, Portainer makes it straightforward to deploy and manage GPU-accelerated workloads - from machine learning inference to video transcoding - as part of your standard container management workflow.
