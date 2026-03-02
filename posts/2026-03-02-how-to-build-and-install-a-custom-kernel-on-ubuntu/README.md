# How to Build and Install a Custom Kernel on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux Kernel, System Administration, Development, Performance Tuning

Description: Learn how to download Linux kernel source, configure it for your hardware, compile it, and install a custom kernel on Ubuntu for performance optimization or feature development.

---

Building a custom kernel is necessary when you need features not included in the stock Ubuntu kernel, want to apply patches not yet upstream, need to tune compilation options for specific hardware, or are developing kernel patches yourself. The process takes time (compilation can take 30-90 minutes on modern hardware) but is well-documented and reliable.

## When to Build a Custom Kernel

Before starting, consider whether you actually need a custom kernel:

- Ubuntu's kernel already includes most features
- Canonical provides mainline kernel builds at `kernel.ubuntu.com`
- DKMS modules handle most hardware-specific driver needs

Good reasons to build a custom kernel:
- Applying a specific patch (security fix, driver improvement)
- Enabling an experimental feature (`CONFIG_PREEMPT_RT` for real-time)
- Disabling features to reduce kernel size on embedded systems
- Benchmarking different kernel options

## Prerequisites

Install build dependencies:

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  libncurses-dev \
  bison \
  flex \
  libssl-dev \
  libelf-dev \
  bc \
  dwarves \
  zstd \
  rsync \
  debhelper
```

Also ensure you have enough disk space - kernel source, build directory, and packages require 10-20GB:

```bash
df -h /
```

## Getting the Kernel Source

### Option 1: Ubuntu Kernel Source

Get Ubuntu's patched kernel (includes Ubuntu-specific patches):

```bash
# Install source for current running kernel
sudo apt source linux-image-$(uname -r)

# Or install build environment
sudo apt install linux-source
ls /usr/src/
tar xf /usr/src/linux-source-*.tar.bz2
cd linux-source-*/
```

### Option 2: Vanilla Upstream Kernel

Get the latest stable kernel from kernel.org:

```bash
# Download the latest stable kernel
cd /usr/src
KERNEL_VERSION="6.8.1"  # Check kernel.org for current stable
sudo wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-${KERNEL_VERSION}.tar.xz
sudo tar xf linux-${KERNEL_VERSION}.tar.xz
cd linux-${KERNEL_VERSION}
```

### Option 3: Via Git

```bash
# Clone the stable kernel tree
git clone --depth=1 https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git
cd linux
```

## Configuring the Kernel

### Start from Your Current Config (Recommended)

The safest approach: use your running kernel's config as the base:

```bash
# Copy current kernel config
cp /boot/config-$(uname -r) .config

# Update the config for the new kernel version
# (answers new prompts with defaults)
make olddefconfig
```

### Interactive Configuration

For changing specific options:

```bash
# Text-based menu (requires libncurses-dev)
make menuconfig

# Graphics-based menu (requires Qt libraries)
make xconfig

# GTK-based menu
make gconfig
```

Navigate with arrow keys in `menuconfig`:
- Enter to expand a menu
- Space to toggle options (Y=built-in, M=module, N=disabled)
- `/` to search for a config option
- `?` to see help for the current option

Common options to check:
- `Processor type and features` - CPU architecture optimizations
- `Preemption Model` - For real-time work
- `Power management` - For server tuning

### Searching for Config Options

```bash
# Find where a config option is in menuconfig
make menuconfig
# Press '/' and type the option name

# Or from command line
grep CONFIG_PREEMPT .config
```

### Disabling Debug Info (Speeds Up Build)

Debug info doubles the build size and time. On a custom kernel for production use:

```bash
# Disable debug info to speed up build
scripts/config --disable CONFIG_DEBUG_INFO
scripts/config --disable CONFIG_DEBUG_INFO_DWARF_TOOLCHAIN_DEFAULT
scripts/config --set-str CONFIG_DEBUG_INFO_NONE y
```

Or in menuconfig: Kernel hacking -> Compile-time checks and compiler options -> Compile the kernel with debug info -> None.

### Disabling Trusted Key (Required for Ubuntu Config)

Ubuntu's kernel config requires a trusted key for module signing. When building without Ubuntu's keys:

```bash
# Remove the key requirement
scripts/config --disable SYSTEM_TRUSTED_KEYS
scripts/config --disable SYSTEM_REVOCATION_KEYS

