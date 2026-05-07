# How to Run NVIDIA GPU Containers with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, NVIDIA, GPU, Container, CUDA, Deep Learning

Description: A complete guide to running NVIDIA GPU-accelerated containers with Podman, covering driver setup, the NVIDIA Container Toolkit, and practical deep learning examples.

---

> Running NVIDIA GPU containers with Podman gives you the performance of bare-metal CUDA without sacrificing the portability and isolation that containers provide.

NVIDIA GPUs dominate the landscape of accelerated computing, powering everything from deep learning training to real-time video transcoding. Running these workloads in Podman containers allows teams to package their GPU applications with all dependencies, making deployments reproducible and portable. This guide walks through the complete process of setting up NVIDIA GPU support in Podman, from driver installation to running production workloads.

---

## Prerequisites

Before you can run NVIDIA GPU containers, your host system needs the NVIDIA proprietary drivers installed and working.

### Verify Your NVIDIA GPU and Drivers

```bash
# Check if your NVIDIA GPU is detected

lspci | grep -i nvidia
# Example output:
# 01:00.0 VGA compatible controller: NVIDIA Corporation GA106 [GeForce RTX 3060] (rev a1)

# Verify the NVIDIA driver is loaded
nvidia-smi
# This should display your GPU model, driver version, and CUDA version

# Check the driver version
cat /proc/driver/nvidia/version
```

If `nvidia-smi` does not work, install the NVIDIA drivers first:

```bash
# On Fedora/RHEL
# Enable RPM Fusion or your distribution's NVIDIA driver repository first
sudo dnf install -y akmod-nvidia xorg-x11-drv-nvidia-cuda

# On Ubuntu
sudo apt-get update
sudo apt-get install -y ubuntu-drivers-common
sudo ubuntu-drivers install

# Reboot after installation
sudo reboot
```

### Install Podman

```bash
# On Fedora/RHEL/CentOS
sudo dnf install -y podman

# On Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y podman

# Verify
podman --version
```

## Installing the NVIDIA Container Toolkit

The NVIDIA Container Toolkit is the recommended way to run NVIDIA GPU containers. It handles the complex task of mapping GPU device files, driver libraries, and utility binaries into the container.

```bash
# Add the NVIDIA Container Toolkit repository

# For RHEL/Fedora/CentOS
curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | \
  sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo
sudo dnf install -y nvidia-container-toolkit

# For Ubuntu/Debian
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

## Generating CDI Specifications

The Container Device Interface (CDI) is the mechanism Podman uses to discover and configure NVIDIA GPUs. Generate the CDI specification:

```bash
# Generate CDI spec for all NVIDIA GPUs on the system
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml

# Verify the generated spec
nvidia-ctk cdi list
# Example output:
# INFO[0000] Found 2 CDI devices
# nvidia.com/gpu=0
# nvidia.com/gpu=all

# Inspect the generated CDI file
cat /etc/cdi/nvidia.yaml
```

For rootless Podman, the system-wide CDI spec can still be used if the user can read it. If you generate the CDI spec in user space, point Podman at that directory:

```bash
# Generate CDI spec for rootless use
mkdir -p ~/.config/cdi
nvidia-ctk cdi generate --output=$HOME/.config/cdi/nvidia.yaml
podman --cdi-spec-dir=$HOME/.config/cdi run --rm \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi
```

## Running Your First NVIDIA GPU Container

With everything configured, run a basic container to verify GPU access:

```bash
# Run nvidia-smi inside a container
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi

# Expected output shows your GPU details:
# +-------------------------------------------------------------------------+
# | NVIDIA-SMI 545.29.06    Driver Version: 545.29.06    CUDA Version: 12.3 |
# |-------------------------------+----------------------+------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M.  |
# |===============================+======================+==================|
# |   0  NVIDIA GeForce ...  Off  | 00000000:01:00.0 Off |                  N/A |
# |  0%   35C    P8     9W / 170W |      0MiB /  12288MiB|      0%      Default |
# +-------------------------------+----------------------+------------------+
```

## Choosing the Right NVIDIA CUDA Base Image

NVIDIA provides several tiers of CUDA container images:

```bash
# base - minimal CUDA runtime (libcudart)
# Smallest image, good for deploying pre-compiled applications
podman pull nvidia/cuda:12.3.0-base-ubuntu22.04

# runtime - base + CUDA math libraries and NCCL
# Good for running pre-built CUDA applications
podman pull nvidia/cuda:12.3.0-runtime-ubuntu22.04

