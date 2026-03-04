# How to Set Up GPU Passthrough in LXD Containers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, GPU, Containers, Machine Learning

Description: Configure GPU passthrough in LXD containers on Ubuntu for machine learning workloads, CUDA development, and GPU-accelerated applications using NVIDIA and AMD GPUs.

---

GPU passthrough in LXD containers lets multiple containers share a physical GPU (or dedicated GPU slices) for ML training, inference, video transcoding, or other accelerated workloads. LXD handles GPU device passthrough cleanly through its device configuration system.

## GPU Passthrough vs GPU Virtualization

LXD supports two modes:

- **Full GPU passthrough** - the entire GPU device file is shared with the container. The host and container share the GPU driver. The container uses the GPU directly, no emulation layer.
- **MIG (Multi-Instance GPU)** - NVIDIA A100/H100 support GPU partitioning via MIG. Each MIG instance appears as a separate device.

This guide covers the more common full GPU passthrough for NVIDIA GPUs, with notes on AMD.

## Prerequisites

### System Requirements

```bash
# Verify GPU is present
lspci | grep -i "vga\|3d\|display"

# For NVIDIA GPUs specifically
nvidia-smi

# Verify LXD is installed (version 4.0+ recommended)
lxc version
```

### NVIDIA Driver Installation on Host

The GPU driver must be installed on the **host**, not inside the container. The container shares the host's driver:

```bash
# Check if NVIDIA driver is loaded
lsmod | grep nvidia

# Install NVIDIA driver if not present
sudo ubuntu-drivers autoinstall

# Or install a specific version
sudo apt install -y nvidia-driver-535

# Reboot to load the driver
sudo reboot

# Verify after reboot
nvidia-smi
```

## Basic GPU Passthrough

### Listing Available GPUs

```bash
# Check GPUs visible to LXD
lxc info --resources | grep -A10 "GPU"

# Expected output:
# GPUs:
#   Card 0:
#     DRM information:
#       ID: 0
#       Card: card0
#       Control: controlD64
#       Render: renderD128
#     NVIDIA information:
#       UUID: GPU-a1b2c3d4...
#       Architecture: Ampere
#       Brand: GeForce
#       Model: NVIDIA GeForce RTX 4090
#       VRAM: 24GiB
```

### Adding GPU to a Container

```bash
# Create a container for GPU work
lxc launch ubuntu:24.04 gpu-workload

# Add the GPU device
lxc config device add gpu-workload gpu0 gpu

# This adds ALL GPUs on the host to the container
# Verify device was added
lxc config device show gpu-workload
```

### Passing a Specific GPU

If the host has multiple GPUs, specify which one:

```bash
# Pass GPU by PCI address
lxc config device add gpu-workload gpu0 gpu pci=0000:01:00.0

# Pass GPU by NVIDIA UUID
lxc config device add gpu-workload gpu0 gpu id=GPU-a1b2c3d4-e5f6-...

# Pass GPU by vendor/product ID
lxc config device add gpu-workload gpu0 gpu \
  vendorid=10de \
  productid=2684

# Check PCI address
lspci -n | grep 10de  # 10de is NVIDIA's vendor ID
# 01:00.0 0302: 10de:2684 (rev a1)
```

## Installing CUDA Inside the Container

The container needs CUDA libraries that match the host driver version:

```bash
# Enter the container
lxc exec gpu-workload -- bash

# Inside the container - add CUDA repository
curl -fsSL https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/3bf863cc.pub | \
  apt-key add -

echo "deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/ /" \
  > /etc/apt/sources.list.d/cuda.list

apt update

# Install CUDA toolkit matching host driver version
# Host has driver 535, install CUDA 12.x toolkit
apt install -y cuda-toolkit-12-3

# Verify GPU access
nvidia-smi
nvcc --version
```

### Using NVIDIA Container Runtime

An alternative approach uses the NVIDIA Container Toolkit:

```bash
# Inside the container, install nvidia-container-toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  apt-key add -

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt update
apt install -y nvidia-container-toolkit

# Test GPU access
nvidia-smi
```

## Verifying GPU Access in the Container

```bash
# Check GPU is visible
lxc exec gpu-workload -- nvidia-smi

# Run a simple CUDA test
lxc exec gpu-workload -- bash -c "
  cat > /tmp/test_gpu.py << 'PYEOF'
import subprocess
result = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total', '--format=csv,noheader'], capture_output=True, text=True)
print('GPU detected:', result.stdout.strip())
PYEOF
python3 /tmp/test_gpu.py
"
```

