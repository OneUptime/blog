# How to Install NVIDIA CUDA Toolkit on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NVIDIA, CUDA, GPU, Machine Learning

Description: Step-by-step guide to installing the NVIDIA CUDA Toolkit on Ubuntu, including driver setup, toolkit installation, and verifying your environment works correctly.

---

The NVIDIA CUDA Toolkit is what bridges your GPU hardware to code that can run parallel computations on it. Whether you're training neural networks, running scientific simulations, or doing GPU-accelerated data processing, CUDA is the foundation everything else sits on. This guide walks through a clean installation on Ubuntu, covering both the drivers and the toolkit itself.

## Prerequisites

Before starting, confirm you have:

- An NVIDIA GPU (check with `lspci | grep -i nvidia`)
- Ubuntu 20.04, 22.04, or 24.04 (64-bit)
- At least 4GB of disk space for the toolkit
- Root or sudo access

Also verify Secure Boot status. If Secure Boot is enabled, you'll need to sign the NVIDIA kernel module or disable Secure Boot in your UEFI settings. Most workstations used for ML/GPU work have Secure Boot disabled.

```bash
# Check if Secure Boot is enabled
mokutil --sb-state

# Check current GPU
lspci | grep -i nvidia
```

## Removing Old NVIDIA Drivers

If you have any existing NVIDIA packages installed, clean them out first to avoid conflicts.

```bash
# Remove all NVIDIA packages
sudo apt-get remove --purge '^nvidia-.*' -y
sudo apt-get remove --purge '^libnvidia-.*' -y
sudo apt-get autoremove -y

# Remove the old CUDA installations if present
sudo apt-get remove --purge '^cuda.*' -y
sudo apt-get remove --purge '^libcuda.*' -y

# Clean up any leftover config files
sudo rm -f /etc/modprobe.d/nvidia-installer-disable-nouveau.conf
sudo rm -f /etc/modprobe.d/blacklist-nvidia-nouveau.conf
```

Reboot after cleaning up old drivers before proceeding.

## Method 1: Installing via NVIDIA's .deb Repository (Recommended)

This method keeps CUDA updates integrated with your package manager, which is the cleanest long-term approach.

### Step 1: Install Required Dependencies

```bash
sudo apt-get update
sudo apt-get install -y build-essential dkms linux-headers-$(uname -r)
```

### Step 2: Add the NVIDIA CUDA Repository

Visit https://developer.nvidia.com/cuda-downloads to get the exact repository URL for your Ubuntu version and architecture. For Ubuntu 22.04 x86_64:

```bash
# Download and install the CUDA keyring package
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb

# Update package lists
sudo apt-get update
```

### Step 3: Install CUDA Toolkit

```bash
# Install the full CUDA toolkit (includes drivers)
sudo apt-get install -y cuda

# Or install a specific version, e.g., CUDA 12.3
sudo apt-get install -y cuda-12-3
```

The package includes the CUDA compiler (nvcc), runtime libraries, and sample code.

### Step 4: Configure Environment Variables

Add CUDA to your PATH and library path. Edit your shell profile:

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc

# Apply changes
source ~/.bashrc
```

## Method 2: Using the runfile Installer

The runfile gives you more control but is more involved. Use this when the .deb method causes issues or you need a specific older CUDA version.

```bash
# Download the runfile from NVIDIA's website (example for CUDA 12.3)
wget https://developer.download.nvidia.com/compute/cuda/12.3.0/local_installers/cuda_12.3.0_545.23.06_linux.run

# Make it executable
chmod +x cuda_12.3.0_545.23.06_linux.run

# Stop the display manager first (if on a desktop system)
sudo systemctl stop gdm3   # or lightdm, sddm depending on your DE

# Run the installer
sudo ./cuda_12.3.0_545.23.06_linux.run
```

During the installer prompts, you can choose to install just the toolkit without the bundled driver if you've already installed a newer driver separately.

## Verifying the Installation

After rebooting, verify everything is working:

```bash
# Check the driver loaded correctly
nvidia-smi

# Check nvcc (CUDA compiler)
nvcc --version

# Verify CUDA path
which nvcc
```

The `nvidia-smi` output should show your GPU model, driver version, and CUDA version. If `nvidia-smi` works but `nvcc` is not found, your PATH is not configured correctly.

## Compiling and Running a CUDA Sample

Test the installation by compiling a sample program:

```bash
# Copy the samples to your home directory
cuda-install-samples-12.3.sh ~/cuda-samples

# Navigate to a simple sample
cd ~/cuda-samples/Samples/1_Utilities/deviceQuery

# Compile and run
make
./deviceQuery
```

A successful run shows detailed information about your GPU: compute capability, memory bandwidth, core counts, and more. If it exits with "Result = PASS", CUDA is working correctly.

## Troubleshooting Common Issues

### nvidia-smi shows "No devices found"

The driver may not have loaded. Check:

```bash
# Look for NVIDIA modules
lsmod | grep nvidia

# Check dmesg for errors
dmesg | grep -i nvidia

# If using DKMS, rebuild the module
sudo dkms autoinstall
```

### nvcc not found after installation

```bash
# Locate the nvcc binary
find /usr/local -name nvcc 2>/dev/null

# Update your PATH to match the actual path found
export PATH=/usr/local/cuda-12.3/bin:$PATH
```

### Nouveau driver conflict

The open-source Nouveau driver conflicts with the NVIDIA proprietary driver. NVIDIA's installer should blacklist it automatically, but if not:

```bash
# Create a blacklist file
sudo bash -c 'echo "blacklist nouveau" >> /etc/modprobe.d/blacklist-nouveau.conf'
sudo bash -c 'echo "options nouveau modeset=0" >> /etc/modprobe.d/blacklist-nouveau.conf'

# Regenerate initramfs
sudo update-initramfs -u

sudo reboot
```

## Multiple CUDA Versions

When working with frameworks that require specific CUDA versions, you can install multiple versions side by side:

```bash
# Install CUDA 11.8 alongside CUDA 12.3
sudo apt-get install -y cuda-11-8

# Switch between versions by updating symlink
sudo rm /usr/local/cuda
sudo ln -s /usr/local/cuda-11.8 /usr/local/cuda

# Or manage via update-alternatives
sudo update-alternatives --install /usr/local/cuda cuda /usr/local/cuda-11.8 118
sudo update-alternatives --install /usr/local/cuda cuda /usr/local/cuda-12.3 123
sudo update-alternatives --config cuda
```

## Installing cuDNN

Most ML frameworks also require cuDNN. Install it after CUDA:

```bash
# Install cuDNN via the NVIDIA repository (already configured above)
sudo apt-get install -y libcudnn8 libcudnn8-dev libcudnn8-samples
```

With the CUDA Toolkit installed and verified, you're ready to install ML frameworks like PyTorch or TensorFlow, or build your own CUDA applications directly.
