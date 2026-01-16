# How to Compile a Custom Linux Kernel on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Compilation, Linux, Performance, Tutorial

Description: Complete guide to downloading, configuring, and compiling a custom Linux kernel on Ubuntu.

---

Compiling a custom Linux kernel is one of the most rewarding experiences for Linux enthusiasts and system administrators. While Ubuntu's default kernel works well for most users, there are compelling reasons to build your own. This comprehensive guide walks you through the entire process, from downloading the source code to booting into your custom kernel.

## Why Compile a Custom Kernel?

Before diving into the technical details, let's understand why you might want to compile a custom kernel:

### Performance Optimization

The default Ubuntu kernel is compiled to support a wide range of hardware configurations. By building a custom kernel, you can:

- Remove support for hardware you don't have, reducing kernel size
- Enable specific optimizations for your CPU architecture
- Tune scheduler settings for your workload (desktop, server, real-time)
- Optimize memory management for your specific use case

### Hardware Support

Sometimes you need kernel features that aren't available in your current kernel:

- Enable drivers for newer hardware not yet in Ubuntu's kernel
- Add support for experimental filesystems
- Enable hardware-specific features (specific CPU instructions, GPU features)
- Support for custom or specialized hardware

### Security Hardening

Custom kernels allow you to:

- Enable additional security modules (AppArmor, SELinux, TOMOYO)
- Remove unnecessary attack surfaces by disabling unused features
- Apply custom security patches
- Enable kernel hardening options

### Learning and Development

Building your own kernel helps you:

- Understand how Linux works at a deeper level
- Test kernel patches before upstream inclusion
- Develop and debug kernel modules
- Contribute to kernel development

## Prerequisites and Dependencies

Before you begin, ensure your system meets the requirements and has the necessary tools installed.

### System Requirements

- **Disk Space**: At least 30GB free (kernel source is ~1GB, build can use 20GB+)
- **RAM**: Minimum 4GB, recommended 8GB+ for faster compilation
- **Time**: Compilation can take 30 minutes to several hours depending on hardware
- **Ubuntu Version**: This guide is tested on Ubuntu 22.04 LTS and newer

### Installing Build Dependencies

Open a terminal and install the required packages:

```bash
# Update package lists to ensure we get the latest versions
sudo apt update

# Install essential build tools
# build-essential: GCC compiler, make, and other build tools
# libncurses-dev: Required for menuconfig interface
# bison, flex: Parser generators needed for kernel build
# libssl-dev: SSL libraries for module signing
# libelf-dev: ELF library for kernel binary handling
sudo apt install -y build-essential libncurses-dev bison flex libssl-dev libelf-dev

# Install additional helpful tools
# bc: Calculator used in kernel build scripts
# dwarves: DWARF utilities for BTF (BPF Type Format) support
# zstd: Compression tool for kernel compression
# git: Version control (useful for getting kernel source)
sudo apt install -y bc dwarves zstd git

# Install tools for creating Debian packages (recommended method)
# fakeroot: Simulates root privileges for package building
# dpkg-dev: Debian package development tools
sudo apt install -y fakeroot dpkg-dev

# Optional: Install ccache to speed up recompilation
# ccache caches compilation results for faster rebuilds
sudo apt install -y ccache
```

### Verifying Installation

Verify that all required tools are installed:

```bash
# Check GCC version (should be 9.0 or newer for modern kernels)
gcc --version

# Check make version
make --version

# Check that ncurses is available for menuconfig
dpkg -l | grep libncurses

# Verify OpenSSL development libraries
dpkg -l | grep libssl-dev
```

## Downloading the Kernel Source

There are several ways to obtain the Linux kernel source code.

### Method 1: From kernel.org (Recommended)

The official source for Linux kernel releases:

