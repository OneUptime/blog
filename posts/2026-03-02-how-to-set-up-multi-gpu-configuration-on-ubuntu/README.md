# How to Set Up Multi-GPU Configuration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NVIDIA, Multi-GPU, Machine Learning, CUDA

Description: Guide to configuring multiple GPUs on Ubuntu for parallel computing and machine learning workloads, covering NVLink, CUDA device management, and PyTorch/TensorFlow multi-GPU training.

---

Running multiple GPUs in a single Ubuntu system multiplies available compute for machine learning training, simulation, or rendering. Whether you're working with NVLink-connected server GPUs or multiple consumer cards in PCIe slots, the configuration approach differs by use case. This guide covers the hardware setup, driver configuration, and software frameworks for multi-GPU workloads.

## Hardware Configurations

### PCIe Multi-GPU (Consumer Cards)

Multiple GPUs connected through PCIe slots. Each GPU operates independently. No direct GPU-to-GPU communication path - data must go through the CPU/RAM. Common for consumer setups with 2-4 GPUs.

### NVLink (Professional/Data Center)

High-bandwidth direct GPU-to-GPU interconnect. Supported on: RTX 3090, A100, A6000, H100, and other high-end cards. Enables much faster peer-to-peer transfers and unified memory across GPUs.

### NVSwitch (Multi-node)

For large-scale distributed training across many GPU nodes. Used in NVIDIA DGX systems and large clusters. Beyond scope of single-machine setup.

## Verifying All GPUs Are Detected

```bash
# List all GPUs
nvidia-smi -L

# Detailed view of all GPUs
nvidia-smi --query-gpu=index,name,uuid,memory.total,compute_cap --format=csv

# Check PCIe topology (shows how GPUs connect to each other and CPU)
nvidia-smi topo -m
```

The topology matrix output shows:
- `NV1`, `NV2`: NVLink connections (higher number = more NVLink bridges)
- `PHB`: PCIe host bridge (going through the CPU)
- `PXB`: PCIe bridge (on-board switch, faster than PHB)
- `SOC`: Connected on same SoC (embedded systems)

## Checking NVLink Connectivity

```bash
# Check NVLink status (requires compatible GPUs)
nvidia-smi nvlink -s

# Check NVLink capabilities
nvidia-smi nvlink -c

# Monitor NVLink bandwidth
nvidia-smi nvlink -gt d  # Throughput in MB/s
```

## Driver and CUDA Configuration

The NVIDIA driver automatically handles multiple GPUs when they're in the same system. No extra driver configuration is needed beyond a standard single-GPU setup.

```bash
# Set persistence mode for all GPUs (reduces initialization latency)
sudo nvidia-smi -pm 1

# Enable all GPUs at max performance (optional, increases power draw)
sudo nvidia-smi --auto-boost-default=0
for i in $(nvidia-smi --query-gpu=index --format=csv,noheader); do
    sudo nvidia-smi -i $i --lock-gpu-clocks=$(nvidia-smi -i $i --query-gpu=clocks.max.graphics --format=csv,noheader | tr -d ' MHz')
done
```

## Controlling GPU Visibility in Applications

```bash
# Run a program using only GPU 0
CUDA_VISIBLE_DEVICES=0 python3 train.py

# Run using GPUs 0 and 1 only
CUDA_VISIBLE_DEVICES=0,1 python3 train.py

# Hide all GPUs (force CPU)
CUDA_VISIBLE_DEVICES="" python3 test.py

# Reorder GPU IDs for an application
CUDA_VISIBLE_DEVICES=2,0,1 python3 train.py
# GPU 2 becomes device 0, GPU 0 becomes device 1, etc.
```

## Multi-GPU with PyTorch

### Data Parallelism (DataParallel)

The simplest multi-GPU approach - PyTorch replicates the model on each GPU and splits batches:

```python
import torch
import torch.nn as nn

# Define your model
model = YourModel()

# Wrap with DataParallel to use all available GPUs
if torch.cuda.device_count() > 1:
    print(f"Using {torch.cuda.device_count()} GPUs")
    model = nn.DataParallel(model)

model = model.cuda()

# Training works normally - DataParallel handles the splits
for batch in dataloader:
    inputs, labels = batch
    inputs = inputs.cuda()
    labels = labels.cuda()

    outputs = model(inputs)  # Automatically split across GPUs
    loss = criterion(outputs, labels)
    loss.backward()
    optimizer.step()
```

### Distributed Data Parallel (DDP) - Recommended

DDP has lower overhead than DataParallel and scales better:

