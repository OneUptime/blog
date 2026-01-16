# How to Install GPU Drivers (NVIDIA/AMD) on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, GPU, NVIDIA, AMD, Drivers, Tutorial

Description: Complete guide to installing NVIDIA and AMD GPU drivers on Ubuntu for graphics and compute workloads.

---

Graphics Processing Units (GPUs) are essential for modern computing, from gaming and video editing to machine learning and scientific computing. However, getting GPU drivers properly installed on Ubuntu can be challenging. This comprehensive guide walks you through installing both NVIDIA and AMD GPU drivers, covering multiple installation methods and common troubleshooting scenarios.

## Identifying Your GPU

Before installing drivers, you need to identify your GPU hardware. Ubuntu provides several tools for this purpose.

### Using lspci

The most reliable way to identify your GPU is using the `lspci` command:

```bash
# List all PCI devices and filter for VGA/3D controllers
# The -nn flag shows both the text name and numeric IDs
lspci -nn | grep -E "VGA|3D|Display"

# Example output:
# 01:00.0 VGA compatible controller [0300]: NVIDIA Corporation GA104 [GeForce RTX 3070] [10de:2484] (rev a1)
# 00:02.0 VGA compatible controller [0300]: Intel Corporation UHD Graphics 630 [8086:3e92]
```

### Using lshw

For more detailed information about your graphics hardware:

```bash
# Get detailed GPU information (requires sudo for full details)
# The -C display flag limits output to display-related hardware
sudo lshw -C display

# This shows memory, driver in use, capabilities, and more
```

### Using ubuntu-drivers

Ubuntu's built-in driver detection tool can identify your GPU and suggest drivers:

```bash
# List devices that need drivers and show recommended options
# This is the easiest way to see what Ubuntu recommends
ubuntu-drivers devices

# Example output shows device info and recommended driver packages
```

## Nouveau vs Proprietary Drivers

Ubuntu ships with the open-source Nouveau driver for NVIDIA cards by default. Understanding the difference helps you make the right choice.

### Nouveau (Open Source)

```bash
# Check if Nouveau is currently loaded
# If loaded, you'll see "nouveau" in the output
lsmod | grep nouveau

# Nouveau provides basic 2D/3D acceleration but:
# - No CUDA support
# - Limited OpenGL performance
# - No support for newest GPUs
# - Lower power management capabilities
```

### Proprietary NVIDIA Driver Benefits

- Full CUDA and compute support
- Maximum gaming/graphics performance
- Better power management
- Support for all GPU features
- Regular updates for new games

### Comparing Performance

```bash
# Check OpenGL renderer with Nouveau
glxinfo | grep "OpenGL renderer"
# Output with Nouveau: "OpenGL renderer string: NV136"

# After proprietary driver installation:
# Output: "OpenGL renderer string: NVIDIA GeForce RTX 3070/PCIe/SSE2"
```

## NVIDIA Driver Installation Methods

There are three main methods to install NVIDIA drivers on Ubuntu. Each has its advantages.

### Method 1: Ubuntu Drivers (Recommended)

The simplest and safest method uses Ubuntu's built-in driver management:

```bash
# Update package lists to ensure we have latest driver info
sudo apt update

# List all available drivers for your hardware
# Look for "nvidia-driver-XXX" packages
ubuntu-drivers devices

# Automatically install the recommended driver
# This is the safest option for most users
sudo ubuntu-drivers autoinstall

# Alternatively, install a specific driver version
# Use this if you need a particular version for compatibility
sudo apt install nvidia-driver-550

# Reboot to load the new driver
# IMPORTANT: A reboot is required for the driver to take effect
sudo reboot
```

### Method 2: Graphics Drivers PPA

For newer driver versions not yet in Ubuntu's repositories:

```bash
# Add the official graphics-drivers PPA
# This repository contains newer driver versions
sudo add-apt-repository ppa:graphics-drivers/ppa

# Update package lists to include PPA packages
sudo apt update

# List available NVIDIA driver packages from all sources
apt list nvidia-driver-* 2>/dev/null | grep -v "Listing"

# Install your chosen version (example: 555 series)
# Newer versions often include bug fixes and new GPU support
sudo apt install nvidia-driver-555

# Reboot to activate the new driver
sudo reboot
```

### Method 3: NVIDIA .run File (Advanced)

For maximum control or when other methods fail:

