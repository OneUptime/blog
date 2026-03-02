# How to Use DKMS for Dynamic Kernel Module Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, DKMS, Drivers, System Administration

Description: Learn to use DKMS on Ubuntu to automatically rebuild kernel modules when the kernel updates, keeping custom and out-of-tree drivers working across upgrades.

---

DKMS (Dynamic Kernel Module Support) solves a common pain point: you install a kernel module from source, it works, then the kernel updates and the module breaks because it was compiled for the old kernel version. DKMS automates the recompilation process - when a new kernel is installed, DKMS rebuilds all registered modules for the new kernel automatically. This is how Ubuntu handles drivers for things like VirtualBox, proprietary GPU drivers, and certain wireless cards.

## How DKMS Works

DKMS maintains a source tree for each registered module and hooks into the kernel package installation process. When `apt` installs a new kernel, a `dpkg` post-install hook triggers DKMS to rebuild all registered modules for the new kernel version. The rebuilt modules are installed alongside the new kernel, so when you reboot into it, the modules are already in place.

## Installing DKMS

```bash
# Install DKMS and the build essentials needed to compile modules
sudo apt update
sudo apt install dkms build-essential linux-headers-$(uname -r)

# Verify DKMS is installed
dkms status
```

The `linux-headers-$(uname -r)` package provides the kernel headers required for module compilation. DKMS automatically installs headers for new kernel versions as they arrive.

## Checking the DKMS Status

```bash
# List all DKMS-managed modules and their build status
dkms status

# Example output:
# nvidia/550.54, 6.8.0-52-generic, x86_64: installed
# virtualbox/7.0.14, 6.8.0-52-generic, x86_64: installed
```

The output shows each module, its version, the kernel version it was built for, architecture, and current state.

## Adding a Module to DKMS

To add a custom or third-party module to DKMS, you need the module source code and a `dkms.conf` file.

### Step 1: Prepare the Source Directory

DKMS expects module sources in `/usr/src/<module-name>-<version>/`.

```bash
# Example: adding a custom module called "mydriver" version 1.0
sudo mkdir -p /usr/src/mydriver-1.0

# Copy your module source files there
sudo cp /path/to/mydriver/*.c /usr/src/mydriver-1.0/
sudo cp /path/to/mydriver/Makefile /usr/src/mydriver-1.0/
```

### Step 2: Create the dkms.conf File

```bash
sudo nano /usr/src/mydriver-1.0/dkms.conf
```

```bash
# dkms.conf for mydriver
PACKAGE_NAME="mydriver"
PACKAGE_VERSION="1.0"
BUILT_MODULE_NAME[0]="mydriver"
DEST_MODULE_LOCATION[0]="/kernel/drivers/misc"
AUTOINSTALL="yes"
MAKE="make -C ${kernel_source_dir} M=${dkms_tree}/${PACKAGE_NAME}/${PACKAGE_VERSION}/build"
CLEAN="make -C ${kernel_source_dir} M=${dkms_tree}/${PACKAGE_NAME}/${PACKAGE_VERSION}/build clean"
```

Key fields:
- `PACKAGE_NAME` - the module name
- `PACKAGE_VERSION` - module version (must match directory name)
- `BUILT_MODULE_NAME` - filename of the built `.ko` file (without extension)
- `DEST_MODULE_LOCATION` - where to install the module in the kernel tree
- `AUTOINSTALL` - if "yes", rebuild on kernel upgrades automatically

### Step 3: Register and Build

```bash
# Add the module to the DKMS tree
sudo dkms add -m mydriver -v 1.0

# Build the module for the current kernel
sudo dkms build -m mydriver -v 1.0

# Install the module
sudo dkms install -m mydriver -v 1.0

# Verify
dkms status
```

## Building for a Specific Kernel

If you need to build for a kernel other than the currently running one.

```bash
# List installed kernels
ls /usr/src/linux-headers-*/

# Build for a specific kernel version
sudo dkms build -m mydriver -v 1.0 -k 6.8.0-52-generic

# Install for that specific kernel
sudo dkms install -m mydriver -v 1.0 -k 6.8.0-52-generic
```

## Loading and Testing the Module

```bash
# Load the newly installed module
sudo modprobe mydriver

# Verify it loaded
lsmod | grep mydriver

# Check kernel messages for any errors
dmesg | tail -20

# Unload the module
sudo modprobe -r mydriver
```

## Packaging DKMS Modules as Debian Packages

For distributing DKMS modules to multiple machines, package them as `.deb` files.

```bash
# Install devscripts and helper tools
sudo apt install devscripts dh-make debhelper

# DKMS provides a helper for building packages
# Create the package source structure manually or use mkdeb-dkms

# Build a source package that includes DKMS support
dkms mktarball -m mydriver -v 1.0

# The tarball is in /var/lib/dkms/mydriver/1.0/tarball/
ls /var/lib/dkms/mydriver/1.0/tarball/
```

Many DKMS packages on Ubuntu are distributed as `<name>-dkms` packages that ship the source in `/usr/src/` and a `dkms.conf` file. The package's `postinst` script runs `dkms add`, `dkms build`, and `dkms install` automatically.

## Removing a DKMS Module

```bash
# Remove the installed module (uninstall from kernel tree)
sudo dkms remove -m mydriver -v 1.0 --all

# This removes it from all kernels it was built for
# The source directory in /usr/src/ is NOT automatically removed

# Remove the source directory manually
sudo rm -rf /usr/src/mydriver-1.0/
```

## Handling Build Failures

When a module fails to build after a kernel upgrade, DKMS logs the failure.

```bash
# Check DKMS build logs
ls /var/lib/dkms/mydriver/1.0/build/

# View the make log for the failed build
cat /var/lib/dkms/mydriver/1.0/build/make.log

# Common issues:
# - API changes between kernel versions require updating module source
# - Missing kernel header files
# - Incompatible function signatures
```

If the build fails because of kernel API changes, you need to update the module source code to be compatible with the new kernel version and then re-register with a new version number.

```bash
# After updating source code, increment the version
sudo cp -r /usr/src/mydriver-1.0/ /usr/src/mydriver-1.1/
# Edit /usr/src/mydriver-1.1/dkms.conf to change PACKAGE_VERSION to "1.1"
# Make your source code fixes in /usr/src/mydriver-1.1/

sudo dkms add -m mydriver -v 1.1
sudo dkms build -m mydriver -v 1.1
sudo dkms install -m mydriver -v 1.1
```

## Automating Header Installation

For DKMS to work correctly after a kernel upgrade, the headers for the new kernel must be installed. Ubuntu handles this automatically if you have the right package installed.

```bash
# Install the meta-package that always pulls the current kernel headers
sudo apt install linux-headers-generic

# Or for specific kernel variants
sudo apt install linux-headers-lowlatency
sudo apt install linux-headers-virtual
```

## Common DKMS-Managed Modules on Ubuntu

Several widely-used modules are managed through DKMS on Ubuntu.

```bash
# NVIDIA proprietary drivers
sudo apt install nvidia-dkms-550

# VirtualBox kernel modules
sudo apt install virtualbox-dkms

# WireGuard (on older kernels without built-in WireGuard)
sudo apt install wireguard-dkms

# Broadcom WiFi (if needed)
sudo apt install bcmwl-kernel-source
```

DKMS is transparent once set up - kernel upgrades just work without manual intervention. For any driver that is not part of the mainline kernel, DKMS is the standard mechanism Ubuntu uses to keep it working through upgrades.