```python
import torch
import torch.distributed as dist
import torch.multiprocessing as mp
from torch.nn.parallel import DistributedDataParallel as DDP

def train(rank, world_size):
    # Initialize the process group
    dist.init_process_group("nccl", rank=rank, world_size=world_size)

    # Create model and move to GPU
    model = YourModel().to(rank)

    # Wrap with DDP
    ddp_model = DDP(model, device_ids=[rank])

    # Sampler ensures each GPU gets different data
    sampler = torch.utils.data.distributed.DistributedSampler(
        dataset, num_replicas=world_size, rank=rank
    )
    dataloader = DataLoader(dataset, batch_size=64, sampler=sampler)

    # Training loop
    for epoch in range(num_epochs):
        sampler.set_epoch(epoch)  # Ensures different shuffling per epoch
        for batch in dataloader:
            inputs, labels = batch
            inputs = inputs.to(rank)
            labels = labels.to(rank)

            outputs = ddp_model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

    dist.destroy_process_group()

# Launch training across all GPUs
if __name__ == "__main__":
    world_size = torch.cuda.device_count()
    mp.spawn(train, args=(world_size,), nprocs=world_size, join=True)
```

Launch with torchrun for more control:

```bash
# Launch DDP training
torchrun --nproc_per_node=$(nvidia-smi --list-gpus | wc -l) train_ddp.py
```

## Multi-GPU with TensorFlow

TensorFlow's `MirroredStrategy` handles data parallelism:

```python
import tensorflow as tf

# Automatically uses all available GPUs
strategy = tf.distribute.MirroredStrategy()

print(f"Number of GPUs: {strategy.num_replicas_in_sync}")

with strategy.scope():
    # Build model inside strategy scope
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(256, activation='relu'),
        tf.keras.layers.Dense(10, activation='softmax')
    ])

    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

# Training automatically distributes across GPUs
model.fit(dataset, epochs=10, batch_size=256)
```

For specific GPU selection:

```python
# Use only GPUs 0 and 2
gpus = tf.config.list_physical_devices('GPU')
selected = [gpus[0], gpus[2]]
tf.config.set_visible_devices(selected, 'GPU')

strategy = tf.distribute.MirroredStrategy(
    devices=['/GPU:0', '/GPU:1']  # references selected GPUs
)
```

## Enabling Peer-to-Peer Access

For CUDA applications that transfer data directly between GPUs:

```python
import torch

# Check if GPUs can communicate directly
for i in range(torch.cuda.device_count()):
    for j in range(torch.cuda.device_count()):
        if i != j:
            can_access = torch.cuda.can_device_access_peer(i, j)
            print(f"GPU {i} -> GPU {j}: peer access {'available' if can_access else 'not available'}")

# Enable peer access explicitly (usually handled by frameworks)
import ctypes
libcuda = ctypes.CDLL('libcuda.so')
# Enable peer access from device 0 to device 1
libcuda.cuCtxEnablePeerAccess(device_1_context, 0)
```

## Monitoring All GPUs Together

```bash
# Watch all GPUs simultaneously
watch -n 1 "nvidia-smi --query-gpu=index,name,utilization.gpu,utilization.memory,memory.used,temperature.gpu,power.draw --format=csv"

# nvtop shows all GPUs in one view
nvtop

# Log multi-GPU stats
nvidia-smi dmon -d 5 -s putm -f /var/log/multi_gpu_stats.log
```

## NUMA Affinity for PCIe GPUs

In multi-socket systems, GPU performance depends on which CPU socket it's connected to. Check NUMA affinity:

```bash
# Show NUMA nodes and GPU affinity
nvidia-smi topo -m

# Check which CPUs are local to each GPU
for i in $(nvidia-smi --query-gpu=index --format=csv,noheader); do
    echo "GPU $i NUMA node:"
    nvidia-smi --query-gpu=index --format=csv,noheader -i $i
    cat /sys/bus/pci/devices/$(nvidia-smi --query-gpu=pci.bus_id --format=csv,noheader -i $i | tr '[:upper:]' '[:lower:]' | sed 's/00000000:/0000:/')/numa_node
done

# Run training on CPU cores local to the GPU
# (For a GPU on NUMA node 0, CPUs 0-31)
numactl --cpunodebind=0 --membind=0 python3 train.py
```

## Troubleshooting Multi-GPU Issues

### One GPU not appearing

```bash
# Check all PCIe slots
lspci | grep -i nvidia

# Rescan PCI bus
echo 1 | sudo tee /sys/bus/pci/rescan

# Check power - dual-slot GPUs need separate PCIe power connectors
nvidia-smi --query-gpu=power.draw,power.limit --format=csv
```

### Uneven GPU utilization (one GPU idle)

```bash
# Check batch size - each GPU needs enough data
# Effective batch size = batch_size_per_gpu * num_gpus
# Too small batch_size_per_gpu = idle GPUs

# With DataParallel, check the model isn't bottlenecked at the primary GPU
# DDP is usually more balanced
```

### NCCL errors in distributed training

```bash
# Set NCCL debug level
export NCCL_DEBUG=INFO

# If NVLink is available, force NCCL to use it
export NCCL_P2P_LEVEL=NVL

# For PCIe systems without NVLink
export NCCL_P2P_LEVEL=PXB
```

Multi-GPU scaling is rarely perfectly linear. Expect 80-90% scaling efficiency with DDP on well-configured NVLink systems, and 60-80% on PCIe systems. The investment in setting it up properly pays off quickly at scale.
