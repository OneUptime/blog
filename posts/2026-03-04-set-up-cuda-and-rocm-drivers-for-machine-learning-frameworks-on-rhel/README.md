# How to Set Up CUDA and ROCm Drivers for Machine Learning Frameworks on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CUDA, ROCm, GPU, Machine Learning

Description: Install NVIDIA CUDA and AMD ROCm drivers on RHEL to enable GPU acceleration for machine learning frameworks like PyTorch and TensorFlow.

---

Machine learning frameworks need GPU drivers to offload compute operations. NVIDIA GPUs use CUDA, while AMD GPUs use ROCm. Here is how to set up both on RHEL.

## NVIDIA CUDA Setup

### Install NVIDIA Drivers

```bash
# Disable the nouveau driver
echo "blacklist nouveau" | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
echo "options nouveau modeset=0" | sudo tee -a /etc/modprobe.d/blacklist-nouveau.conf
sudo dracut -f
sudo reboot
```

### Add the CUDA Repository

```bash
# Add the NVIDIA CUDA repository for RHEL 9
sudo dnf config-manager --add-repo \
    https://developer.download.nvidia.com/compute/cuda/repos/rhel9/x86_64/cuda-rhel9.repo

# Clean the cache
sudo dnf clean all
```

### Install CUDA Toolkit and Drivers

```bash
# Install the full CUDA toolkit (includes drivers)
sudo dnf install -y cuda-toolkit-12-4 cuda-drivers

# Set up environment variables
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc

# Verify the installation
nvidia-smi
nvcc --version
```

### Install cuDNN (for Deep Learning)

```bash
# Install cuDNN from the CUDA repo
sudo dnf install -y libcudnn8 libcudnn8-devel
```

## AMD ROCm Setup

### Check GPU Compatibility

```bash
# Verify AMD GPU is present
lspci | grep -i amd
# Look for AMD Instinct MI200/MI300 or Radeon Pro series
```

### Add the ROCm Repository

```bash
# Add the AMD ROCm repository for RHEL 9
cat << 'EOF' | sudo tee /etc/yum.repos.d/rocm.repo
[rocm]
name=ROCm
baseurl=https://repo.radeon.com/rocm/rhel9/6.0/main
enabled=1
gpgcheck=1
gpgkey=https://repo.radeon.com/rocm/rocm.gpg.key
EOF

sudo dnf clean all
```

### Install ROCm

```bash
# Install the ROCm runtime and development packages
sudo dnf install -y rocm-hip-runtime rocm-hip-sdk rocm-dev

# Install the kernel driver
sudo dnf install -y amdgpu-dkms

# Add your user to the render and video groups
sudo usermod -aG render,video $USER

# Set up environment variables
echo 'export PATH=/opt/rocm/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/opt/rocm/lib:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc

# Reboot to load the new kernel module
sudo reboot
```

### Verify ROCm

```bash
# Check GPU detection
rocm-smi

# List available GPUs
rocminfo | grep "Marketing Name"

# Run the ROCm bandwidth test
rocm-bandwidth-test
```

## Verify with Python

```bash
# Test CUDA with PyTorch
python3 -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('Device:', torch.cuda.get_device_name(0))"

# Test ROCm with PyTorch
python3 -c "import torch; print('ROCm available:', torch.cuda.is_available()); print('HIP version:', torch.version.hip)"
```

With CUDA or ROCm installed on RHEL, your machine learning frameworks can leverage GPU acceleration for training and inference workloads.
