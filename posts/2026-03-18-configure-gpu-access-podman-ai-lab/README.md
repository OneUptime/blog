# How to Configure GPU Access for Podman AI Lab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, GPU, NVIDIA, CUDA, Machine Learning, Hardware Acceleration

Description: Learn how to configure GPU passthrough for Podman AI Lab to accelerate AI model inference with NVIDIA and AMD GPUs.

---

> GPU acceleration can speed up AI inference by 10-50x compared to CPU-only execution.

Running AI models on a CPU works but can be slow, especially for larger models. If your system has a compatible GPU, you can pass it through to Podman containers to dramatically accelerate inference. This guide covers configuring NVIDIA and AMD GPU access for Podman AI Lab containers.

---

## Prerequisites

```bash
# Check if you have a GPU available

lspci | grep -iE "vga|3d|display"

# For NVIDIA GPUs, check the driver version
nvidia-smi

# For AMD GPUs, check the driver
rocminfo 2>/dev/null || echo "ROCm not installed"

# Verify Podman is installed
podman --version
```

## NVIDIA GPU Setup

### Install the NVIDIA Container Toolkit

```bash
# Add the NVIDIA container toolkit repository (Fedora/RHEL)
curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | \
  sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo

sudo dnf install -y nvidia-container-toolkit

# For Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg2

curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt update
sudo apt install -y nvidia-container-toolkit
```

### Configure Podman for NVIDIA GPUs

```bash
# Generate the CDI (Container Device Interface) specification
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml

# Verify the CDI specification was created
ls -la /etc/cdi/nvidia.yaml

# List available NVIDIA devices
nvidia-ctk cdi list

# Test GPU access in a Podman container
podman run --rm --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  ubuntu nvidia-smi -L
```

### Run AI Lab with NVIDIA GPU

```bash
# Start the inference server with GPU acceleration
podman run -d \
  --name ai-gpu-server \
  -p 8080:8080 \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  -v ~/ai-models:/models:ro \
  ghcr.io/ggml-org/llama.cpp:server-cuda \
  --model /models/mistral-7b-instruct-q4_k_m.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --n-gpu-layers 35 \
  --threads 4

# The --n-gpu-layers flag controls how many model layers run on the GPU
# More layers on GPU = faster inference but more VRAM used
# For a 7B Q4 model: 35 layers uses ~4GB VRAM
# Set to -1 to offload all layers to GPU

# Verify GPU is being used
podman logs ai-gpu-server 2>&1 | grep -i "gpu\|cuda\|offload"
```

## AMD GPU Setup

### Install ROCm for AMD GPUs

```bash
# Install ROCm on Ubuntu 22.04
# After configuring the official ROCm package repository for your Ubuntu release:
sudo apt update
sudo apt install -y rocm

# Add your user to the render and video groups
sudo usermod -aG render,video $USER

# Verify ROCm installation
rocminfo | grep -A2 "Agent "
```

### Configure Podman for AMD GPUs

```bash
# AMD GPUs use device passthrough via /dev/kfd and /dev/dri
# Run a test container with AMD GPU access
podman run --rm \
  --device /dev/kfd \
  --device /dev/dri \
  --group-add keep-groups \
  rocm/rocm-terminal rocminfo

# Start the inference server with AMD GPU support
podman run -d \
  --name ai-amd-server \
  -p 8080:8080 \
  --device /dev/kfd \
  --device /dev/dri \
  --group-add keep-groups \
  -v ~/ai-models:/models:ro \
  ghcr.io/ggml-org/llama.cpp:server-rocm \
  --model /models/mistral-7b-instruct-q4_k_m.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --n-gpu-layers 35
```

## Configuring GPU Layers

```bash
# The number of GPU layers to offload depends on your VRAM
# Check available VRAM
nvidia-smi --query-gpu=memory.total,memory.free --format=csv,noheader

# Guidelines for 7B parameter Q4 models:
# 4GB VRAM  -> --n-gpu-layers 20  (partial offload)
# 6GB VRAM  -> --n-gpu-layers 33  (most layers on GPU)
# 8GB VRAM  -> --n-gpu-layers -1  (full offload)
# 12GB+ VRAM -> --n-gpu-layers -1 (full offload with large context)

# Guidelines for 13B parameter Q4 models:
# 8GB VRAM  -> --n-gpu-layers 15  (partial offload)
# 12GB VRAM -> --n-gpu-layers 30  (most layers on GPU)
# 16GB+ VRAM -> --n-gpu-layers -1 (full offload)

# Benchmark different GPU layer configurations
for layers in 0 10 20 35; do
  echo "Testing with $layers GPU layers..."
  podman run --rm \
    --device nvidia.com/gpu=all \
    --security-opt=label=disable \
    -v ~/ai-models:/models:ro \
    --entrypoint /app/llama-bench \
    ghcr.io/ggml-org/llama.cpp:full-cuda \
    -m /models/mistral-7b-instruct-q4_k_m.gguf \
    -ngl $layers
done
```

## Monitoring GPU Usage

```bash
# Monitor NVIDIA GPU usage in real time
watch -n 1 nvidia-smi

# Check GPU memory usage of the inference container
nvidia-smi --query-compute-apps=pid,used_memory --format=csv

# Monitor container resource usage including GPU
podman stats ai-gpu-server --no-stream

# Check inference speed in the logs
podman logs ai-gpu-server 2>&1 | grep -E "tokens per second|eval"
```

## Troubleshooting GPU Issues

```bash
# If GPU is not detected in the container
# Verify CDI configuration
nvidia-ctk cdi list

# Regenerate CDI spec if needed
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml

# Check for SELinux issues (Fedora/RHEL)
sudo setsebool -P container_use_devices on

# If CUDA version mismatch, check versions
nvidia-smi | grep "CUDA Version"
podman logs ai-gpu-server 2>&1 | grep -i "cuda"

# If out of GPU memory, reduce layers or use a smaller model
podman stop ai-gpu-server && podman rm ai-gpu-server
# Restart with fewer GPU layers
```

## Summary

Configuring GPU access for Podman AI Lab significantly accelerates AI inference performance. NVIDIA GPUs use the Container Device Interface (CDI) through the nvidia-container-toolkit, while AMD GPUs use direct device passthrough with ROCm. The key tuning parameter is the number of GPU layers to offload, which should be balanced against your available VRAM. Monitoring GPU utilization during inference helps you find the optimal configuration for your hardware.