```bash
# Create a directory for kernel work
mkdir -p ~/kernel-build
cd ~/kernel-build

# Download the latest stable kernel (check kernel.org for current version)
# Replace 6.8.1 with the version you want
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.8.1.tar.xz

# Verify the download with GPG signature (optional but recommended)
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.8.1.tar.sign

# Decompress the xz archive first (needed for signature verification)
unxz linux-6.8.1.tar.xz

# Import kernel developer keys and verify
# Note: You may need to import the signing key first
gpg --verify linux-6.8.1.tar.sign linux-6.8.1.tar

# Extract the tarball
tar -xf linux-6.8.1.tar

# Enter the kernel source directory
cd linux-6.8.1
```

### Method 2: Using Git (For Development)

Clone the kernel repository for the latest development code:

```bash
# Clone Linus Torvalds' mainline repository
# Warning: This downloads the entire kernel history (~4GB)
git clone https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git
cd linux

# Or clone a specific stable branch (smaller download)
git clone --depth 1 --branch v6.8 https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git
cd linux

# Check out a specific version tag
git checkout v6.8.1
```

### Method 3: Ubuntu Kernel Source

Get Ubuntu's patched kernel source:

```bash
# Install Ubuntu kernel source package
sudo apt install linux-source

# The source is installed to /usr/src
cd /usr/src

# Extract Ubuntu's kernel source
tar -xf linux-source-*.tar.bz2
cd linux-source-*
```

## Kernel Configuration Methods

The kernel configuration determines which features, drivers, and options are compiled into your kernel. There are several methods to configure the kernel.

### Starting with Your Current Configuration

The safest approach is to start with your working kernel's configuration:

```bash
# Copy your current kernel's configuration as a starting point
# This ensures all your current hardware will be supported
cp /boot/config-$(uname -r) .config

# Update the configuration for the new kernel version
# This handles new options introduced in the new kernel
make olddefconfig
```

### Method 1: menuconfig (Recommended for Beginners)

The most user-friendly configuration interface:

```bash
# Launch the ncurses-based configuration menu
make menuconfig
```

