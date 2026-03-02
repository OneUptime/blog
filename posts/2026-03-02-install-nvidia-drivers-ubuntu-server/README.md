# How to Install NVIDIA Drivers on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NVIDIA, GPU, Drivers, Server

Description: Complete guide to installing NVIDIA GPU drivers on Ubuntu Server for compute workloads, CUDA, and GPU-accelerated applications, including troubleshooting common issues.

---

Installing NVIDIA drivers on Ubuntu Server is a common requirement for GPU-accelerated workloads: machine learning training with CUDA, video transcoding, scientific computing, or GPU-accelerated databases. Unlike desktop systems where the goal is display output, server GPU driver installation focuses on compute capabilities, CUDA toolkit access, and integration with container runtimes.

## Before You Start

Identify your GPU and understand your goal:

```bash
# Check if an NVIDIA GPU is present
lspci | grep -i nvidia

# Example output:
# 01:00.0 VGA compatible controller: NVIDIA Corporation GA102 [GeForce RTX 3090] (rev a1)
# 01:00.1 Audio device: NVIDIA Corporation GA102 High Definition Audio Controller (rev a1)

# Check kernel version (affects driver compatibility)
uname -r

# Check Ubuntu version
lsb_release -a

# Check if nouveau (open-source NVIDIA driver) is loaded
lsmod | grep nouveau
```

## Method 1: Ubuntu's ubuntu-drivers Tool (Recommended)

Ubuntu's `ubuntu-drivers` tool detects your GPU and recommends the appropriate driver:

```bash
# Update package lists
sudo apt update

# Install ubuntu-drivers utility
sudo apt install -y ubuntu-drivers-common

# Detect your GPU and show recommended drivers
sudo ubuntu-drivers devices

# Example output:
# == /sys/devices/pci0000:00/0000:00:01.0/0000:01:00.0 ==
# modalias : pci:v000010DEd00002204sv...
# vendor   : NVIDIA Corporation
# model    : GA102 [GeForce RTX 3090]
# driver   : nvidia-driver-535 - distro non-free recommended
# driver   : nvidia-driver-525 - distro non-free
# driver   : xserver-xorg-video-nouveau - distro free builtin

# Install the recommended driver automatically
sudo ubuntu-drivers install

# Or install a specific version
sudo ubuntu-drivers install nvidia:535

# Reboot to load the new driver
sudo reboot
```

## Method 2: Direct apt Installation

If you know which driver version you need:

```bash
# Update package lists
sudo apt update

# List available NVIDIA driver packages
apt search nvidia-driver | grep "nvidia-driver-[0-9]"

# Install a specific version (535 is a common LTS branch)
sudo apt install -y nvidia-driver-535

# For headless/compute-only servers (no display needed)
sudo apt install -y nvidia-headless-535 nvidia-utils-535

# Install CUDA toolkit support alongside the driver
sudo apt install -y nvidia-driver-535 nvidia-cuda-toolkit

# Reboot
sudo reboot
```

## Method 3: NVIDIA Official Repository

For the most current drivers or specific enterprise versions:

```bash
# Add NVIDIA CUDA repository
# Check https://developer.nvidia.com/cuda-downloads for the current URL
UBUNTU_VERSION="2204"  # Use 2404 for Ubuntu 24.04

wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu${UBUNTU_VERSION}/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb

sudo apt update

# Install CUDA toolkit (includes compatible drivers)
sudo apt install -y cuda-toolkit-12-3

# Install just the driver from NVIDIA repo
sudo apt install -y nvidia-driver-535 cuda-drivers

# Reboot
sudo reboot
```

## Disabling Nouveau Driver

NVIDIA's proprietary drivers conflict with the open-source nouveau driver. The installation process usually handles this, but if you have issues:

```bash
# Check if nouveau is loaded
lsmod | grep nouveau

# Create a blacklist file for nouveau
sudo tee /etc/modprobe.d/blacklist-nouveau.conf << 'EOF'
# Blacklist the nouveau open-source NVIDIA driver
blacklist nouveau
options nouveau modeset=0
EOF

# Update initramfs
sudo update-initramfs -u

# Reboot to apply
sudo reboot

# After reboot, confirm nouveau is not loaded
lsmod | grep nouveau
# Should return nothing
```

## Verifying the Installation

After rebooting, verify the driver is loaded and functioning:

```bash
# Check if NVIDIA driver is loaded
lsmod | grep nvidia

# Get GPU information and driver status
nvidia-smi

# Expected output shows:
# Driver version, CUDA version, GPU name, memory usage, processes

# Example nvidia-smi output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.104.12   Driver Version: 535.104.12   CUDA Version: 12.2   |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |   0  NVIDIA A100-SXM...  Off  | 00000000:01:00.0 Off |                    0 |
# | N/A   25C    P0    64W / 400W |      4MiB / 40960MiB |      0%      Default |
# +-----------------------------------------------------------------------------+

# Check driver version
cat /proc/driver/nvidia/version

# Check CUDA version if installed
nvcc --version 2>/dev/null || echo "CUDA toolkit not installed"

# Run a quick GPU stress test
nvidia-smi dmon -s pcu -d 1 -c 5  # Monitor GPU for 5 seconds
```