```bash
# First, download the driver from NVIDIA's website
# Visit: https://www.nvidia.com/Download/index.aspx
# Select your GPU, OS (Linux 64-bit), and download

# Install required build dependencies
# These are needed to compile the kernel module
sudo apt install build-essential libglvnd-dev pkg-config

# Blacklist Nouveau to prevent conflicts
# Create a configuration file to disable Nouveau
cat << 'EOF' | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
# Disable Nouveau kernel driver
blacklist nouveau
# Prevent Nouveau from loading as a fallback
options nouveau modeset=0
EOF

# Regenerate initramfs with Nouveau disabled
# This ensures Nouveau won't load at boot
sudo update-initramfs -u

# Reboot into text mode (no GUI)
sudo reboot

# After reboot, switch to a text terminal (Ctrl+Alt+F3)
# Stop the display manager to release the GPU
sudo systemctl stop gdm3    # For GNOME
# OR
sudo systemctl stop lightdm # For other DEs

# Make the installer executable and run it
# The installer will guide you through options
chmod +x NVIDIA-Linux-x86_64-555.42.02.run
sudo ./NVIDIA-Linux-x86_64-555.42.02.run

# Follow the prompts:
# - Accept license agreement
# - Install 32-bit compatibility libraries (yes for gaming)
# - Update X configuration (yes)

# Reboot to start the GUI with new driver
sudo reboot
```

## NVIDIA CUDA Toolkit Installation

CUDA enables GPU computing for machine learning, scientific computing, and more.

### Method 1: Ubuntu Repositories

```bash
# Install CUDA toolkit from Ubuntu repos
# This is the simplest method but may not have the latest version
sudo apt install nvidia-cuda-toolkit

# Verify CUDA installation
# This shows the CUDA compiler version
nvcc --version

# Check CUDA compute capability
# Lists all CUDA-capable devices
nvidia-smi --query-gpu=name,compute_cap --format=csv
```

### Method 2: NVIDIA CUDA Repository (Recommended)

For the latest CUDA version with full features:

```bash
# Download and install the CUDA repository keyring
# This adds NVIDIA's official repository to your system
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb

# Update package lists to include CUDA packages
sudo apt update

# Install the complete CUDA toolkit
# This includes compiler, libraries, and tools
sudo apt install cuda-toolkit-12-6

# Install cuDNN for deep learning (optional but recommended for ML)
sudo apt install cudnn

# Set up environment variables
# Add these to your shell configuration file
cat << 'EOF' >> ~/.bashrc
# CUDA environment configuration
export PATH=/usr/local/cuda/bin${PATH:+:${PATH}}
export LD_LIBRARY_PATH=/usr/local/cuda/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}
EOF

# Reload shell configuration
source ~/.bashrc

# Verify the installation with a sample program
# Navigate to CUDA samples and compile a test
cd /usr/local/cuda/samples/1_Utilities/deviceQuery
sudo make
./deviceQuery
# Should show "Result = PASS" if CUDA is working
```

### Verifying CUDA Installation

```bash
# Check CUDA version reported by nvidia-smi
# Note: This shows driver's CUDA capability, not toolkit version
nvidia-smi

# Check installed CUDA toolkit version
nvcc --version

# Test CUDA with Python (if using for ML)
python3 << 'EOF'
import subprocess
result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
print("GPU detected via nvidia-smi:")
print(result.stdout)
EOF

# For PyTorch users - verify CUDA availability
python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

## AMD Driver Installation

AMD provides two main driver options: AMDGPU (open-source) and AMDGPU-PRO (proprietary additions).

### AMDGPU (Open Source - Built into Kernel)

Modern AMD GPUs work out of the box with the kernel's AMDGPU driver:

```bash
# Check if AMDGPU is loaded
# Modern AMD GPUs (GCN 1.2+, RDNA) use this automatically
lsmod | grep amdgpu

# View AMD GPU information
# This shows the GPU model and driver details
sudo lshw -C display | grep -A 12 "AMD"

# Install Vulkan support for gaming and applications
# Mesa provides the open-source Vulkan implementation
sudo apt install mesa-vulkan-drivers vulkan-tools

# Verify Vulkan is working
vulkaninfo --summary

