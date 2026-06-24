# How to Install AMD GPU Drivers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AMD, GPU, ROCm, Driver

Description: A practical guide to installing AMD GPU drivers on Ubuntu using AMDGPU-PRO and ROCm, covering both desktop graphics and compute workloads with troubleshooting tips.

---

AMD GPU driver installation on Ubuntu is handled through two separate stacks depending on your use case: the open-source AMDGPU driver for desktop graphics (already included in the Linux kernel), and ROCm or Radeon Software packages for compute workloads like machine learning and OpenCL. Understanding which stack you need saves a lot of frustration.

## Understanding the AMD Driver Stack

- **amdgpu (kernel driver)**: Open-source, ships with Ubuntu's kernel. Works out of the box for most RDNA and GCN GPUs. Handles display and basic OpenGL/Vulkan.
- **Radeon Software for Linux**: AMD's packaged graphics and workstation stack on top of the open-source kernel driver. Use the `graphics` use case for the open-source Mesa graphics stack; the proprietary workstation stack is only for specific supported workstation workflows.
- **ROCm (Radeon Open Compute)**: AMD's compute platform for GPU programming, machine learning (HIP, PyTorch, TensorFlow). The AMD equivalent of NVIDIA's CUDA.

For gaming and desktop use, the kernel driver is usually sufficient. For ML or OpenCL compute, install ROCm.

## Checking Your GPU

```bash
# List all PCIe devices and filter for AMD

lspci | grep -i amd

# Check if the kernel already loaded amdgpu
lsmod | grep amdgpu

# View GPU details
sudo dmesg | grep amdgpu
```

## Supported GPU List

Not all AMD GPUs are supported by ROCm. Check https://rocm.docs.amd.com/projects/install-on-linux/en/latest/reference/system-requirements.html for the current list. Generally supported:
- RX 7000 series (RDNA 3, gfx1100/1101)
- RX 9000 series (RDNA 4, gfx1200/1201)
- Radeon PRO W6800/W7000 series and newer Radeon PRO cards listed in AMD's matrix
- Instinct MI100/MI200/MI300/MI350 (datacenter)

Older Radeon cards, including Vega and Polaris desktop GPUs, are not officially supported by current ROCm releases.

## Installing Radeon Graphics Packages for Desktop/OpenGL

If you need AMD's packaged graphics stack for applications like Blender, DaVinci Resolve, or CAD software:

```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install -y wget

# Download the AMDGPU installer from AMD's support page
# Find the latest at: https://www.amd.com/en/support/linux-drivers
# Example for Ubuntu 22.04
wget https://repo.radeon.com/amdgpu-install/7.2.3/ubuntu/jammy/amdgpu-install_7.2.3.70203-1_all.deb

# Install the installer package
sudo apt install ./amdgpu-install_7.2.3.70203-1_all.deb
sudo apt-get update

# Install the graphics stack for desktop workloads
sudo amdgpu-install --usecase=graphics

# Or install just OpenCL support
sudo apt-get install -y rocm-opencl-runtime
```

After installation, add your user to the render and video groups:

```bash
sudo usermod -aG render,video $USER
```

Reboot after installation.

## Installing ROCm for Compute/ML Workloads

ROCm is AMD's answer to CUDA. The installation uses AMD's package repository:

```bash
# Install the ROCm installer
wget https://repo.radeon.com/amdgpu-install/7.2.3/ubuntu/jammy/amdgpu-install_7.2.3.70203-1_all.deb
sudo apt install ./amdgpu-install_7.2.3.70203-1_all.deb
sudo apt-get update

# Install the packaged AMDGPU kernel driver
sudo apt-get install -y "linux-headers-$(uname -r)" "linux-modules-extra-$(uname -r)"
sudo apt-get install -y amdgpu-dkms

# Install ROCm (includes HIP, rocBLAS, MIOpen)
sudo apt-get install -y rocm

# Add user to groups
sudo usermod -aG render,video $USER

# Reboot
sudo reboot
```

After reboot, verify ROCm:

```bash
# Check GPU detection
/opt/rocm/bin/rocminfo

# Verify clinfo for OpenCL
clinfo | head -30

# Check ROCm version
cat /opt/rocm/.info/version
```

## Configuring Environment Variables for ROCm

