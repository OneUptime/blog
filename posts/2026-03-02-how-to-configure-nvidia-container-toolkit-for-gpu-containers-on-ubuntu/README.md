# How to Configure NVIDIA Container Toolkit for GPU Containers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NVIDIA, Docker, GPU, Container

Description: Learn how to install the NVIDIA Container Toolkit on Ubuntu to enable GPU access in Docker containers for machine learning, video processing, and HPC workloads.

---

The NVIDIA Container Toolkit (previously known as nvidia-docker2) allows Docker containers to access the host's GPU without bundling GPU drivers inside the container image. The CUDA libraries and NVIDIA runtime are exposed to the container at runtime, keeping images lean and ensuring they work across GPU driver versions.

This is the standard setup for running machine learning workloads, CUDA applications, and GPU-accelerated services in containers on Ubuntu.

## Prerequisites

- Ubuntu 20.04 or 22.04
- NVIDIA GPU installed
- NVIDIA driver 520+ installed
- Docker CE installed (not Docker Desktop)
- sudo privileges

## Step 1: Install NVIDIA Drivers

If drivers are not installed:

```bash
# Check if GPU is present
lspci | grep -i nvidia

# Install recommended driver
sudo ubuntu-drivers autoinstall

# Or a specific version
sudo apt-get install -y nvidia-driver-535

sudo reboot

# Verify
nvidia-smi
```

## Step 2: Install Docker

```bash
# Remove any old Docker versions
sudo apt-get remove -y docker docker-engine docker.io containerd runc

# Install Docker CE from the official repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list

sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Add your user to the docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker works
docker run hello-world
```

## Step 3: Install NVIDIA Container Toolkit

```bash
# Add NVIDIA Container Toolkit repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use the NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker

# Restart Docker to apply changes
sudo systemctl restart docker
```

## Step 4: Verify GPU Access in Containers

```bash
# Run a quick test - this should show the same output as nvidia-smi on the host
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi

# Expected output: GPU info matching your hardware
```

If that works, your GPU is accessible in containers.

## Using GPUs in Docker Run

```bash
# Use all available GPUs
docker run --rm --gpus all nvidia/cuda:12.3.0-devel-ubuntu22.04 \
  nvidia-smi -L

# Use only the first GPU
docker run --rm --gpus '"device=0"' ubuntu:22.04 \
  nvidia-smi

# Use specific GPUs by index
docker run --rm --gpus '"device=0,1"' ubuntu:22.04 \
  nvidia-smi

# Use GPU by UUID
docker run --rm --gpus '"device=GPU-abc12345-..."' ubuntu:22.04 \
  nvidia-smi

# Limit GPU memory visible to container
docker run --rm --gpus all \
  -e NVIDIA_DRIVER_CAPABILITIES=compute,utility \
  -e CUDA_VISIBLE_DEVICES=0 \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi
```

## Available CUDA Docker Images

NVIDIA publishes official CUDA base images with multiple variants:

```bash
# Base image - smallest, contains only CUDA runtime
nvidia/cuda:12.3.0-base-ubuntu22.04

# Runtime image - includes CUDA runtime libraries (needed by most apps)
nvidia/cuda:12.3.0-runtime-ubuntu22.04

# Development image - includes headers, compilers, nvcc
nvidia/cuda:12.3.0-devel-ubuntu22.04

# Images with cuDNN for deep learning
nvidia/cuda:12.3.1-cudnn9-runtime-ubuntu22.04
nvidia/cuda:12.3.1-cudnn9-devel-ubuntu22.04
```

## Building a GPU-Enabled Container

Example Dockerfile for a PyTorch training environment:

```dockerfile
# Dockerfile
FROM nvidia/cuda:12.1.0-cudnn8-devel-ubuntu22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Python and build tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3 as default
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Install PyTorch with matching CUDA version
RUN pip install --no-cache-dir \
    torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu121

# Install additional ML libraries
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    scikit-learn \
    matplotlib \
    jupyter

# Create working directory
WORKDIR /workspace

# Verify CUDA is accessible
RUN python3 -c "import torch; print('CUDA available:', torch.cuda.is_available())"

CMD ["python3"]
```