# Install OpenCL for compute workloads (optional)
# ROCm OpenCL provides GPU compute on AMD hardware
sudo apt install rocm-opencl-runtime
```

### AMDGPU-PRO (Proprietary)

For specific professional applications or maximum OpenGL performance:

```bash
# Download the driver package from AMD's website
# Visit: https://www.amd.com/en/support
# Select your GPU and download the Ubuntu driver

# Extract the downloaded archive
tar -xvf amdgpu-pro-23.40-*.tar.xz
cd amdgpu-pro-23.40-*

# Run the installer with desired components
# --opencl=rocr installs ROCm-based OpenCL
# --vulkan=pro installs proprietary Vulkan
sudo ./amdgpu-install --usecase=graphics --vulkan=pro --opencl=rocr

# For workstation use (CAD, professional graphics):
sudo ./amdgpu-install --usecase=workstation

# Reboot to apply changes
sudo reboot

# Verify installation
vulkaninfo | grep "GPU id"
clinfo | head -20
```

### ROCm Installation (AMD Compute Platform)

ROCm enables GPU computing similar to CUDA:

```bash
# Add the ROCm repository
# This provides AMD's compute platform packages
wget https://repo.radeon.com/rocm/rocm.gpg.key -O - | \
    gpg --dearmor | sudo tee /etc/apt/keyrings/rocm.gpg > /dev/null

# Add repository to sources list
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/rocm.gpg] https://repo.radeon.com/rocm/apt/6.0 jammy main" | \
    sudo tee /etc/apt/sources.list.d/rocm.list

# Set repository priority to prefer ROCm packages
echo -e 'Package: *\nPin: release o=repo.radeon.com\nPin-Priority: 600' | \
    sudo tee /etc/apt/preferences.d/rocm-pin-600

# Update and install ROCm
sudo apt update
sudo apt install rocm-hip-sdk

# Add user to required groups for GPU access
# render and video groups allow non-root GPU access
sudo usermod -aG render,video $USER

# Log out and back in, then verify
rocminfo
# Should list your AMD GPU with details

# Test with rocm-smi
rocm-smi
# Shows GPU status similar to nvidia-smi
```

## Secure Boot Considerations

Secure Boot can prevent unsigned kernel modules (including GPU drivers) from loading.

### Checking Secure Boot Status

```bash
# Check if Secure Boot is enabled
# Returns "SecureBoot enabled" or "SecureBoot disabled"
mokutil --sb-state

# List enrolled Machine Owner Keys (MOKs)
# These are keys trusted for signing kernel modules
mokutil --list-enrolled
```

### Option 1: Sign the Driver Module (Recommended)

```bash
# Generate a signing key pair for kernel modules
# This key will be used to sign the NVIDIA module
sudo mkdir -p /var/lib/shim-signed/mok
cd /var/lib/shim-signed/mok

# Create the key pair with a 10-year validity
sudo openssl req -new -x509 -newkey rsa:2048 \
    -keyout MOK.priv -outform DER -out MOK.der \
    -nodes -days 36500 -subj "/CN=My Module Signing Key/"

# Enroll the public key in MOK database
# You'll set a password to use during the next boot
sudo mokutil --import MOK.der

# Reboot - you'll see the MOK enrollment screen
# Select "Enroll MOK" and enter your password
sudo reboot

# After enrollment, sign the NVIDIA module
# Find the module location first
modinfo -n nvidia
# Usually: /lib/modules/$(uname -r)/updates/dkms/nvidia.ko

# Sign the module with your key
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file \
    sha256 /var/lib/shim-signed/mok/MOK.priv \
    /var/lib/shim-signed/mok/MOK.der \
    /lib/modules/$(uname -r)/updates/dkms/nvidia.ko

# Verify the signature
modinfo nvidia | grep signer
```

### Option 2: Using DKMS Auto-Signing

Ubuntu's nvidia-driver packages can use DKMS to auto-sign:

```bash
# Install the driver - Ubuntu will prompt for MOK setup
sudo apt install nvidia-driver-550

# During installation, you'll be asked to set a password
# On next reboot, enroll the key in MOK management

# The driver will auto-sign on kernel updates via DKMS
# Verify signing worked
modinfo nvidia | grep "signer:"
```

### Option 3: Disable Secure Boot (Not Recommended)

```bash
# If signing fails, you can disable Secure Boot
# This is done in BIOS/UEFI settings, not Linux
# Press Del/F2/F12 during boot to enter BIOS

