# How to Set Up NVIDIA GPU Support in Docker for AI/ML Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, NVIDIA, GPU, AI, Machine Learning, Deep Learning

Description: Learn how to configure Docker to use NVIDIA GPUs for AI/ML workloads, including driver installation, nvidia-container-toolkit setup, and running TensorFlow and PyTorch containers.

---

Running GPU-accelerated workloads in Docker requires proper setup of NVIDIA drivers and the container toolkit. Once configured, you can run TensorFlow, PyTorch, and other AI/ML frameworks with full GPU acceleration inside containers.

## Prerequisites

Before configuring Docker for GPU access, ensure:

1. An NVIDIA GPU is installed
2. NVIDIA drivers are installed on the host
3. Docker is installed

```bash
# Check if NVIDIA GPU is detected
lspci | grep -i nvidia

# Check NVIDIA driver version
nvidia-smi
```

## Install NVIDIA Container Toolkit

The NVIDIA Container Toolkit allows Docker containers to access GPU resources.

### Ubuntu/Debian

```bash
# Add NVIDIA package repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Install the toolkit
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker

# Restart Docker
sudo systemctl restart docker
```

### RHEL/CentOS

```bash
# Add repository
curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | \
  sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo

# Install
sudo yum install -y nvidia-container-toolkit

# Configure and restart
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

## Verify GPU Access

```bash
# Test GPU access in a container
docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi
```

Expected output shows your GPU information inside the container.

## GPU Allocation Options

### All GPUs

```bash
# Give container access to all GPUs
docker run --gpus all myimage
```

### Specific Number of GPUs

```bash
# Use exactly 2 GPUs
docker run --gpus 2 myimage
```

### Specific GPU by Index

```bash
# Use GPU 0 and GPU 2
docker run --gpus '"device=0,2"' myimage
```

### Specific GPU by UUID

```bash
# Get GPU UUIDs
nvidia-smi -L
# GPU 0: NVIDIA GeForce RTX 3090 (UUID: GPU-12345678-1234-1234-1234-123456789abc)

# Use specific GPU by UUID
docker run --gpus '"device=GPU-12345678-1234-1234-1234-123456789abc"' myimage
```

## Docker Compose with GPU

### Basic GPU Configuration

```yaml
version: '3.8'

services:
  ml-training:
    image: tensorflow/tensorflow:latest-gpu
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      - ./data:/data
      - ./models:/models
```

### Specific GPU Allocation

```yaml
version: '3.8'

services:
  # Training job uses 2 GPUs
  trainer:
    image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 2
              capabilities: [gpu]

  # Inference uses 1 GPU
  inference:
    image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ['0']
              capabilities: [gpu]
```

### GPU with Specific Capabilities

```yaml
services:
  compute-job:
    image: nvidia/cuda:12.2.0-runtime-ubuntu22.04
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              capabilities: [gpu, compute, utility]
```

Available capabilities:
- `gpu`: Basic GPU access
- `compute`: CUDA compute
- `utility`: nvidia-smi access
- `graphics`: OpenGL/Vulkan
- `video`: Video encode/decode
- `display`: Display output

## Running TensorFlow with GPU

### Quick Start

```bash
# Run TensorFlow GPU container
docker run --gpus all -it tensorflow/tensorflow:latest-gpu python -c "
import tensorflow as tf
print('GPUs:', tf.config.list_physical_devices('GPU'))
"
```

### TensorFlow Development Environment

```yaml
# docker-compose.yml
version: '3.8'

services:
  tensorflow:
    image: tensorflow/tensorflow:latest-gpu-jupyter
    ports:
      - "8888:8888"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      - ./notebooks:/tf/notebooks
      - ./data:/tf/data
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
```

### Custom TensorFlow Dockerfile

```dockerfile
FROM tensorflow/tensorflow:latest-gpu

# Install additional packages
RUN pip install --no-cache-dir \
    pandas \
    scikit-learn \
    matplotlib \
    seaborn

# Copy application code
WORKDIR /app
COPY . .

# Default command
CMD ["python", "train.py"]
```

## Running PyTorch with GPU

### Quick Start

```bash
# Run PyTorch GPU container
docker run --gpus all -it pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime python -c "
import torch
print('CUDA available:', torch.cuda.is_available())
print('GPU count:', torch.cuda.device_count())
print('GPU name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')
"
```

### PyTorch Development Environment

```yaml
version: '3.8'

services:
  pytorch:
    image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-devel
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      - ./code:/workspace
      - ./data:/data
      - ./models:/models
    working_dir: /workspace
    command: jupyter lab --ip=0.0.0.0 --allow-root --no-browser
    ports:
      - "8888:8888"
    shm_size: '8gb'  # Important for DataLoader workers