Navigation in menuconfig:
- **Arrow keys**: Navigate through options
- **Enter**: Enter a submenu or toggle option
- **Y**: Build feature into kernel (built-in)
- **M**: Build feature as loadable module
- **N**: Don't build feature
- **?**: Show help for current option
- **/** (slash): Search for options
- **Esc Esc**: Go back/exit

### Method 2: nconfig (Modern Alternative)

A newer ncurses-based interface with better navigation:

```bash
# Launch nconfig (requires libncurses-dev)
make nconfig
```

Features:
- Better search functionality
- Function key shortcuts (F1-F9)
- More intuitive navigation

### Method 3: xconfig (Graphical Interface)

Qt-based graphical configuration tool:

```bash
# Install Qt dependencies first
sudo apt install qtbase5-dev

# Launch the graphical configurator
make xconfig
```

### Method 4: oldconfig (For Updates)

Interactive method for handling new options:

```bash
# Interactively configure only new options
# Prompts for each new option not in your .config
make oldconfig

# Non-interactive version using defaults for new options
make olddefconfig
```

### Method 5: localmodconfig (Minimal Configuration)

Create a minimal configuration based on currently loaded modules:

```bash
# First, load all modules you might need
# Use your hardware normally to ensure modules are loaded

# Generate config based on loaded modules
# This creates a much smaller, faster-building kernel
make localmodconfig
```

### Method 6: defconfig and tinyconfig

Predefined configurations:

```bash
# Default configuration for your architecture
make defconfig

# Minimal configuration (useful for embedded systems)
make tinyconfig
```

## Important Configuration Options

Here are key configuration options to consider when building your custom kernel.

### Processor and Architecture

Navigate to: **Processor type and features**

```
# Set your processor family for optimized code generation
Processor family: Select your CPU (Generic x86-64, Intel Core, AMD)

# Enable for CPUs with more than 64 logical processors
CONFIG_MAXSMP: Maximum number of CPUs

# Preemption model affects responsiveness
Preemption Model:
  - No Forced Preemption: Best for servers
  - Voluntary Preemption: Balance of throughput and latency
  - Preemptible Kernel: Best for desktops (responsive)
  - Full Real-Time: For real-time applications
```

### General Setup

Navigate to: **General setup**

```
# Kernel compression format (affects boot time and size)
Kernel compression mode:
  - GZIP: Compatible, moderate compression
  - LZ4: Fast decompression, good for boot speed
  - ZSTD: Best compression ratio, modern systems

# Local version string (identifies your custom kernel)
Local version: -custom

# Automatic process group scheduling (improves desktop responsiveness)
CONFIG_SCHED_AUTOGROUP=y

# Control groups (required for Docker, systemd)
CONFIG_CGROUPS=y
CONFIG_CGROUP_SCHED=y
CONFIG_CGROUP_PIDS=y
CONFIG_CGROUP_CPUACCT=y
CONFIG_MEMCG=y
```

### Kernel Features

Navigate to: **Kernel Features** or **Processor type and features**

```
# NUMA support for multi-socket systems
CONFIG_NUMA=y

# Transparent Huge Pages (can improve performance)
CONFIG_TRANSPARENT_HUGEPAGE=y

# Timer frequency (affects responsiveness vs efficiency)
Timer frequency:
  - 100 HZ: Best for servers
  - 250 HZ: Balanced
  - 300 HZ: Good for multimedia
  - 1000 HZ: Best responsiveness

# Tickless operation (power saving)
CONFIG_NO_HZ_FULL=y
```

### File Systems

Navigate to: **File systems**

```
# Enable file systems you use (built-in or module)
CONFIG_EXT4_FS=y        # ext4 (most common for Ubuntu)
CONFIG_BTRFS_FS=m       # Btrfs
CONFIG_XFS_FS=m         # XFS
CONFIG_F2FS_FS=m        # F2FS (for SSDs)
CONFIG_NTFS3_FS=m       # NTFS (Paragon driver)
CONFIG_EXFAT_FS=m       # exFAT (for USB drives)
CONFIG_FUSE_FS=m        # FUSE (userspace filesystems)

# Virtual filesystems
CONFIG_OVERLAY_FS=m     # OverlayFS (required for Docker)
CONFIG_SQUASHFS=m       # SquashFS (for snap packages)
```

### Networking

Navigate to: **Networking support**

```
# Core networking
CONFIG_NET=y
CONFIG_INET=y           # TCP/IP networking

# Wireless support
CONFIG_WIRELESS=y
CONFIG_CFG80211=m       # Wireless configuration API
CONFIG_MAC80211=m       # Generic 802.11 stack

# Netfilter/iptables (firewall)
CONFIG_NETFILTER=y
CONFIG_NF_CONNTRACK=m
CONFIG_NETFILTER_XTABLES=m
CONFIG_IP_NF_IPTABLES=m
CONFIG_IP_NF_FILTER=m

# Network namespaces (for containers)
CONFIG_NET_NS=y
```

### Device Drivers

Navigate to: **Device Drivers**

```
# Graphics drivers
CONFIG_DRM=m                    # Direct Rendering Manager
CONFIG_DRM_I915=m               # Intel integrated graphics
CONFIG_DRM_AMDGPU=m             # AMD graphics
CONFIG_DRM_NOUVEAU=m            # NVIDIA open-source driver

# Storage drivers
CONFIG_ATA=m                    # SATA/PATA support
CONFIG_NVME_CORE=m              # NVMe SSDs
CONFIG_BLK_DEV_SD=m             # SCSI disk support
CONFIG_USB_STORAGE=m            # USB storage devices

# Input devices
CONFIG_INPUT_EVDEV=m            # Event interface
CONFIG_INPUT_KEYBOARD=y         # Keyboard support
CONFIG_INPUT_MOUSE=y            # Mouse support
```

### Security Options

Navigate to: **Security options**

```
# Linux Security Modules
CONFIG_SECURITY=y
CONFIG_SECURITYFS=y
CONFIG_SECURITY_NETWORK=y

# AppArmor (Ubuntu default)
CONFIG_SECURITY_APPARMOR=y
CONFIG_DEFAULT_SECURITY_APPARMOR=y

# SELinux (alternative to AppArmor)
CONFIG_SECURITY_SELINUX=n

# Kernel hardening options
CONFIG_HARDENED_USERCOPY=y
CONFIG_FORTIFY_SOURCE=y
CONFIG_STACKPROTECTOR=y
CONFIG_STACKPROTECTOR_STRONG=y

# Disable unused kernel features for security
CONFIG_MODULES=y                # Keep if you need modules
CONFIG_MODULE_SIG=y             # Require signed modules
```

### Virtualization

Navigate to: **Virtualization**

```
# KVM virtualization
CONFIG_VIRTUALIZATION=y
CONFIG_KVM=m
CONFIG_KVM_INTEL=m              # For Intel CPUs
CONFIG_KVM_AMD=m                # For AMD CPUs

# Container support (Docker, LXC)
CONFIG_NAMESPACES=y
CONFIG_UTS_NS=y
CONFIG_IPC_NS=y
CONFIG_PID_NS=y
CONFIG_NET_NS=y
CONFIG_USER_NS=y
CONFIG_CGROUP_NS=y
```

## Compilation Process

Now that you've configured your kernel, it's time to compile it.

### Cleaning the Build Directory

Before building, clean any previous build artifacts:

```bash
# Remove all generated files (start fresh)
make mrproper

# Or, remove only compiled objects (keep .config)
make clean
```

### Building the Kernel

Start the compilation process:

```bash
# Determine number of CPU cores for parallel compilation
# Using more jobs speeds up compilation significantly
CORES=$(nproc)
echo "Building with $CORES parallel jobs"

# Build the kernel, modules, and device tree blobs
# -j flag enables parallel compilation
make -j$(nproc)

# This command performs:
# 1. Compiles the kernel image (vmlinuz)
# 2. Compiles all selected modules
# 3. Generates System.map (kernel symbol table)
```

### Building with Verbose Output

If you encounter errors, enable verbose output:

```bash
# Build with verbose output to see all compiler commands
make V=1 -j$(nproc)

# Or for even more verbosity
make V=2 -j$(nproc)
```

### Using ccache for Faster Rebuilds

If you installed ccache, enable it:

```bash
# Enable ccache for the build
export PATH="/usr/lib/ccache:$PATH"

# Verify ccache is being used
which gcc  # Should show /usr/lib/ccache/gcc

# Build with ccache
make -j$(nproc)

# Check ccache statistics after build
ccache -s
```

### Monitoring Build Progress

The kernel build consists of multiple stages:

```bash
# Watch the build progress
# You'll see output like:
#   CC      init/main.o        (Compiling C files)
#   AS      arch/x86/entry.o   (Assembling)
#   LD      vmlinux.o          (Linking)
#   OBJCOPY arch/x86/bzImage   (Creating bootable image)

# Build time estimates (vary by hardware):
# - 4-core laptop: 1-2 hours
# - 8-core desktop: 30-60 minutes
# - 16-core workstation: 15-30 minutes
# - 32+ core server: <15 minutes
```

### Handling Build Errors

Common build errors and solutions:

```bash
# Error: Missing header file
# Solution: Install development package
sudo apt install libssl-dev libelf-dev

# Error: BTF generation failed
# Solution: Install dwarves package
sudo apt install dwarves

# Error: Certificate problems
# Solution: Disable module signing or generate keys
scripts/config --disable MODULE_SIG
scripts/config --disable SYSTEM_TRUSTED_KEYS
scripts/config --disable SYSTEM_REVOCATION_KEYS

# Then rebuild configuration and kernel
make olddefconfig
make -j$(nproc)
```

## Installing the New Kernel

After successful compilation, install the kernel and modules.

### Method 1: Traditional Installation

The classic method using make install:

```bash
# Install kernel modules to /lib/modules/<version>
sudo make modules_install

# Install the kernel image, System.map, and config
sudo make install

# This performs:
# 1. Copies vmlinuz-<version> to /boot
# 2. Copies System.map-<version> to /boot
# 3. Copies .config to /boot/config-<version>
# 4. Generates initramfs
# 5. Updates bootloader (GRUB)
```

### Method 2: Building Debian Packages (Recommended)

Create installable .deb packages for cleaner management:

```bash
# Build Debian packages (kernel image and headers)
# This is the recommended method for Ubuntu systems
make -j$(nproc) bindeb-pkg

# Optional: Add a custom revision number
make -j$(nproc) bindeb-pkg KDEB_PKGVERSION=$(make kernelrelease)-1

# The packages are created in the parent directory
ls ../*.deb

# You should see packages like:
# linux-image-6.8.1-custom_6.8.1-1_amd64.deb
# linux-headers-6.8.1-custom_6.8.1-1_amd64.deb
# linux-libc-dev_6.8.1-1_amd64.deb

# Install the packages
sudo dpkg -i ../linux-image-*.deb ../linux-headers-*.deb

# Or install just the image if you don't need headers
sudo dpkg -i ../linux-image-*.deb
```

### Verifying Installation

Confirm the kernel was installed correctly:

```bash
# Check kernel files in /boot
ls -la /boot/vmlinuz-*
ls -la /boot/initrd.img-*
ls -la /boot/config-*

# Check installed modules
ls /lib/modules/

# Verify the Debian package was installed
dpkg -l | grep linux-image
```

## Updating GRUB

The GRUB bootloader needs to be updated to include your new kernel.

### Automatic GRUB Update

The installation process usually updates GRUB automatically, but you can do it manually:

```bash
# Update GRUB configuration
sudo update-grub

# This scans /boot for kernels and updates /boot/grub/grub.cfg
# You should see output like:
# Generating grub configuration file ...
# Found linux image: /boot/vmlinuz-6.8.1-custom
# Found initrd image: /boot/initrd.img-6.8.1-custom
# Found linux image: /boot/vmlinuz-6.5.0-generic
# ...
```

### Configuring GRUB Settings

Modify GRUB behavior in `/etc/default/grub`:

```bash
# Edit GRUB configuration
sudo nano /etc/default/grub

# Key settings:
# Show boot menu for 10 seconds
GRUB_TIMEOUT=10

# Don't hide the menu
GRUB_TIMEOUT_STYLE=menu

# Default kernel (0 = first, 'saved' = remember last choice)
GRUB_DEFAULT=0

# Kernel command line parameters
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"

# After editing, update GRUB
sudo update-grub
```

### Setting Default Kernel

Choose which kernel boots by default:

```bash
# List available kernels in GRUB
grep -E "^menuentry|^submenu" /boot/grub/grub.cfg | head -20

# Set a specific kernel as default using its menu entry
# Find the exact name from grub.cfg or use grub-set-default
sudo grub-set-default "Advanced options for Ubuntu>Ubuntu, with Linux 6.8.1-custom"

# Or set by index (0 = first entry)
sudo grub-set-default 0

# Verify the setting
sudo grub-editenv list
```

### Regenerating Initramfs

If you need to regenerate the initial RAM filesystem:

```bash
# Regenerate initramfs for your custom kernel
sudo update-initramfs -c -k 6.8.1-custom

# Or update an existing initramfs
sudo update-initramfs -u -k 6.8.1-custom

# Update initramfs for all kernels
sudo update-initramfs -u -k all
```

## Working with Kernel Modules

Understanding and managing kernel modules is essential for a custom kernel.

### Building External Modules

If you need to build modules separately:

```bash
# Ensure kernel headers are available
ls /lib/modules/$(uname -r)/build

# Build an external module (example: a custom driver)
cd /path/to/module/source
make -C /lib/modules/$(uname -r)/build M=$(pwd) modules

# Install the module
sudo make -C /lib/modules/$(uname -r)/build M=$(pwd) modules_install

# Load the module
sudo modprobe module_name
```

### Managing Modules

Common module management commands:

```bash
# List currently loaded modules
lsmod

# Show module information
modinfo module_name

# Load a module
sudo modprobe module_name

# Load a module with parameters
sudo modprobe module_name param1=value1 param2=value2

# Unload a module
sudo modprobe -r module_name

# Show module dependencies
modprobe --show-depends module_name
```

### Module Configuration

Configure module behavior:

```bash
# Create persistent module options
# Create a file in /etc/modprobe.d/
sudo nano /etc/modprobe.d/custom-modules.conf

# Example content:
# options module_name param1=value1 param2=value2
# blacklist unwanted_module

# Load modules at boot
sudo nano /etc/modules-load.d/custom.conf
# Add module names, one per line

# Blacklist modules (prevent loading)
sudo nano /etc/modprobe.d/blacklist-custom.conf
# blacklist module_name

# Regenerate initramfs after module config changes
sudo update-initramfs -u
```

### DKMS for Persistent Modules

DKMS (Dynamic Kernel Module Support) automatically rebuilds modules for new kernels:

```bash
# Install DKMS
sudo apt install dkms

# Add a module to DKMS (example structure)
# Module should be in /usr/src/module-version/
sudo dkms add -m module_name -v version

# Build for current kernel
sudo dkms build -m module_name -v version

# Install the module
sudo dkms install -m module_name -v version

# Check DKMS status
dkms status
```

## Reverting to the Old Kernel

If your custom kernel causes problems, you can easily revert to the previous kernel.

### Boot into Old Kernel via GRUB

At boot time:

1. When GRUB menu appears (hold Shift during boot if hidden)
2. Select "Advanced options for Ubuntu"
3. Choose your previous working kernel
4. Boot into the system

### Making the Old Kernel Default

If you're stuck with a problematic kernel:

```bash
# List installed kernels
dpkg -l | grep linux-image

# Set old kernel as default
sudo grub-set-default "Advanced options for Ubuntu>Ubuntu, with Linux 6.5.0-generic"
sudo update-grub

# Or edit /etc/default/grub
sudo nano /etc/default/grub
# Set GRUB_DEFAULT to the old kernel entry
sudo update-grub
```

### Removing a Problematic Kernel

Remove a custom kernel that doesn't work:

```bash
# If installed via Debian package:
sudo dpkg -r linux-image-6.8.1-custom
sudo dpkg -r linux-headers-6.8.1-custom

# If installed via make install:
sudo rm /boot/vmlinuz-6.8.1-custom
sudo rm /boot/initrd.img-6.8.1-custom
sudo rm /boot/System.map-6.8.1-custom
sudo rm /boot/config-6.8.1-custom
sudo rm -rf /lib/modules/6.8.1-custom

# Update GRUB to remove entries
sudo update-grub
```

### Recovery Mode

If you can't boot into any kernel:

1. Boot from Ubuntu live USB
2. Mount your root partition:
   ```bash
   sudo mount /dev/sdaX /mnt
   sudo mount /dev/sdaY /mnt/boot  # if separate boot partition
   sudo mount --bind /dev /mnt/dev
   sudo mount --bind /proc /mnt/proc
   sudo mount --bind /sys /mnt/sys
   ```
3. Chroot into your system:
   ```bash
   sudo chroot /mnt
   ```
4. Remove problematic kernel and update GRUB:
   ```bash
   dpkg -r linux-image-problematic-version
   update-grub
   ```
5. Exit and reboot:
   ```bash
   exit
   sudo reboot
   ```

## Troubleshooting Boot Issues

Common boot problems and their solutions.

### Kernel Panic on Boot

If you see a kernel panic message:

```bash
# Common causes and solutions:

# 1. Missing root filesystem driver
# Boot old kernel and ensure filesystem driver is built-in (not module)
# In menuconfig: File systems -> enable your rootfs as [*] not [M]
make menuconfig
# Rebuild and reinstall

# 2. Missing initramfs
# Regenerate initramfs
sudo update-initramfs -c -k 6.8.1-custom

# 3. Wrong root device
# Check kernel command line in GRUB
# Edit /etc/default/grub and verify root= parameter
```

### No Display After Boot

Graphics issues with the new kernel:

```bash
# Boot with nomodeset to disable kernel mode setting
# At GRUB, press 'e' to edit boot entry
# Add 'nomodeset' to the kernel command line
# Press F10 to boot

# Once booted, check which graphics driver is needed
lspci | grep -i vga

# Ensure the correct graphics driver is enabled in kernel config:
# CONFIG_DRM_I915=m  (Intel)
# CONFIG_DRM_AMDGPU=m  (AMD)
# CONFIG_DRM_NOUVEAU=m  (NVIDIA open-source)

# Rebuild kernel with correct driver
```

### Network Not Working

Network connectivity issues:

```bash
# Check if network drivers are loaded
lsmod | grep -E "e1000|r8169|iwl|ath"

# Identify your network hardware
lspci | grep -i network
lspci | grep -i ethernet

# Ensure drivers are enabled in kernel config
# Rebuild if necessary

# For wireless issues, check:
# CONFIG_WIRELESS=y
# CONFIG_CFG80211=m
# CONFIG_MAC80211=m
# Plus your specific wireless chipset driver
```

### Slow Boot

If boot is significantly slower:

```bash
# Analyze boot time
systemd-analyze blame

# Check for missing modules causing timeouts
dmesg | grep -i timeout
dmesg | grep -i error

# Common slow boot causes:
# 1. Missing storage drivers (system waits for timeout)
# 2. Missing network drivers (network services wait)
# 3. Insufficient modules in initramfs

# Rebuild initramfs with necessary modules
sudo update-initramfs -u -k 6.8.1-custom
```

### Debugging Boot Issues

Enable verbose boot for troubleshooting:

```bash
# Edit /etc/default/grub
sudo nano /etc/default/grub

# Remove 'quiet splash' for verbose output
GRUB_CMDLINE_LINUX_DEFAULT=""

# Add debug options if needed
GRUB_CMDLINE_LINUX_DEFAULT="debug ignore_loglevel"

# Update GRUB
sudo update-grub

# After boot, check logs
dmesg | less
journalctl -xb
```

### Kernel Oops and BUG Messages

If you see kernel BUG or oops messages:

```bash
# Capture the error message (photograph if necessary)

# Check kernel logs after boot
dmesg | grep -i bug
dmesg | grep -i oops

# Common solutions:
# 1. Disable the problematic feature in kernel config
# 2. Try a different kernel version
# 3. Report the bug to kernel developers with full dmesg output

# Enable additional debugging options for more info
# In menuconfig: Kernel hacking -> Debug options
```

## Complete Example Workflow

Here's a complete workflow for building and installing a custom kernel:

```bash
#!/bin/bash
# Custom Kernel Build Script for Ubuntu
# This script automates the kernel build process

set -e  # Exit on any error

# Configuration
KERNEL_VERSION="6.8.1"
CUSTOM_SUFFIX="custom"
BUILD_DIR="$HOME/kernel-build"
JOBS=$(nproc)

echo "=== Custom Kernel Build Script ==="
echo "Kernel Version: $KERNEL_VERSION"
echo "Build Jobs: $JOBS"
echo ""

# Step 1: Install dependencies
echo "[1/8] Installing build dependencies..."
sudo apt update
sudo apt install -y build-essential libncurses-dev bison flex \
    libssl-dev libelf-dev bc dwarves zstd fakeroot dpkg-dev

# Step 2: Create build directory and download source
echo "[2/8] Downloading kernel source..."
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

if [ ! -f "linux-$KERNEL_VERSION.tar.xz" ]; then
    wget "https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-$KERNEL_VERSION.tar.xz"
fi

# Step 3: Extract source
echo "[3/8] Extracting kernel source..."
rm -rf "linux-$KERNEL_VERSION"
tar -xf "linux-$KERNEL_VERSION.tar.xz"
cd "linux-$KERNEL_VERSION"

# Step 4: Configure kernel
echo "[4/8] Configuring kernel..."
# Start with current config
cp /boot/config-$(uname -r) .config

# Set custom version suffix
scripts/config --set-str LOCALVERSION "-$CUSTOM_SUFFIX"

# Disable problematic options for building
scripts/config --disable SYSTEM_TRUSTED_KEYS
scripts/config --disable SYSTEM_REVOCATION_KEYS
scripts/config --set-str SYSTEM_TRUSTED_KEYS ""
scripts/config --set-str SYSTEM_REVOCATION_KEYS ""

# Update config for new kernel version
make olddefconfig

# Optional: Run menuconfig for further customization
# Uncomment the following line if you want to customize
# make menuconfig

# Step 5: Build kernel
echo "[5/8] Building kernel (this may take a while)..."
make -j$JOBS

# Step 6: Build Debian packages
echo "[6/8] Building Debian packages..."
make -j$JOBS bindeb-pkg KDEB_PKGVERSION="${KERNEL_VERSION}-1"

# Step 7: Install packages
echo "[7/8] Installing kernel packages..."
cd ..
sudo dpkg -i linux-image-*.deb linux-headers-*.deb

# Step 8: Update GRUB
echo "[8/8] Updating GRUB..."
sudo update-grub

echo ""
echo "=== Build Complete ==="
echo "Kernel $KERNEL_VERSION-$CUSTOM_SUFFIX has been installed."
echo "Please reboot to use the new kernel."
echo ""
echo "To verify after reboot, run: uname -r"
echo "Expected output: $KERNEL_VERSION-$CUSTOM_SUFFIX"
```

Save this script as `build-kernel.sh` and run:

```bash
chmod +x build-kernel.sh
./build-kernel.sh
```

## Best Practices and Tips

### Version Control Your Configuration

Keep track of your kernel configurations:

```bash
# Create a git repository for your configs
mkdir ~/kernel-configs
cd ~/kernel-configs
git init

# Save your config after each build
cp /path/to/kernel/source/.config config-$(date +%Y%m%d)-description
git add .
git commit -m "Kernel config for X purpose"
```

### Document Your Changes

Keep notes about what you changed and why:

```bash
# Create a changelog
echo "$(date): Enabled CONFIG_XYZ for feature ABC" >> ~/kernel-configs/CHANGELOG
```

### Test Before Deploying

Always test custom kernels thoroughly:

```bash
# After booting new kernel, run checks
uname -r                          # Verify kernel version
lsmod                             # Check modules loaded
dmesg | grep -i error             # Look for errors
systemctl --failed                # Check for failed services
```

### Keep Old Kernels

Always keep at least one known-working kernel:

```bash
# Check installed kernels
dpkg -l | grep linux-image

# Don't remove your last working kernel until you've verified
# the new one works properly for your use case
```

## Conclusion

Compiling a custom Linux kernel on Ubuntu gives you complete control over your system's core functionality. While it requires time and patience to learn, the benefits of optimized performance, hardware support, and deeper understanding of Linux make it a worthwhile endeavor.

Remember to:
- Always start with a working configuration
- Make incremental changes and test frequently
- Keep backup kernels available
- Document your customizations
- Use Debian packages for cleaner installation and removal

As your systems grow in complexity, monitoring becomes crucial. **[OneUptime](https://oneuptime.com)** provides comprehensive infrastructure monitoring that helps you track the health and performance of your servers running custom kernels. With OneUptime, you can monitor system metrics, set up alerts for anomalies, and ensure your custom kernel configurations are performing as expected. Whether you're running development machines or production servers with optimized kernels, OneUptime gives you the visibility you need to maintain reliable systems.

Happy kernel hacking!