# To verify it's disabled:
mokutil --sb-state
# Should show: SecureBoot disabled
```

## Multiple GPU Configurations

Systems with multiple GPUs require special configuration.

### Identifying Multiple GPUs

```bash
# List all GPUs in the system
# Each will have a separate bus ID (e.g., 01:00.0, 02:00.0)
lspci | grep -E "VGA|3D"

# Get detailed info for each GPU
nvidia-smi -L
# Lists: GPU 0: NVIDIA GeForce RTX 3070 (UUID: GPU-xxx...)
#        GPU 1: NVIDIA GeForce RTX 3060 (UUID: GPU-yyy...)

# Check which GPU is rendering the display
# The asterisk (*) indicates the active display GPU
xrandr --listproviders
```

### Configuring for Compute (Headless GPUs)

```bash
# For ML/compute workloads, you may want GPUs not used for display
# Set compute mode to restrict GPU to compute only
sudo nvidia-smi -i 1 -c EXCLUSIVE_PROCESS
# GPU 1 is now dedicated to compute workloads

# Set persistence mode for faster job startup
# Keeps driver loaded even when no apps are using the GPU
sudo nvidia-smi -pm 1

# Create systemd service for persistence mode at boot
cat << 'EOF' | sudo tee /etc/systemd/system/nvidia-persistence.service
[Unit]
Description=NVIDIA Persistence Daemon
Wants=syslog.target

[Service]
Type=forking
ExecStart=/usr/bin/nvidia-persistenced --verbose
ExecStopPost=/bin/rm -rf /var/run/nvidia-persistenced
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable nvidia-persistence
sudo systemctl start nvidia-persistence
```

### X.org Configuration for Multiple GPUs

```bash
# Create X.org configuration for multi-GPU setup
cat << 'EOF' | sudo tee /etc/X11/xorg.conf.d/10-nvidia.conf
# Multi-GPU X.org configuration

# Define GPU devices by their PCI bus IDs
Section "Device"
    Identifier     "GPU0"
    Driver         "nvidia"
    BusID          "PCI:1:0:0"  # Primary display GPU
    Option         "Coolbits" "28"  # Enable overclocking
EndSection

Section "Device"
    Identifier     "GPU1"
    Driver         "nvidia"
    BusID          "PCI:2:0:0"  # Secondary/compute GPU
EndSection

# Screen configuration for primary GPU
Section "Screen"
    Identifier     "Screen0"
    Device         "GPU0"
    DefaultDepth    24
EndSection
EOF

# Apply changes by restarting X
sudo systemctl restart gdm3
```

### CUDA Multi-GPU Selection

```bash
# In your applications, select specific GPUs
# Using CUDA_VISIBLE_DEVICES environment variable

# Use only GPU 0
CUDA_VISIBLE_DEVICES=0 python train.py

# Use GPUs 0 and 2 (skipping GPU 1)
CUDA_VISIBLE_DEVICES=0,2 python train.py

# Disable all GPUs (CPU only)
CUDA_VISIBLE_DEVICES="" python train.py

# In Python code, you can also select devices:
python3 << 'EOF'
import os
# Set before importing ML libraries
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
# Now only GPU 0 is visible to this process
EOF
```

## GPU Monitoring Tools

Monitoring GPU usage is essential for performance tuning and troubleshooting.

### nvidia-smi (NVIDIA System Management Interface)

```bash
# Basic GPU status - shows utilization, memory, temperature
nvidia-smi

# Continuous monitoring with 1-second refresh
# Press Ctrl+C to exit
nvidia-smi -l 1

# Detailed query with specific metrics
nvidia-smi --query-gpu=timestamp,name,pci.bus_id,driver_version,temperature.gpu,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,power.draw --format=csv -l 1

# Monitor specific GPU (useful for multi-GPU systems)
nvidia-smi -i 0 -l 1

# Show running processes using GPU
nvidia-smi pmon -s um -d 1

# One-liner for clean monitoring output
watch -n 1 nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used --format=csv

# Export to file for later analysis
nvidia-smi --query-gpu=timestamp,temperature.gpu,utilization.gpu,memory.used --format=csv -l 5 > gpu_log.csv &
```

### rocm-smi (AMD ROCm System Management Interface)

```bash
# Basic AMD GPU status
rocm-smi

# Show all available information
rocm-smi -a

# Monitor temperature and power
rocm-smi --showtemp --showpower

# Continuous monitoring
watch -n 1 rocm-smi

