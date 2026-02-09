# How to Set Up Multi-GPU Docker Containers for Model Training

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, GPU, NVIDIA, Machine Learning, Model Training, CUDA, Deep Learning, Multi-GPU

Description: A practical guide to configuring Docker containers with multiple GPUs for distributed deep learning model training.

---

Training large machine learning models on a single GPU can take days or even weeks. Multi-GPU training slashes that time dramatically. Docker adds reproducibility, isolation, and portability to the mix. Instead of wrestling with CUDA installations and driver conflicts on bare metal, you package everything into a container and allocate GPUs as needed.

This guide covers the full setup: NVIDIA drivers, the container runtime, Docker configuration, and actual multi-GPU training with PyTorch and TensorFlow.

## Prerequisites

Before you touch Docker, your host machine needs working NVIDIA drivers. The drivers live on the host, not inside containers. Containers access GPUs through the NVIDIA Container Toolkit.

Check your GPU hardware and driver status.

```bash
# Verify NVIDIA drivers are installed and GPUs are detected
nvidia-smi
```

You should see a table listing each GPU, its memory, temperature, and driver version. If this command fails, install the appropriate drivers for your distribution first.

## Installing the NVIDIA Container Toolkit

The NVIDIA Container Toolkit bridges Docker and your GPUs. It lets containers access GPU devices without installing CUDA drivers inside the container image.

```bash
# Add the NVIDIA container toolkit repository (Ubuntu/Debian)
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
sudo systemctl restart docker
```

Verify the integration works.

```bash
# Run a quick test - should show GPU info from inside the container
docker run --rm --gpus all nvidia/cuda:12.3.1-base-ubuntu22.04 nvidia-smi
```

## Allocating Specific GPUs to Containers

You do not always want every GPU available to a single container. Docker lets you assign specific GPUs by index or UUID.

```bash
# Allocate only the first two GPUs (index 0 and 1)
docker run --rm --gpus '"device=0,1"' nvidia/cuda:12.3.1-base-ubuntu22.04 nvidia-smi

# Allocate a single GPU by index
docker run --rm --gpus '"device=0"' nvidia/cuda:12.3.1-base-ubuntu22.04 nvidia-smi

# Allocate by UUID (useful in heterogeneous setups)
docker run --rm --gpus '"device=GPU-abc123-def456"' nvidia/cuda:12.3.1-base-ubuntu22.04 nvidia-smi
```

## Docker Compose for Multi-GPU Training

For real training workloads, Docker Compose keeps the configuration manageable. Here is a compose file for a PyTorch multi-GPU training setup.

```yaml
# docker-compose.yml - Multi-GPU PyTorch training environment
version: "3.8"

services:
  trainer:
    image: pytorch/pytorch:2.2.0-cuda12.1-cudnn8-devel
    container_name: gpu-trainer
    # Allocate all available GPUs
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      # Mount training scripts and data
      - ./scripts:/workspace/scripts
      - ./data:/workspace/data
      - ./checkpoints:/workspace/checkpoints
    working_dir: /workspace
    shm_size: "16g"  # Shared memory - critical for DataLoader workers
    environment:
      - NCCL_DEBUG=INFO
      - CUDA_VISIBLE_DEVICES=0,1,2,3
    command: >
      torchrun --nproc_per_node=4
      scripts/train.py
      --epochs 50
      --batch-size 64
```

The `shm_size` setting deserves special attention. PyTorch DataLoaders use shared memory to pass data between worker processes. The default 64 MB is far too small for training workloads and will cause mysterious crashes. Set it to at least a few gigabytes.

## Writing a Multi-GPU Training Script with PyTorch

PyTorch's DistributedDataParallel (DDP) is the standard approach for multi-GPU training. It replicates the model across GPUs and synchronizes gradients during backpropagation.

```python
# scripts/train.py - Multi-GPU training with PyTorch DDP
import torch
import torch.nn as nn
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data import DataLoader, DistributedSampler
from torchvision import datasets, transforms
import os

def setup():
    """Initialize the distributed process group."""
    dist.init_process_group(backend="nccl")

def cleanup():
    """Clean up the distributed process group."""
    dist.destroy_process_group()

def train(args):
    setup()

    # Each process gets assigned a local rank (GPU index)
    local_rank = int(os.environ["LOCAL_RANK"])
    torch.cuda.set_device(local_rank)

    # Define a simple CNN model
    model = nn.Sequential(
        nn.Conv2d(1, 32, 3, padding=1),
        nn.ReLU(),
        nn.MaxPool2d(2),
        nn.Conv2d(32, 64, 3, padding=1),
        nn.ReLU(),
        nn.MaxPool2d(2),
        nn.Flatten(),
        nn.Linear(64 * 7 * 7, 128),
        nn.ReLU(),
        nn.Linear(128, 10)
    ).to(local_rank)

    # Wrap model with DDP for multi-GPU training
    model = DDP(model, device_ids=[local_rank])

    # Use DistributedSampler to split data across GPUs
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    dataset = datasets.MNIST("./data", train=True, download=True, transform=transform)
    sampler = DistributedSampler(dataset)
    dataloader = DataLoader(dataset, batch_size=64, sampler=sampler, num_workers=4)

    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()

    # Training loop
    for epoch in range(args.epochs):
        sampler.set_epoch(epoch)  # Shuffle data differently each epoch
        model.train()
        total_loss = 0

        for batch_idx, (data, target) in enumerate(dataloader):
            data, target = data.to(local_rank), target.to(local_rank)
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        # Only print from rank 0 to avoid duplicate output
        if local_rank == 0:
            avg_loss = total_loss / len(dataloader)
            print(f"Epoch {epoch+1}/{args.epochs}, Loss: {avg_loss:.4f}")

            # Save checkpoints from rank 0 only
            if (epoch + 1) % 10 == 0:
                torch.save(model.module.state_dict(), f"checkpoints/model_epoch_{epoch+1}.pt")

    cleanup()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=64)
    args = parser.parse_args()
    train(args)
```