```bash
# Add ROCm to PATH
cat >> ~/.bashrc << 'EOF'
export PATH=/opt/rocm/bin:$PATH
export ROCM_PATH=/opt/rocm
EOF

sudo tee --append /etc/ld.so.conf.d/rocm.conf << 'EOF'
/opt/rocm/lib
/opt/rocm/lib64
EOF
sudo ldconfig

source ~/.bashrc
```

## Installing PyTorch with ROCm Support

AMD maintains ROCm-enabled PyTorch builds:

```bash
# Create a virtual environment
python3 -m venv ~/rocm-ml
source ~/rocm-ml/bin/activate

# Install PyTorch with ROCm support (check pytorch.org for latest)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.3

# Test GPU detection
python3 -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA/ROCm available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU: {torch.cuda.get_device_name(0)}')
    print(f'GPU count: {torch.cuda.device_count()}')
"
```

ROCm uses the CUDA compatibility layer (HIP), so PyTorch code written for NVIDIA works on AMD with minimal or no changes. The `torch.cuda` API works for AMD GPUs through this abstraction.

## Testing with a Benchmark

```python
import torch
import time

# This code runs on AMD GPU through HIP/ROCm
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# Matrix multiplication benchmark
size = 5000
a = torch.randn(size, size, device=device)
b = torch.randn(size, size, device=device)

# Warm up
torch.mm(a, b)
if torch.cuda.is_available():
    torch.cuda.synchronize()

start = time.time()
for _ in range(10):
    c = torch.mm(a, b)
if torch.cuda.is_available():
    torch.cuda.synchronize()
elapsed = time.time() - start

print(f"Matrix multiply (10 iterations): {elapsed:.3f}s")
if torch.cuda.is_available():
    print(f"GPU memory used: {torch.cuda.memory_allocated()/1e9:.2f} GB")
```

## Installing OpenCL for General Compute

For non-ML compute tasks that use OpenCL (like hashcat, Blender rendering):

```bash
# Install ROCm OpenCL
sudo apt-get install -y rocm-opencl-runtime rocm-opencl-sdk

# Verify
clinfo | grep "Device Name"
```

## Kernel Module Configuration

For some applications you may need to enable additional GPU features:

```bash
# Check current AMDGPU module parameters
cat /sys/module/amdgpu/parameters/ppfeaturemask

# Enable all power features (useful for overclocking tools)
# Add to /etc/modprobe.d/amdgpu.conf
echo 'options amdgpu ppfeaturemask=0xffffffff' | sudo tee /etc/modprobe.d/amdgpu.conf

# Rebuild initramfs
sudo update-initramfs -u
```

## Troubleshooting

### GPU not detected by ROCm

```bash
# Check if amdgpu module has loaded
lsmod | grep amdgpu

# Force reload the module
sudo modprobe -r amdgpu
sudo modprobe amdgpu

# Check kernel messages
sudo dmesg | grep -i amdgpu | tail -20
```

### Permission denied errors with GPU devices

```bash
# Verify group memberships
groups $USER

# If render/video groups are missing
sudo usermod -aG render,video $USER
# Log out and back in for group changes to take effect
```

### rocminfo shows "No GPU found"

This usually means the GPU is not in ROCm's supported list, or the kernel driver version doesn't match:

```bash
# Check the amdgpu driver version
modinfo amdgpu | grep version

# Check the current ROCm support matrix before trying unsupported overrides
/opt/rocm/bin/rocminfo
```

### Radeon packages conflict with Mesa

If Radeon packages cause conflicts with Mesa:

```bash
# Uninstall the AMDGPU stack and reinstall only what you need
sudo amdgpu-uninstall
sudo apt-get install -y rocm
```

## Monitoring GPU Performance

```bash
# Legacy ROCm system management tool
rocm-smi

# Newer ROCm releases also include AMD SMI
amd-smi list

# Watch mode
watch -n 1 rocm-smi

# Show all GPU info
rocm-smi --showallinfo

# Monitor temperature, power, and utilization
rocm-smi --showtemp --showpower --showuse
```

With ROCm configured, you have access to AMD's full compute stack. The PyTorch ROCm port is mature enough for production ML workloads, and OpenCL support covers most traditional GPU compute applications.