## Setting Driver Persistence Mode

Persistence mode keeps the driver initialized between GPU uses, reducing initialization latency:

```bash
# Enable persistence mode (recommended for servers)
sudo nvidia-persistenced --user root

# Or enable via nvidia-smi
sudo nvidia-smi -pm 1

# Make persistence mode survive reboots
sudo tee /etc/systemd/system/nvidia-persistenced.service << 'EOF'
[Unit]
Description=NVIDIA Persistence Daemon
After=network.target

[Service]
Type=forking
ExecStart=/usr/bin/nvidia-persistenced --user root
ExecStopPost=/bin/rm -rf /var/run/nvidia-persistenced

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now nvidia-persistenced

# Verify persistence is enabled
nvidia-smi | grep Persistence
```

## Installing CUDA Toolkit

For GPU compute workloads, CUDA toolkit is needed:

```bash
# Install CUDA toolkit (choose version compatible with your driver)
# CUDA 12.x requires driver 520+
sudo apt install -y cuda-toolkit-12-3

# Verify CUDA installation
nvcc --version

# Add CUDA to PATH
echo 'export PATH=/usr/local/cuda/bin:$PATH' | sudo tee /etc/profile.d/cuda.sh
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' | sudo tee -a /etc/profile.d/cuda.sh
source /etc/profile.d/cuda.sh

# Test CUDA with a sample
# If cuda-samples is installed:
cd /usr/local/cuda/samples/1_Utilities/deviceQuery
sudo make
./deviceQuery
```

## NVIDIA Container Toolkit (Docker/Kubernetes)

For GPU-accelerated containers:

```bash
# Install NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt update
sudo apt install -y nvidia-container-toolkit

# Configure Docker to use NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Test GPU access in Docker
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi
```

## Setting GPU Power Limits

For server environments, you may want to cap GPU power consumption:

```bash
# Check current and maximum power limits
nvidia-smi -q -d POWER

# Set power limit (in watts)
# Example: set to 250W on GPU 0
sudo nvidia-smi -i 0 -pl 250

# Set for all GPUs
sudo nvidia-smi -pl 300

# Check GPU temperatures
nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader

# Monitor GPU health continuously
nvidia-smi dmon -s pucvmet -d 5
```

## Troubleshooting Common Issues

### Driver Load Failure

```bash
# Check kernel logs for NVIDIA errors
sudo dmesg | grep -i nvidia | tail -30

# Check if UEFI Secure Boot is blocking driver
sudo mokutil --sb-state

# If Secure Boot is enabled, you need to sign the driver or disable Secure Boot
# Disable Secure Boot in BIOS/UEFI firmware settings

# Rebuild NVIDIA kernel modules
sudo dkms status | grep nvidia
sudo dkms install nvidia/$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null)
```

### After Kernel Update

NVIDIA drivers need to be rebuilt for each kernel version. DKMS handles this automatically:

```bash
# Check DKMS status
sudo dkms status

# If modules are not built for current kernel
NVIDIA_VERSION=$(dpkg -l | grep nvidia-driver | awk '{print $3}' | cut -d. -f1-3 | head -1)
sudo dkms autoinstall

# Or reinstall the driver
sudo apt install --reinstall nvidia-driver-535
sudo reboot
```

### nvidia-smi Shows No GPUs

```bash
# Check if the driver module is loaded
lsmod | grep nvidia_drm
lsmod | grep nvidia_modeset
lsmod | grep nvidia

# Load modules manually
sudo modprobe nvidia
sudo modprobe nvidia_drm
sudo modprobe nvidia_modeset

# If modprobe fails, check for errors
sudo modprobe nvidia 2>&1

# Check if the GPU is recognized by the system
lspci -v | grep -A 10 -i nvidia
```

### Checking Driver Version Compatibility

```bash
# Check which CUDA versions are compatible with your driver
# https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/

# CUDA 12.3 requires >= Driver 545.23
# CUDA 12.2 requires >= Driver 535.54
# CUDA 12.0 requires >= Driver 525.60
# CUDA 11.8 requires >= Driver 520.61

# Check installed driver version
nvidia-smi --query-gpu=driver_version --format=csv,noheader
```

NVIDIA driver installation on Ubuntu Server is reliable when you follow the recommended path through `ubuntu-drivers` or the official NVIDIA CUDA repository. The most common complications are Secure Boot signing requirements and driver rebuilds after kernel updates - both of which DKMS handles automatically for the latter. For production GPU compute workloads, also consider setting persistence mode and appropriate power limits as part of your baseline server configuration.