# Or set to empty string
sed -i 's/CONFIG_SYSTEM_TRUSTED_KEYS=".*"/CONFIG_SYSTEM_TRUSTED_KEYS=""/' .config
sed -i 's/CONFIG_SYSTEM_REVOCATION_KEYS=".*"/CONFIG_SYSTEM_REVOCATION_KEYS=""/' .config
```

## Compiling the Kernel

### Method 1: Build Debian Packages (Recommended)

This creates `.deb` packages that can be installed and managed by `apt`:

```bash
# Use all CPU cores for compilation
# This builds kernel, headers, and libc dev packages
make -j$(nproc) deb-pkg LOCALVERSION=-custom

# Packages appear in the parent directory
ls ../*.deb
```

Build time depends on hardware:
- 4 cores: 45-90 minutes
- 8 cores: 25-45 minutes
- 16+ cores: 15-25 minutes

### Method 2: Direct Build

```bash
# Compile kernel image
make -j$(nproc)

# Compile modules
make -j$(nproc) modules
```

## Installing the Compiled Kernel

### Installing Debian Packages (from Method 1)

```bash
cd ..

# Install all built packages
sudo dpkg -i linux-image-*.deb linux-headers-*.deb

# Update GRUB
sudo update-grub
```

### Installing Directly (from Method 2)

```bash
cd /usr/src/linux-6.8.1

# Install modules to /lib/modules/
sudo make modules_install

# Install kernel image and initrd
sudo make install

# This copies vmlinuz, System.map, and config to /boot
# Then calls update-grub

# Verify
ls /boot/vmlinuz-*
sudo update-grub
```

## Verifying the Install

Before rebooting, verify everything looks right:

```bash
# New kernel should appear in GRUB menu
awk -F\' '/^menuentry |^submenu / {print $2}' /boot/grub/grub.cfg

# Check the initrd was created
ls -la /boot/initrd.img-*
```

## First Boot into Custom Kernel

Keep the old kernel available. In GRUB:
1. Select "Advanced options for Ubuntu"
2. Select the new custom kernel to test it

Or use `grub-reboot` for a one-time test:

```bash
# Boot new kernel once, return to old one if it fails to boot correctly
sudo grub-reboot "Advanced options for Ubuntu>Ubuntu, with Linux 6.8.1-custom"
sudo reboot
```

After booting:

```bash
# Verify running kernel
uname -r
# Should show: 6.8.1-custom

# Check kernel messages for errors
dmesg | grep -i "error\|fail" | head -20
```

## Making it the Default

After verifying the custom kernel works:

```bash
# Set as default
sudo grub-set-default "Advanced options for Ubuntu>Ubuntu, with Linux 6.8.1-custom"

# Or edit /etc/default/grub
sudo nano /etc/default/grub
# Set: GRUB_DEFAULT="Advanced options for Ubuntu>Ubuntu, with Linux 6.8.1-custom"
sudo update-grub
```

## Applying a Patch Before Building

```bash
# Download a patch file
wget https://example.com/my-patch.patch

# Apply the patch in the kernel source directory
cd linux-6.8.1
patch -p1 < /path/to/my-patch.patch

# Or for git trees
git apply /path/to/my-patch.patch

# Then proceed with config and build
```

## Cleaning Up Build Artifacts

After a successful install, the build artifacts use significant space:

```bash
# Clean object files but keep config and source
make clean

# Full clean (removes everything including config)
make mrproper

# Remove build packages from parent directory
ls ../*.deb
rm ../*.deb
```

## Removing a Custom Kernel

If the custom kernel is no longer needed:

```bash
# Via dpkg (if installed as package)
sudo dpkg --purge linux-image-6.8.1-custom

# Or manually
sudo rm /boot/vmlinuz-6.8.1-custom
sudo rm /boot/initrd.img-6.8.1-custom
sudo rm /boot/System.map-6.8.1-custom
sudo rm /boot/config-6.8.1-custom
sudo rm -rf /lib/modules/6.8.1-custom
sudo update-grub
```

Building a custom kernel requires patience but is a manageable process. Using `make deb-pkg` to generate Debian packages is the recommended approach for Ubuntu systems - it integrates cleanly with the package management system and makes removal straightforward.
