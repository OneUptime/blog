# How to Install Portainer on NVIDIA Jetson for AI Edge Deployments (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, NVIDIA Jetson, AI, Edge Computing, Docker, ARM64, Self-Hosted

Description: Deploy Portainer on NVIDIA Jetson devices to manage GPU-accelerated AI containers at the edge with full CUDA support and visual management.

## Introduction

NVIDIA Jetson devices supported by JetPack 5.x or 6.x, such as Jetson Xavier NX, Jetson AGX Xavier, and the Jetson Orin family, are purpose-built for AI inference at the edge. With CUDA support, TensorRT, and NVIDIA's container runtime, Jetson devices can run GPU-accelerated containers. Portainer provides a management interface for deploying and managing these AI workloads.

## Prerequisites

- NVIDIA Jetson device supported by JetPack 5.x or 6.x
- At least 8GB storage (NVMe SSD recommended)
- SSH access enabled
- Docker installed and working

## Step 1: Verify JetPack Installation

```bash
# Check Jetson Linux / L4T version

cat /etc/nv_tegra_release

# If the CUDA toolkit is installed, verify it
nvcc --version

# Watch live CPU/GPU/memory statistics
sudo tegrastats
```

## Step 2: Configure NVIDIA Container Runtime

JetPack includes the NVIDIA container runtime with Docker integration, but verify Docker is configured to use it:

```bash
# Verify NVIDIA runtime is registered
docker info | grep Runtimes

# Should include: nvidia

# If not, register it with Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

## Step 3: Test NVIDIA Runtime Access in Containers

```bash
# Replace r36.4.0 with the L4T tag that matches your device
docker run --rm --runtime=nvidia \
  nvcr.io/nvidia/l4t-jetpack:r36.4.0 \
  bash -lc 'ls /usr/local/cuda && echo "NVIDIA container runtime is working"'

# Jetson devices do not support nvidia-smi; use tegrastats on the host
sudo tegrastats
```

## Step 4: Install Portainer

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer (ARM64 compatible)
# Add -p 9000:9000 only if you need legacy HTTP access
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 5: Deploy AI Containers via Portainer

### Example: TensorRT Inference Container (JetPack 6.x)

In Portainer, create a new stack named `ai-inference`:

```yaml
version: "3.8"

services:
  # Triton on Jetson requires an iGPU image tag
  triton:
    image: nvcr.io/nvidia/tritonserver:23.12-py3-igpu
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility
    ports:
      - "8000:8000"   # HTTP inference endpoint
      - "8001:8001"   # gRPC inference endpoint
      - "8002:8002"   # Metrics endpoint
    volumes:
      # Model repository
      - /data/models:/models
    command: >
      tritonserver
      --model-repository=/models
      --allow-metrics=true
    restart: unless-stopped
```

### Example: Object Detection Container

```yaml
version: "3.8"

services:
  # YOLOv8 detection service
  yolo-service:
    image: ultralytics/ultralytics:latest-jetson-jetpack5  # Use :latest-jetson-jetpack6 on JetPack 6.x
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
    ports:
      - "5000:5000"
    volumes:
      - /data/yolo-models:/models
    devices:
      - /dev/video0:/dev/video0
    restart: unless-stopped
```

## Step 6: Monitor GPU Usage

For Jetson devices, use the host-side monitoring tools NVIDIA documents for runtime visibility:

```bash
# Install Jetson monitoring tools
sudo apt update
sudo apt install python3-pip python3-setuptools -y
sudo pip3 install -U jetson-stats

# Interactive Jetson monitor
jtop

# Built-in NVIDIA telemetry
sudo tegrastats
```

## Jetson-Specific Portainer Tips

### Power Mode Management

Set the optimal power mode for your workload:

```bash
# Show current power mode
sudo nvpmodel -q

# Set to MAX performance (mode 0)
sudo nvpmodel -m 0

# Maximize clocks
sudo jetson_clocks
```

### Using Portainer to Manage Model Updates

Create a Portainer webhook for CI/CD model deployment:

1. In Portainer, navigate to **Stacks**
2. Click on your AI stack
3. Enable **GitOps updates** and configure webhook
4. Trigger the webhook from your CI pipeline when a new model is ready

## Conclusion

NVIDIA Jetson devices with Portainer provide a powerful platform for AI edge deployments. Portainer's stack management simplifies deploying complex multi-container AI pipelines, while the NVIDIA container runtime ensures GPU access is properly configured for each container. The visual management interface makes it easy to monitor GPU-accelerated workloads without needing to SSH into the device for routine operations.
