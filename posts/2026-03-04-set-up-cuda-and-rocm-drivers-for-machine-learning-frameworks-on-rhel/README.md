# How to Set Up CUDA and ROCm Drivers for Machine Learning Frameworks on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CUDA, ROCm, GPU, Machine Learning

Description: Install NVIDIA CUDA and AMD ROCm drivers on RHEL to enable GPU acceleration for machine learning frameworks like PyTorch and TensorFlow.

---

Machine learning frameworks need GPU drivers to offload compute operations. NVIDIA GPUs use CUDA, while AMD GPUs use ROCm. Here is how to set up both on RHEL.

## NVIDIA CUDA Setup

### Disable the Nouveau Driver

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
sudo dnf clean expire-cache
```

### Install CUDA Toolkit and Drivers

```bash
# Enable the NVIDIA driver module stream for RHEL 9
sudo dnf module enable -y nvidia-driver:latest-dkms

# Install the CUDA toolkit and proprietary NVIDIA driver packages
sudo dnf install -y cuda-toolkit cuda-drivers

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
# Install cuDNN from the CUDA repo, matching your CUDA major version
sudo dnf -y install --allowerasing cudnn9-cuda-12
# For CUDA 13, use:
# sudo dnf -y install --allowerasing cudnn9-cuda-13
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
# Install the AMDGPU installer package for RHEL 9.7
sudo dnf install -y https://repo.radeon.com/amdgpu-install/7.2.3/rhel/9.7/amdgpu-install-7.2.3.70203-1.el9.noarch.rpm
sudo dnf clean all
```

### Install ROCm

```bash
# Install kernel headers and the AMDGPU kernel driver
sudo dnf install -y "kernel-headers-$(uname -r)" "kernel-devel-$(uname -r)" "kernel-devel-matched-$(uname -r)"
sudo dnf install -y amdgpu-dkms

# Enable repositories and packages required by ROCm on RHEL 9
wget https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
sudo rpm -ivh epel-release-latest-9.noarch.rpm
sudo dnf config-manager --enable codeready-builder-for-rhel-9-x86_64-rpms
sudo dnf install -y python3-setuptools python3-wheel

# Add your user to the render and video groups
sudo usermod -a -G render,video $LOGNAME

# Install ROCm
sudo dnf install -y rocm

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
amd-smi

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