Launch the training.

```bash
# Start multi-GPU training with Docker Compose
docker compose up
```

## TensorFlow Multi-GPU Training

If you prefer TensorFlow, the setup follows a similar pattern but uses TensorFlow's MirroredStrategy.

```yaml
# docker-compose-tf.yml - TensorFlow multi-GPU setup
version: "3.8"

services:
  tf-trainer:
    image: tensorflow/tensorflow:2.15.0-gpu
    container_name: tf-gpu-trainer
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      - ./scripts:/workspace/scripts
      - ./data:/workspace/data
    working_dir: /workspace
    shm_size: "8g"
    command: python scripts/train_tf.py
```

```python
# scripts/train_tf.py - Multi-GPU training with TensorFlow MirroredStrategy
import tensorflow as tf
import os

# MirroredStrategy automatically uses all visible GPUs
strategy = tf.distribute.MirroredStrategy()
print(f"Number of GPUs: {strategy.num_replicas_in_sync}")

# Load and prepare data
(x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
x_train = x_train.reshape(-1, 28, 28, 1).astype("float32") / 255.0
x_test = x_test.reshape(-1, 28, 28, 1).astype("float32") / 255.0

# Scale batch size by number of GPUs
BATCH_SIZE_PER_GPU = 64
GLOBAL_BATCH_SIZE = BATCH_SIZE_PER_GPU * strategy.num_replicas_in_sync

train_dataset = tf.data.Dataset.from_tensor_slices((x_train, y_train))
train_dataset = train_dataset.shuffle(10000).batch(GLOBAL_BATCH_SIZE)

# Build model within the strategy scope
with strategy.scope():
    model = tf.keras.Sequential([
        tf.keras.layers.Conv2D(32, 3, activation="relu", input_shape=(28, 28, 1)),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Conv2D(64, 3, activation="relu"),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dense(10, activation="softmax")
    ])
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])

model.fit(train_dataset, epochs=20)
```

## Monitoring GPU Usage During Training

Keep an eye on GPU utilization to confirm all GPUs are actually working.

```bash
# Watch GPU usage in real time (updates every second)
docker exec gpu-trainer watch -n 1 nvidia-smi

# Or monitor from the host
watch -n 1 nvidia-smi
```

For persistent monitoring, consider running an NVIDIA DCGM exporter alongside Prometheus and Grafana.

## Allocating GPUs Across Multiple Containers

Sometimes you want to split GPUs between different tasks, such as training on two GPUs while serving a model on another.

```yaml
# docker-compose-split.yml - Split GPUs across containers
version: "3.8"

services:
  # Training job gets GPUs 0 and 1
  trainer:
    image: pytorch/pytorch:2.2.0-cuda12.1-cudnn8-devel
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ["0", "1"]
              capabilities: [gpu]
    shm_size: "8g"
    command: torchrun --nproc_per_node=2 scripts/train.py

  # Inference server gets GPU 2
  inference:
    image: pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ["2"]
              capabilities: [gpu]
    ports:
      - "8080:8080"
    command: python scripts/serve.py
```

## Troubleshooting Common Issues

The most frequent problem is NCCL communication failures between GPUs. Set the `NCCL_DEBUG=INFO` environment variable to get detailed logs. If you see socket errors, try setting `NCCL_SOCKET_IFNAME` to your network interface.

Out-of-memory errors during multi-GPU training usually mean your batch size is too large. Remember that each GPU holds a full copy of the model plus its share of the batch. Reduce the per-GPU batch size, not the global batch size.

Shared memory errors (`RuntimeError: DataLoader worker is killed`) always mean `shm_size` is too small. Increase it in your compose file or pass `--shm-size` to `docker run`.

## Wrapping Up

Multi-GPU training in Docker combines the raw performance of parallel computation with the reproducibility and isolation of containers. The NVIDIA Container Toolkit handles the tricky parts of GPU passthrough, while PyTorch DDP and TensorFlow MirroredStrategy handle the distributed training logic. Once you have this pipeline working, scaling from two GPUs to eight is just a configuration change.
