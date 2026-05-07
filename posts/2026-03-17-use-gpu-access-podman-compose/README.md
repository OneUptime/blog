# How to Use GPU Access in podman-compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, GPU, NVIDIA, Machine Learning

Description: Learn how to configure GPU passthrough in podman-compose for machine learning, AI workloads, and GPU-accelerated applications.

---

> GPU access in podman-compose lets you run machine learning training, inference, and GPU-accelerated applications inside containers.

Running GPU workloads in containers requires passing the GPU device and drivers through to the container. podman-compose supports GPU access through device mappings and the NVIDIA Container Toolkit, enabling containerized machine learning and compute workflows.

---

## Prerequisites

```bash
# Install the NVIDIA Container Toolkit

# On Fedora/RHEL
sudo dnf install nvidia-container-toolkit

# On Ubuntu/Debian
sudo apt install nvidia-container-toolkit

# Generate a CDI specification for Podman
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml

# Verify GPU is detected
nvidia-smi
podman run --rm --device nvidia.com/gpu=all --security-opt=label=disable docker.io/nvidia/cuda:12.3.1-base-ubuntu22.04 nvidia-smi
```

## Using CDI (Container Device Interface)

```yaml
# docker-compose.yml
services:
  ml-training:
    image: docker.io/nvidia/cuda:12.3.1-runtime-ubuntu22.04
    command: nvidia-smi
    devices:
      - nvidia.com/gpu=all
    security_opt:
      - label=disable
```

```bash
# Start the service with GPU access
podman-compose up

# Output shows the GPU details from inside the container
```

## Specific GPU Selection

```yaml
services:
  training:
    image: docker.io/nvidia/cuda:12.3.1-runtime-ubuntu22.04
    devices:
      # Pass only GPU 0
      - nvidia.com/gpu=0
    security_opt:
      - label=disable
  inference:
    image: docker.io/nvidia/cuda:12.3.1-runtime-ubuntu22.04
    devices:
      # Pass only GPU 1
      - nvidia.com/gpu=1
    security_opt:
      - label=disable
```

## Using Device Passthrough

For NVIDIA GPUs, CDI is the recommended approach because it injects both devices and driver libraries. Manual device passthrough is useful for custom setups where you manage the required host driver files yourself.

```yaml
# docker-compose.yml
services:
  gpu-app:
    image: docker.io/nvidia/cuda:12.3.1-runtime-ubuntu22.04
    devices:
      - /dev/nvidia0:/dev/nvidia0
      - /dev/nvidiactl:/dev/nvidiactl
      - /dev/nvidia-uvm:/dev/nvidia-uvm
    security_opt:
      - label=disable
```

## Machine Learning Workflow

```yaml
# docker-compose.yml
services:
  jupyter:
    image: docker.io/nvidia/cuda:12.3.1-runtime-ubuntu22.04
    devices:
      - nvidia.com/gpu=all
    security_opt:
      - label=disable
    ports:
      - "8888:8888"
    volumes:
      - ./notebooks:/workspace
    command: >
      bash -c "apt-get update &&
               apt-get install -y python3-pip &&
               python3 -m pip install jupyter torch torchvision &&
               jupyter notebook --ip=0.0.0.0 --no-browser --allow-root"

  tensorboard:
    image: docker.io/library/python:3.12-slim
    ports:
      - "6006:6006"
    volumes:
      - ./logs:/logs
    command: >
      bash -c "pip install tensorboard &&
               tensorboard --logdir=/logs --host=0.0.0.0"
```

## Using Compose GPU Reservations

```yaml
services:
  ml-app:
    image: docker.io/nvidia/cuda:12.3.1-runtime-ubuntu22.04
    command: nvidia-smi
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

## Verifying GPU Access

```bash
# Start the service
podman-compose up -d

# Check GPU is accessible inside the container
podman-compose exec ml-training nvidia-smi

# Check CUDA is available
podman-compose exec jupyter python3 -c "import torch; print(torch.cuda.is_available())"
```

## Summary

Enable GPU access in podman-compose by installing the NVIDIA Container Toolkit and using CDI device specifications. Use `nvidia.com/gpu=all` for all GPUs or `nvidia.com/gpu=0` for specific ones. This enables containerized machine learning training, inference, and GPU-accelerated compute workloads.