```bash
# Build the image
docker build -t my-pytorch:cuda12.1 .

# Run with GPU access
docker run --rm --gpus all -v $(pwd):/workspace my-pytorch:cuda12.1 \
  python3 -c "import torch; print(torch.cuda.get_device_name(0))"
```

## Docker Compose with GPU Support

```yaml
# docker-compose.yml
version: '3.8'

services:
  ml-training:
    image: my-pytorch:cuda12.1
    # Requires Docker Compose v2.3+ and NVIDIA Container Toolkit
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all  # or a number like 1, 2
              capabilities: [gpu]
    volumes:
      - ./data:/workspace/data
      - ./models:/workspace/models
    environment:
      - CUDA_VISIBLE_DEVICES=0
    command: python3 train.py

  inference-server:
    image: my-inference:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ['0']  # Specific GPU
              capabilities: [gpu]
    ports:
      - "8080:8080"
    restart: unless-stopped
```

```bash
docker compose up
```

## GPU Resource Constraints

Limit GPU access for multi-tenant scenarios:

```bash
# Using NVIDIA MPS (Multi-Process Service) for time-sharing a single GPU
# Enable MPS on the host
nvidia-smi -i 0 -c EXCLUSIVE_PROCESS
nvidia-cuda-mps-control -d

# Or use NVIDIA MIG (Multi-Instance GPU) on A100/H100
# Partition the GPU into smaller instances
nvidia-smi mig -i 0 -cgi 3g.40gb -C  # Create a 3g.40gb MIG instance

# List MIG instances
nvidia-smi -L
```

## Configuring Container Toolkit Options

The toolkit config file is at `/etc/nvidia-container-runtime/config.toml`:

```toml
# /etc/nvidia-container-runtime/config.toml

disable-require = false  # Enforce --gpus requirement
supported-driver-capabilities-all = false

[nvidia-container-cli]
environment = []
debug = ""
ldcache = "/etc/ld.so.cache"
load-kmods = true
no-cgroups = false
user = ""
ldconfig = "@/sbin/ldconfig"

[nvidia-container-runtime]
debug = ""
log-level = "info"
mode = "auto"  # auto, legacy, csv

[nvidia-container-runtime.modes.csv]
# When in CSV mode, specify which capabilities to expose
mount-spec-path = "/etc/nvidia-container-runtime/host-files-for-container.d"
```

## Troubleshooting

**"could not select device driver with capabilities: [[gpu]]":**
```bash
# Verify the NVIDIA runtime is configured
docker info | grep -i runtime

# Should show: Runtimes: io.containerd.runc.v2 nvidia runc
# If 'nvidia' is not listed:
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

**Container runs but nvidia-smi shows nothing:**
```bash
# Check the --gpus flag was passed
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi

# Verify the driver is loaded on the host
nvidia-smi

# Check container toolkit is installed
dpkg -l | grep nvidia-container
```

**CUDA version mismatch inside container:**
```bash
# Check the host driver's CUDA version
nvidia-smi | grep "CUDA Version"

# The container's CUDA version must be <= host driver's CUDA version
# Use a container with older CUDA if needed
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

**Permission denied accessing /dev/nvidia*:**
```bash
# Check device files
ls -la /dev/nvidia*

# Ensure docker group has access
sudo chmod 660 /dev/nvidia*
sudo chgrp docker /dev/nvidia*

# Better: let the toolkit handle this automatically
sudo nvidia-ctk system create-dev-char-symlinks --create-all
```

The NVIDIA Container Toolkit is straightforward to set up but the version alignment between drivers, CUDA, and container images requires attention. Once configured correctly, GPU workloads in containers are essentially as fast as running directly on the host - the overhead of the container runtime for GPU operations is negligible.