# devel - runtime + compiler toolchain, headers, and static libraries
# Needed for building CUDA applications from source
podman pull nvidia/cuda:12.3.0-devel-ubuntu22.04
```

## Running a Deep Learning Workload

Here is a practical example of running a PyTorch training job with GPU acceleration:

```bash
# Create a simple training script
mkdir -p /tmp/gpu-demo
cat > /tmp/gpu-demo/train.py << 'EOF'
import torch
import torch.nn as nn
import torch.optim as optim

# Check GPU availability
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU count: {torch.cuda.device_count()}")
if torch.cuda.is_available():
    print(f"GPU name: {torch.cuda.get_device_name(0)}")
    print(f"CUDA version: {torch.version.cuda}")

# Create a simple model and move it to GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

model = nn.Sequential(
    nn.Linear(784, 256),
    nn.ReLU(),
    nn.Linear(256, 128),
    nn.ReLU(),
    nn.Linear(128, 10)
).to(device)

# Generate synthetic data on GPU
x = torch.randn(1000, 784, device=device)
y = torch.randint(0, 10, (1000,), device=device)

# Train for a few steps
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

for epoch in range(5):
    optimizer.zero_grad()
    output = model(x)
    loss = criterion(output, y)
    loss.backward()
    optimizer.step()
    print(f"Epoch {epoch+1}, Loss: {loss.item():.4f}")

print("Training complete!")
EOF

# Run the training script in a GPU container
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  -v /tmp/gpu-demo:/workspace:Z \
  pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime \
  python /workspace/train.py
```

## Running with Specific GPUs

On multi-GPU systems, you can assign specific GPUs to different containers:

```bash
# Run on GPU 0 only
podman run --rm -it \
  --device nvidia.com/gpu=0 \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi

# Run on GPU 1 only
podman run --rm -it \
  --device nvidia.com/gpu=1 \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi
```

## Using Manual Device Passthrough (Without CDI)

If you prefer not to use CDI, you can manually pass NVIDIA device files:

```bash
# Manually pass all required NVIDIA device files
podman run --rm -it \
  --device /dev/nvidia0:/dev/nvidia0 \
  --device /dev/nvidiactl:/dev/nvidiactl \
  --device /dev/nvidia-modeset:/dev/nvidia-modeset \
  --device /dev/nvidia-uvm:/dev/nvidia-uvm \
  --device /dev/nvidia-uvm-tools:/dev/nvidia-uvm-tools \
  --security-opt=label=disable \
  -v /usr/lib64/libnvidia-ml.so.1:/usr/lib64/libnvidia-ml.so.1:ro \
  -v /usr/bin/nvidia-smi:/usr/bin/nvidia-smi:ro \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi
```

This approach requires manually mounting driver libraries, which makes CDI the preferred method.

## Running NVIDIA GPU Containers in Pods

Podman pods let you group related containers that share a network namespace. You can pass GPUs to specific containers within a pod:

```bash
# Create a pod
podman pod create --name ml-pod -p 8888:8888

# Run a Jupyter notebook server with GPU access in the pod
podman run -d \
  --pod ml-pod \
  --name jupyter-gpu \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  -v /home/$USER/notebooks:/workspace:Z \
  pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime \
  jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser --allow-root \
  --NotebookApp.token='mytoken'

# Check pod status
podman pod ps
```

## Monitoring GPU Usage

Monitor GPU utilization from the host while containers are running:

```bash
# Watch GPU usage in real-time (runs on the host)
watch -n 1 nvidia-smi

# Query specific metrics
nvidia-smi --query-gpu=gpu_name,temperature.gpu,utilization.gpu,memory.used,memory.total \
  --format=csv,noheader

# Check which processes are using the GPU
nvidia-smi pmon -s u -d 1
```

## Troubleshooting

Common issues and their solutions:

```bash
# Error: "CDI device nvidia.com/gpu=all not found"
# Regenerate the CDI spec
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml

# Error: "failed to create container: NVIDIA driver not found"
# Check if the driver is loaded
lsmod | grep nvidia
# If not loaded, try:
sudo modprobe nvidia

# Error: "permission denied" on /dev/nvidia*
# For rootless podman, ensure proper device permissions
ls -la /dev/nvidia*
# If access depends on supplementary groups, add the user to the video group and pass groups into the container
sudo usermod -aG video $USER
podman run --rm \
  --group-add keep-groups \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi

# SELinux blocking GPU access (Fedora/RHEL)
sudo setsebool -P container_use_devices on
sudo ausearch -m avc -ts recent | grep nvidia
```

## Conclusion

Running NVIDIA GPU containers with Podman is straightforward once the NVIDIA Container Toolkit and CDI are configured. The CDI approach eliminates the need to manually map device files and driver libraries, making it reliable across different host configurations. Whether you are running single-GPU inference or multi-GPU training jobs, Podman provides the isolation and reproducibility you need while giving your containers full access to NVIDIA hardware acceleration.