# Show memory usage
rocm-smi --showmeminfo vram

# Monitor GPU utilization
rocm-smi --showuse

# Set power profile for performance
rocm-smi --setperflevel high

# Fan control (if supported)
rocm-smi --setfan 80  # Set to 80%
rocm-smi --resetfans  # Return to automatic
```

### nvtop (Interactive GPU Monitor)

```bash
# Install nvtop - works with NVIDIA and AMD GPUs
sudo apt install nvtop

# Run nvtop for interactive monitoring
# Shows processes, utilization, memory, temperature
nvtop

# nvtop keybindings:
# F2 - Setup/configuration
# F9 - Kill process
# F10 - Quit
# Arrow keys - Navigate
# Enter - Select process for details
```

### Additional Monitoring Tools

```bash
# Install intel-gpu-tools for Intel GPU monitoring
sudo apt install intel-gpu-tools
intel_gpu_top  # Interactive Intel GPU monitor

# Install radeontop for AMD monitoring (older/alternative)
sudo apt install radeontop
radeontop

# GreenWithEnvy - GUI for NVIDIA GPU management
flatpak install flathub com.leinardi.gwe
flatpak run com.leinardi.gwe

# For scripting and automation - Python GPU monitoring
pip install gpustat
gpustat -cp  # Colored output with process info
```

## Troubleshooting Display Issues

### Black Screen After Driver Installation

```bash
# Boot into recovery mode or use Ctrl+Alt+F3 for TTY

# Check if NVIDIA driver is loaded
lsmod | grep nvidia

# Check for errors in kernel log
dmesg | grep -i nvidia
journalctl -b | grep -i nvidia

# Common fix: Reinstall driver
sudo apt purge nvidia-*
sudo apt autoremove
sudo apt install nvidia-driver-550

# If that fails, try nomodeset boot parameter
# Edit GRUB at boot: press 'e', add 'nomodeset' to linux line
# This disables kernel mode setting temporarily

# For persistent nomodeset (temporary troubleshooting only)
sudo sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"/GRUB_CMDLINE_LINUX_DEFAULT="quiet splash nomodeset"/' /etc/default/grub
sudo update-grub
```

### Resolution and Display Problems

```bash
# List available display outputs and modes
xrandr

# Force a specific resolution
xrandr --output DP-0 --mode 1920x1080 --rate 60

# Generate and use custom modeline for unsupported resolution
# First, generate the modeline
cvt 2560 1440 144
# Copy the "Modeline" output

# Add the new mode
xrandr --newmode "2560x1440_144" 808.75 2560 2792 3072 3584 1440 1443 1448 1568 -hsync +vsync
xrandr --addmode DP-0 "2560x1440_144"
xrandr --output DP-0 --mode "2560x1440_144"

# Make resolution changes persistent in X.org
cat << 'EOF' | sudo tee /etc/X11/xorg.conf.d/10-monitor.conf
Section "Monitor"
    Identifier "DP-0"
    Modeline "2560x1440_144" 808.75 2560 2792 3072 3584 1440 1443 1448 1568 -hsync +vsync
    Option "PreferredMode" "2560x1440_144"
EndSection
EOF
```

### Driver Version Conflicts

```bash
# Check for mixed driver installations
dpkg -l | grep nvidia

# Complete driver removal and clean install
sudo apt purge nvidia-* libnvidia-*
sudo apt purge cuda-* libcuda*
sudo apt autoremove
sudo apt autoclean