## MIG (Multi-Instance GPU) Support

For NVIDIA A100/H100 with MIG mode enabled:

```bash
# Enable MIG mode on the host (requires NVIDIA A100 or H100)
sudo nvidia-smi -i 0 -mig 1

# Create MIG instances (example: 3x 3g.20gb on A100-80GB)
sudo nvidia-smi mig -cgi 3g.20gb -C
sudo nvidia-smi mig -cgi 3g.20gb -C
sudo nvidia-smi mig -cgi 3g.20gb -C

# List MIG instances
sudo nvidia-smi -L

# Pass a specific MIG instance to a container
lxc config device add container1 mig0 gpu \
  gputype=mig \
  mig.gi=0 \
  mig.ci=0

lxc config device add container2 mig1 gpu \
  gputype=mig \
  mig.gi=1 \
  mig.ci=0
```

## AMD GPU Passthrough

AMD GPUs use a similar approach but with ROCm instead of CUDA:

```bash
# Add AMD GPU to container
lxc config device add gpu-workload amdgpu gpu vendorid=1002

# Inside the container, install ROCm
lxc exec gpu-workload -- bash -c "
  curl -fsSL https://repo.radeon.com/rocm/rocm.gpg.key | apt-key add -
  echo 'deb [arch=amd64] https://repo.radeon.com/rocm/apt/5.7 jammy main' > /etc/apt/sources.list.d/rocm.list
  apt update
  apt install -y rocm-dev

  # Add ubuntu user to render and video groups
  usermod -aG render,video ubuntu
"

# Test
lxc exec gpu-workload -- rocminfo | grep -A5 "Agent 2"
```

## Creating a GPU Profile

For environments with multiple GPU containers, create a reusable profile:

```bash
# Create a GPU profile
lxc profile create gpu-standard
lxc profile set gpu-standard limits.cpu 8
lxc profile set gpu-standard limits.memory 32GiB
lxc profile device add gpu-standard root disk pool=default size=100GiB path=/
lxc profile device add gpu-standard eth0 nic nictype=bridged parent=lxdbr0
lxc profile device add gpu-standard gpu0 gpu

# Launch ML workloads with this profile
lxc launch ubuntu:24.04 training-job-1 --profile gpu-standard
lxc launch ubuntu:24.04 training-job-2 --profile gpu-standard
```

Note: Both containers in this example share the same physical GPU. There is no GPU-level memory isolation between containers unless using MIG.

## Security Considerations

GPU passthrough in LXD containers requires careful thought about security:

```bash
# GPU containers need access to /dev/dri and /dev/nvidia* devices
# LXD handles this automatically when you add a gpu device
# But verify the container is NOT privileged unless absolutely necessary

lxc config show gpu-workload | grep "security.privileged"
# Should be: false (or not set)

# Check which device files the container has access to
lxc exec gpu-workload -- ls -la /dev/nvidia*
lxc exec gpu-workload -- ls -la /dev/dri/
```

## Monitoring GPU Usage from Host

```bash
# Monitor GPU usage across all containers on the host
watch -n 2 nvidia-smi

# Or use nvidia-smi with process info to see which container process is using GPU
nvidia-smi pmon -s u -o T

# Check GPU usage per container (match PIDs to container processes)
for container in $(lxc list --format csv | awk -F',' '$2=="Running"{print $1}'); do
  echo "=== $container ==="
  lxc info $container | grep -i "pid"
done
```

## Troubleshooting

### "No CUDA-capable device detected" Inside Container

The driver version mismatch between host and container is the most common cause:

```bash
# Check host driver version
nvidia-smi | grep "Driver Version"

# Check CUDA version expected by that driver
# Driver 535 requires CUDA 12.2 or earlier

# Reinstall matching CUDA toolkit inside container
lxc exec gpu-workload -- apt install -y cuda-toolkit-12-2
```

### GPU Device Files Missing in Container

```bash
# Check if LXD added the device
lxc config device show gpu-workload

# Check host device files
ls -la /dev/nvidia*

# If nvidia module isn't loaded on host
sudo modprobe nvidia
sudo modprobe nvidia-uvm
sudo modprobe nvidia-drm
```

GPU passthrough in LXD enables shared GPU access for container workloads with minimal overhead compared to full VM GPU passthrough. For ML teams running multiple experiments simultaneously, LXD GPU containers provide a practical way to share expensive GPU hardware across workloads.
