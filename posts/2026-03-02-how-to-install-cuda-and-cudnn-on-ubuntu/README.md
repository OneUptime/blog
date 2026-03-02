# How to Install CUDA and cuDNN on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CUDA, GPU, Machine Learning, NVIDIA

Description: Complete guide to installing NVIDIA CUDA Toolkit and cuDNN on Ubuntu for GPU-accelerated computing and deep learning workloads.

---

CUDA is NVIDIA's parallel computing platform that enables GPU-accelerated applications. cuDNN is a GPU-accelerated library of primitives for deep neural networks. Together they form the foundation for running machine learning frameworks like PyTorch and TensorFlow with GPU acceleration. Getting the versions right and avoiding conflicts between drivers, CUDA, and cuDNN is the trickiest part of this setup.

## Prerequisites

You need an NVIDIA GPU. Check if the system sees it:

```bash
lspci | grep -i nvidia
```

Also check the current Ubuntu version, as CUDA version support varies:

```bash
lsb_release -a
```

This guide targets Ubuntu 22.04 LTS with CUDA 12.x and cuDNN 9.x. Adjust version numbers for your needs.

## Removing Existing NVIDIA Drivers

If you have a previous installation, clean it up first to avoid conflicts:

```bash
# Remove all NVIDIA packages
sudo apt purge 'nvidia-*' 'cuda-*' 'libcuda*' 'libcudnn*' -y
sudo apt autoremove -y

# Remove DKMS modules
sudo dkms status | grep nvidia | awk -F, '{print $1}' | xargs -I{} sudo dkms remove {}

# Reboot after cleanup
sudo reboot
```

## Installing NVIDIA Drivers

The recommended approach is using the NVIDIA driver package from NVIDIA's official repository. This ensures compatibility with the CUDA version you want.

```bash
# Add the NVIDIA package repository
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update

# List available driver versions
apt-cache search nvidia-driver | grep -E "^nvidia-driver-[0-9]+"

# Install a specific driver version (535 is common for CUDA 12.x)
sudo apt install nvidia-driver-535
```

Reboot after driver installation:

```bash
sudo reboot
```

After reboot, verify the driver loaded correctly:

```bash
nvidia-smi
```

The output should show your GPU, driver version, and CUDA version compatibility. The CUDA version shown here is the maximum supported, not what is installed yet.

## Installing CUDA Toolkit

With the NVIDIA repository already added, install the CUDA toolkit:

```bash
# Install CUDA 12.3 (adjust version as needed)
sudo apt install cuda-12-3

# Or install the latest available
sudo apt install cuda
```

The CUDA toolkit installs to `/usr/local/cuda-12.3/` with a symlink at `/usr/local/cuda`.

Add CUDA to your PATH and library path:

```bash
# Add to ~/.bashrc
cat >> ~/.bashrc << 'EOF'

# CUDA configuration
export CUDA_HOME=/usr/local/cuda
export PATH=$CUDA_HOME/bin:$PATH
export LD_LIBRARY_PATH=$CUDA_HOME/lib64:$LD_LIBRARY_PATH
EOF

source ~/.bashrc
```

Verify the installation:

```bash
# Check CUDA compiler version
nvcc --version

# Run CUDA device query sample
cd /usr/local/cuda/samples/1_Utilities/deviceQuery
sudo make
./deviceQuery
```

The deviceQuery output shows detailed GPU capabilities including compute capability, memory, and core counts.

## Installing cuDNN

cuDNN requires a free NVIDIA developer account to download from the NVIDIA website, but you can also install it via the CUDA repository:

```bash
# Install cuDNN via apt (after adding the CUDA keyring)
sudo apt install libcudnn9-cuda-12
sudo apt install libcudnn9-dev-cuda-12
sudo apt install libcudnn9-samples
```

Verify cuDNN installation:

```bash
# Check cuDNN version
cat /usr/include/cudnn_version.h | grep CUDNN_MAJOR -A 2

# Or check the library
ldconfig -v 2>/dev/null | grep cudnn
```

### Testing cuDNN

Run the cuDNN sample tests to confirm the library works:

```bash
cp -r /usr/src/cudnn_samples_v9 ~/
cd ~/cudnn_samples_v9/mnistCUDNN
make clean && make
./mnistCUDNN
```

You should see "Test passed!" at the end of the output.

## Managing Multiple CUDA Versions

Research and production environments often need different CUDA versions for different projects. Install multiple versions side by side:

```bash
# Install CUDA 11.8 alongside CUDA 12.3
sudo apt install cuda-11-8

# Switch between versions using update-alternatives
sudo update-alternatives --install /usr/local/cuda cuda /usr/local/cuda-11.8 118
sudo update-alternatives --install /usr/local/cuda cuda /usr/local/cuda-12.3 123

# Select which version to use
sudo update-alternatives --config cuda
```

For project-level CUDA version management, use environment variables:

```bash
# Activate CUDA 11.8 for a specific project
export CUDA_HOME=/usr/local/cuda-11.8
export PATH=/usr/local/cuda-11.8/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda-11.8/lib64:$LD_LIBRARY_PATH
```

## Testing with Python Frameworks

After installation, verify GPU access from Python:

```bash
# Install PyTorch with CUDA support
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu123

# Test PyTorch GPU access
python3 << 'EOF'
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
print(f"Device count: {torch.cuda.device_count()}")
print(f"Current device: {torch.cuda.get_device_name(0)}")

# Run a simple tensor operation on GPU
x = torch.rand(1000, 1000).cuda()
y = torch.rand(1000, 1000).cuda()
z = torch.mm(x, y)
print(f"GPU matrix multiply result shape: {z.shape}")
EOF
```

For TensorFlow:

```bash
# Install TensorFlow with GPU support
pip3 install tensorflow

# Verify GPU access
python3 -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

## Troubleshooting Common Issues

### Driver and CUDA version mismatch

The CUDA toolkit requires a minimum driver version. Check the compatibility table in NVIDIA's documentation. If `nvidia-smi` shows an older CUDA version than what you installed:

```bash
# Check what driver is actually loaded
cat /proc/driver/nvidia/version

# Ensure the driver package matches the CUDA version requirement
apt-cache show cuda-12-3 | grep Depends
```

### CUDA libraries not found

If applications can't find CUDA libraries:

```bash
# Update the library cache
sudo ldconfig

# Check if libraries are in the search path
ldconfig -p | grep libcuda

# Manually add library path if needed
echo '/usr/local/cuda/lib64' | sudo tee /etc/ld.so.conf.d/cuda.conf
sudo ldconfig
```

### Secure Boot conflicts

CUDA drivers may fail to load with Secure Boot enabled because the kernel module isn't signed:

```bash
# Check if Secure Boot is enabled
mokutil --sb-state

# Either disable Secure Boot in BIOS, or sign the module
# Generate MOK key
openssl req -new -x509 -newkey rsa:2048 -keyout MOK.priv -outform DER -out MOK.der -nodes -days 36500 -subj "/CN=Module Signing/"
sudo mokutil --import MOK.der
# Reboot and enroll the key in the UEFI interface
```

With CUDA and cuDNN properly installed, you have the GPU computing foundation needed for deep learning training, scientific simulation, and any CUDA-accelerated workload on your Ubuntu system.