# Remove any leftover configuration
sudo rm -rf /etc/X11/xorg.conf.d/*nvidia*
sudo rm -rf /usr/share/X11/xorg.conf.d/*nvidia*

# Reinstall from clean state
sudo apt update
sudo ubuntu-drivers autoinstall
sudo reboot
```

### Wayland vs X11 Issues

```bash
# Check if using Wayland or X11
echo $XDG_SESSION_TYPE

# NVIDIA + Wayland requires driver 470+ and specific configuration
# Enable Wayland for GDM with NVIDIA
sudo sed -i 's/#WaylandEnable=false/WaylandEnable=true/' /etc/gdm3/custom.conf

# Add required kernel parameters for NVIDIA Wayland
cat << 'EOF' | sudo tee /etc/modprobe.d/nvidia-wayland.conf
# Enable kernel mode setting for Wayland support
options nvidia-drm modeset=1
options nvidia-drm fbdev=1
EOF

sudo update-initramfs -u
sudo reboot

# If Wayland causes issues, force X11
# Edit /etc/gdm3/custom.conf and set:
# WaylandEnable=false
```

## Prime and GPU Switching (Laptops)

Laptops with hybrid graphics (Intel/AMD + NVIDIA) need special handling.

### Understanding PRIME

```bash
# Check current graphics mode
prime-select query

# List available modes
# - nvidia: Use NVIDIA GPU for everything (more power)
# - intel: Use Intel GPU only (battery saving)
# - on-demand: Use Intel by default, NVIDIA when requested
prime-select --help
```

### Configuring PRIME Profiles

```bash
# Switch to NVIDIA GPU (requires logout/login)
sudo prime-select nvidia

# Switch to Intel GPU for battery life
sudo prime-select intel

# Enable on-demand mode (PRIME render offload)
sudo prime-select on-demand

# Verify the change
prime-select query
glxinfo | grep "OpenGL renderer"
```

### PRIME Render Offload (On-Demand Mode)

```bash
# In on-demand mode, apps use Intel by default
# To run an app on NVIDIA GPU, use special environment variables

# Run application on NVIDIA GPU
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia glxgears

# Create a convenient wrapper script
cat << 'EOF' | sudo tee /usr/local/bin/prime-run
#!/bin/bash
# Run application on NVIDIA GPU via PRIME render offload
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia "$@"
EOF
sudo chmod +x /usr/local/bin/prime-run

# Now you can easily run apps on NVIDIA
prime-run glxinfo | grep "OpenGL renderer"
prime-run steam
prime-run /path/to/game
```

### EnvyControl (Alternative GPU Switching)

```bash
# Install envycontrol for easier switching
pip install envycontrol

# Switch modes
sudo envycontrol -s nvidia    # NVIDIA only
sudo envycontrol -s integrated # Intel only
sudo envycontrol -s hybrid    # On-demand mode

# Query current mode
envycontrol --query

# With RTD3 power management (for newer laptops)
sudo envycontrol -s hybrid --rtd3
```

### Power Management for Hybrid Graphics

```bash
# Check if NVIDIA GPU is powered on
cat /sys/bus/pci/devices/0000:01:00.0/power/runtime_status

# Enable runtime power management
cat << 'EOF' | sudo tee /etc/udev/rules.d/80-nvidia-pm.rules
# Enable runtime PM for NVIDIA VGA/3D controller
ACTION=="bind", SUBSYSTEM=="pci", ATTR{vendor}=="0x10de", ATTR{class}=="0x030000", TEST=="power/control", ATTR{power/control}="auto"
ACTION=="bind", SUBSYSTEM=="pci", ATTR{vendor}=="0x10de", ATTR{class}=="0x030200", TEST=="power/control", ATTR{power/control}="auto"

# Enable runtime PM for NVIDIA Audio device
ACTION=="bind", SUBSYSTEM=="pci", ATTR{vendor}=="0x10de", ATTR{class}=="0x040300", TEST=="power/control", ATTR{power/control}="auto"
EOF

sudo udevadm control --reload
sudo udevadm trigger

# Enable dynamic power management in NVIDIA driver
cat << 'EOF' | sudo tee /etc/modprobe.d/nvidia-power.conf
options nvidia NVreg_DynamicPowerManagement=0x02
EOF

sudo update-initramfs -u
sudo reboot

# Verify GPU powers down when idle
cat /sys/bus/pci/devices/0000:01:00.0/power/runtime_status
# Should show "suspended" when not in use
```

### Battery Optimization Tips

```bash
# Install TLP for advanced power management
sudo apt install tlp tlp-rdw

# Configure TLP for hybrid graphics
sudo nano /etc/tlp.conf
# Add or modify:
# RUNTIME_PM_ON_BAT=auto
# RUNTIME_PM_DRIVER_DENYLIST="nvidia"  # Remove nvidia from denylist

# Start TLP
sudo tlp start

# Monitor power consumption
sudo tlp-stat -b  # Battery info
sudo tlp-stat -g  # Graphics info
```

## Complete Installation Example

Here's a complete example for setting up an NVIDIA GPU on a fresh Ubuntu installation:

```bash
#!/bin/bash
# Complete NVIDIA GPU setup script for Ubuntu
# Run with: sudo bash nvidia-setup.sh

set -e  # Exit on error

echo "=== NVIDIA GPU Setup Script ==="

# Step 1: Update system
echo "[1/7] Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install prerequisites
echo "[2/7] Installing prerequisites..."
apt install -y build-essential dkms linux-headers-$(uname -r)

# Step 3: Detect GPU and install recommended driver
echo "[3/7] Detecting GPU and installing driver..."
ubuntu-drivers devices
ubuntu-drivers autoinstall

# Step 4: Install CUDA toolkit
echo "[4/7] Installing CUDA toolkit..."
apt install -y nvidia-cuda-toolkit

# Step 5: Configure persistence mode
echo "[5/7] Configuring persistence mode..."
nvidia-persistenced --user nvidia-persistenced --persistence-mode

# Step 6: Verify installation
echo "[6/7] Verifying installation..."
nvidia-smi

# Step 7: Create verification script
echo "[7/7] Creating verification tools..."
cat << 'VERIFY' > /usr/local/bin/gpu-verify
#!/bin/bash
echo "=== GPU Verification ==="
echo ""
echo "Driver version:"
nvidia-smi --query-gpu=driver_version --format=csv,noheader
echo ""
echo "CUDA version:"
nvcc --version | grep "release"
echo ""
echo "GPU Status:"
nvidia-smi --query-gpu=name,temperature.gpu,memory.used,memory.total,utilization.gpu --format=csv
echo ""
echo "OpenGL renderer:"
glxinfo | grep "OpenGL renderer"
VERIFY
chmod +x /usr/local/bin/gpu-verify

echo ""
echo "=== Installation Complete ==="
echo "Please reboot your system: sudo reboot"
echo "After reboot, run 'gpu-verify' to check installation"
```

## Quick Reference Commands

```bash
# === GPU Information ===
lspci | grep -E "VGA|3D"         # List GPU hardware
nvidia-smi -L                     # List NVIDIA GPUs
rocminfo                          # List AMD GPUs

# === Driver Status ===
nvidia-smi                        # NVIDIA status
rocm-smi                          # AMD ROCm status
cat /proc/driver/nvidia/version  # NVIDIA driver version
modinfo nvidia | grep ^version   # Module version

# === Installation ===
sudo ubuntu-drivers autoinstall  # Auto-install best driver
sudo apt install nvidia-driver-550  # Install specific version
sudo apt install rocm-hip-sdk    # Install AMD ROCm

# === Troubleshooting ===
dmesg | grep -i nvidia           # Kernel messages
journalctl -b | grep -i gpu      # System logs
sudo apt purge nvidia-*          # Remove NVIDIA drivers
sudo apt purge amdgpu-*          # Remove AMD drivers

# === Hybrid Graphics (Laptops) ===
prime-select query               # Check current mode
sudo prime-select nvidia         # Use NVIDIA
sudo prime-select on-demand      # Use on-demand mode
prime-run <application>          # Run app on NVIDIA

# === Monitoring ===
nvidia-smi -l 1                  # Continuous NVIDIA monitoring
rocm-smi -a                      # Full AMD GPU info
nvtop                            # Interactive GPU monitor
watch -n 1 nvidia-smi            # Watch GPU status
```

## Monitor Your GPU Infrastructure with OneUptime

Once your GPU drivers are properly configured, monitoring becomes essential for maintaining system reliability. OneUptime provides comprehensive infrastructure monitoring that can help you track GPU-equipped systems and services.

With OneUptime, you can:

- **Monitor GPU Server Uptime**: Track the availability of your GPU compute servers and receive instant alerts when systems go down
- **Set Up Custom Health Checks**: Create custom monitoring endpoints that verify GPU driver status and CUDA availability
- **Track Performance Metrics**: Monitor system metrics on GPU servers including load, memory, and temperature indicators
- **Receive Multi-Channel Alerts**: Get notified via email, SMS, Slack, or webhooks when GPU servers experience issues
- **Create Status Pages**: Keep your team informed about GPU cluster status with public or private status pages
- **Incident Management**: Track and manage GPU-related incidents with built-in incident management workflows
- **On-Call Scheduling**: Ensure the right team members are notified when GPU infrastructure needs attention

Whether you're running machine learning workloads, rendering farms, or GPU-accelerated applications, OneUptime helps ensure your infrastructure stays operational. Start monitoring your GPU servers today at [https://oneuptime.com](https://oneuptime.com).