```

### Custom PyTorch Dockerfile

```dockerfile
FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

# Install dependencies
RUN pip install --no-cache-dir \
    transformers \
    datasets \
    accelerate \
    wandb

# Set up working directory
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "train.py"]
```

## Memory and Resource Management

### GPU Memory Limits

TensorFlow:
```python
# Limit GPU memory growth
import tensorflow as tf
gpus = tf.config.list_physical_devices('GPU')
for gpu in gpus:
    tf.config.experimental.set_memory_growth(gpu, True)

# Or set specific memory limit
tf.config.set_logical_device_configuration(
    gpus[0],
    [tf.config.LogicalDeviceConfiguration(memory_limit=4096)]
)
```

PyTorch:
```python
import torch
# Limit GPU memory (in fraction)
torch.cuda.set_per_process_memory_fraction(0.5, device=0)
```

### Shared Memory for DataLoaders

```yaml
services:
  training:
    image: pytorch/pytorch:latest
    shm_size: '16gb'  # Increase shared memory
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

Or at runtime:
```bash
docker run --gpus all --shm-size=16g pytorch/pytorch:latest
```

## Multi-GPU Training

### Docker Compose for Distributed Training

```yaml
version: '3.8'

services:
  trainer:
    image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-devel
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      - ./code:/workspace
      - ./data:/data
    working_dir: /workspace
    environment:
      - MASTER_ADDR=localhost
      - MASTER_PORT=29500
      - WORLD_SIZE=4
    command: >
      torchrun --nproc_per_node=4
      train_distributed.py
    shm_size: '32gb'
    ipc: host  # For NCCL communication
```

### NCCL Configuration

```yaml
services:
  training:
    environment:
      - NCCL_DEBUG=INFO
      - NCCL_IB_DISABLE=1  # Disable InfiniBand if not available
      - NCCL_P2P_LEVEL=NVL  # For NVLink systems
    ulimits:
      memlock:
        soft: -1
        hard: -1
```

## Complete ML Pipeline Example

```yaml
version: '3.8'

services:
  # Data preprocessing (CPU)
  preprocessor:
    image: python:3.11
    volumes:
      - ./data:/data
      - ./processed:/processed
    command: python preprocess.py

  # Model training (GPU)
  trainer:
    image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
    depends_on:
      preprocessor:
        condition: service_completed_successfully
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      - ./code:/workspace
      - ./processed:/data
      - ./models:/models
    working_dir: /workspace
    shm_size: '8gb'
    command: python train.py

  # Model serving (GPU)
  serving:
    image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
    ports:
      - "8000:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ['0']
              capabilities: [gpu]
    volumes:
      - ./models:/models
      - ./serving:/app
    working_dir: /app
    command: python serve.py
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Monitoring
  tensorboard:
    image: tensorflow/tensorflow:latest
    ports:
      - "6006:6006"
    volumes:
      - ./logs:/logs
    command: tensorboard --logdir=/logs --bind_all

volumes:
  processed:
  models:
```

## Troubleshooting

### Check NVIDIA Runtime

```bash
# Verify runtime is configured
docker info | grep -i nvidia

# Check runtime configuration
cat /etc/docker/daemon.json
```

Should show:
```json
{
    "runtimes": {
        "nvidia": {
            "path": "nvidia-container-runtime",
            "runtimeArgs": []
        }
    }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `could not select device driver` | nvidia-container-toolkit not installed | Install toolkit and restart Docker |
| `CUDA out of memory` | GPU memory exhausted | Reduce batch size or enable memory growth |
| `NCCL error` | Multi-GPU communication issue | Check NCCL settings, use `ipc: host` |
| `no CUDA-capable device` | Driver mismatch | Update drivers, check CUDA compatibility |

### Verify CUDA Version Compatibility

```bash
# Check host CUDA version
nvidia-smi

# Inside container
docker run --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvcc --version
```

## Summary

| Task | Command/Config |
|------|---------------|
| Install toolkit | `apt install nvidia-container-toolkit` |
| Use all GPUs | `docker run --gpus all` |
| Use specific GPUs | `docker run --gpus '"device=0,1"'` |
| Compose GPU config | `deploy.resources.reservations.devices` |
| Increase shared memory | `shm_size: '8gb'` |
| Multi-GPU IPC | `ipc: host` |

With NVIDIA Container Toolkit properly configured, Docker becomes a powerful platform for reproducible AI/ML workloads, allowing you to package models, dependencies, and training scripts into portable containers that run consistently across development and production environments.

