# How to Troubleshoot NVIDIA Driver Issues After Kernel Update on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NVIDIA, Kernel, Drivers, Troubleshooting

Description: Practical troubleshooting guide for fixing NVIDIA driver failures after Ubuntu kernel updates, covering DKMS rebuilds, module signing, and preventing future breakage.

---

Kernel updates are among the most common triggers for NVIDIA driver failures on Ubuntu. The NVIDIA kernel module must be compiled against the running kernel, and when the kernel version changes, the module often needs to be rebuilt. If DKMS (Dynamic Kernel Module Support) fails to do this automatically, you end up with a broken display, no `nvidia-smi`, and potentially a system that only boots to a text console. This guide covers diagnosing and fixing these situations.

## Symptoms of a Broken NVIDIA Driver Post-Update

- System boots to terminal or low-resolution failsafe graphics
- `nvidia-smi` returns "NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver"
- `lsmod | grep nvidia` shows nothing
- `/var/log/syslog` or `dmesg` contains NVIDIA module errors
- Display manager fails to start

## First Steps: Confirm the Problem

```bash
# Check current kernel version
uname -r

# Check what kernel the nvidia module was built for
ls /lib/modules/ | grep -v $(uname -r)
# If you see older kernel versions, DKMS might not have rebuilt for the current one

# Check DKMS status for all modules
sudo dkms status

# Expected output when working:
# nvidia/545.23.06, 6.8.0-51-generic, x86_64: installed
# If you see "added" instead of "installed", it wasn't built

# Check if the module exists for the current kernel
ls /lib/modules/$(uname -r)/updates/dkms/ | grep nvidia
```

## Fix 1: Rebuild the NVIDIA Module with DKMS

This is the most common fix and should be tried first:

```bash
# Install kernel headers for the current kernel (required for compilation)
sudo apt-get install -y linux-headers-$(uname -r)

# Rebuild all DKMS modules for the current kernel
sudo dkms autoinstall

# If that doesn't work, remove and rebuild the nvidia module explicitly
# First, find the installed nvidia version
sudo dkms status | grep nvidia

# Remove and reinstall (replace VERSION with your nvidia version, e.g., 545.23.06)
NVIDIA_VERSION="545.23.06"
sudo dkms remove nvidia/${NVIDIA_VERSION} --all
sudo dkms install nvidia/${NVIDIA_VERSION} -k $(uname -r)

# Check if it succeeded
sudo dkms status | grep nvidia
```

## Fix 2: Reinstall the NVIDIA Driver Package

If DKMS rebuild fails, reinstall the driver package entirely:

```bash
# Find which nvidia package is installed
dpkg -l | grep nvidia | grep -v lib

# Reinstall it (replace with your actual package name)
sudo apt-get install --reinstall nvidia-driver-545

# This triggers a fresh DKMS build
# Reboot after completion
sudo reboot
```

## Fix 3: Boot Into the Previous Kernel

If you need the system working immediately while you debug:

1. Reboot and hold Shift (BIOS) or Esc (UEFI) to access the GRUB menu
2. Select "Advanced options for Ubuntu"
3. Choose the previous kernel version where NVIDIA worked
4. Once booted, the system should function normally

From the old kernel, you can then investigate why the new kernel broke things.

## Checking for Secure Boot Issues

Secure Boot is a frequent culprit. When Secure Boot is enabled, unsigned kernel modules cannot be loaded:

```bash
# Check Secure Boot status
mokutil --sb-state

# Check if the NVIDIA module is signed
modinfo nvidia | grep sig

# If the module is unsigned and Secure Boot is on, you have two options:
# Option 1: Disable Secure Boot in UEFI
# Option 2: Sign the module with a Machine Owner Key (MOK)

# Generate a signing key
openssl req -new -x509 -newkey rsa:2048 -keyout /root/nvidia-signing-key.pem \
    -out /root/nvidia-signing-cert.pem -days 36500 -subj "/CN=NVIDIA Module Signing/"

# Sign the module
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 \
    /root/nvidia-signing-key.pem \
    /root/nvidia-signing-cert.pem \
    /lib/modules/$(uname -r)/updates/dkms/nvidia.ko

# Enroll the certificate so Secure Boot trusts it
sudo mokutil --import /root/nvidia-signing-cert.pem
# Enter a password when prompted - you'll need this on the next reboot
# After reboot, the MOK enrollment screen appears - choose "Enroll MOK"
```

## Checking DKMS Build Logs

When DKMS fails to build, the log tells you exactly why:

```bash
# Find recent DKMS logs
ls -lt /var/lib/dkms/nvidia/

# View the build log for your kernel version
KERNEL=$(uname -r)
NVIDIA_VER=$(sudo dkms status | grep nvidia | awk -F'[, ]' '{print $2}' | head -1)
cat /var/lib/dkms/nvidia/${NVIDIA_VER}/${KERNEL}/x86_64/log/make.log | tail -50
```

Common errors in the log:

- **"cc1: error: unrecognized command line option"**: GCC version incompatibility. The NVIDIA driver may not support the newer compiler used with your kernel.
- **"error: implicit declaration of function"**: Kernel API changed. You need a newer NVIDIA driver version.
- **"fatal error: asm/kmap_types.h: No such file or directory"**: Missing kernel headers.

## Fixing Compiler Incompatibilities

Newer kernels may require a newer GCC version that the NVIDIA module source doesn't yet support:

```bash
# Check current GCC version
gcc --version

# Check what GCC the kernel was compiled with
cat /proc/version

# Install an older GCC if needed
sudo apt-get install -y gcc-12

# Force DKMS to use specific compiler
sudo dkms install nvidia/${NVIDIA_VERSION} -k $(uname -r) --kernelsourcedir=/usr/src/linux-headers-$(uname -r) CC=/usr/bin/gcc-12
```

## Preventing Future Breakage

### Pin the Kernel Version

If NVIDIA drivers consistently break on kernel updates, pin the current working kernel:

```bash
# Find current kernel package names
dpkg --list | grep linux-image-$(uname -r)
dpkg --list | grep linux-headers-$(uname -r)

# Hold the current kernel packages
sudo apt-mark hold linux-image-$(uname -r)
sudo apt-mark hold linux-headers-$(uname -r)
sudo apt-mark hold linux-image-generic
sudo apt-mark hold linux-modules-extra-$(uname -r)

# Verify held packages
apt-mark showhold
```

### Configure DKMS to Auto-install for New Kernels

DKMS should handle this automatically, but verify it's configured:

```bash
# Check DKMS configuration
cat /etc/dkms/framework.conf

# Ensure autoinstall is not disabled
grep autoinstall /etc/dkms/framework.conf
```

### Use the ubuntu-drivers Tool

The `ubuntu-drivers` tool can identify and reinstall the recommended driver:

```bash
# Check recommended drivers
ubuntu-drivers devices

# Install recommended driver automatically
sudo ubuntu-drivers autoinstall
```

## Using the NVIDIA Open Kernel Module

NVIDIA now provides an open-source kernel module (for Turing and newer GPUs) that may have better DKMS support:

```bash
# Check if your GPU supports the open module
# Works with: RTX 20xx, 30xx, 40xx, A-series datacenter GPUs

# Install the open kernel module variant
sudo apt-get install -y nvidia-kernel-open-545

# Or via DKMS source
sudo apt-get install -y nvidia-dkms-545-open
```

## Full Recovery from Text Console

If the system only boots to text console, work from there:

```bash
# Verify you can log in at the text console
# Install the necessary headers
sudo apt-get install -y linux-headers-$(uname -r)

# Try reinstalling the driver
sudo apt-get install --reinstall nvidia-driver-545

# If apt is broken, use dpkg directly
sudo dpkg --configure -a

# Rebuild the module
sudo dkms autoinstall -k $(uname -r)

# Try to load the module manually
sudo modprobe nvidia

# If that works, restart the display manager
sudo systemctl restart gdm3  # or lightdm, sddm
```

## Recovery with the NVIDIA Runfile

If everything else fails, install via the runfile installer which bypasses the package manager:

```bash
# Remove all NVIDIA packages first
sudo apt-get remove --purge '^nvidia-.*' -y
sudo apt-get remove --purge '^cuda.*' -y

# Download the runfile from NVIDIA
wget https://us.download.nvidia.com/XFree86/Linux-x86_64/545.23.06/NVIDIA-Linux-x86_64-545.23.06.run

# Run in the absence of a display server
sudo systemctl isolate multi-user.target
sudo sh NVIDIA-Linux-x86_64-545.23.06.run --dkms

# Reboot
sudo reboot
```

The key to staying ahead of these issues is keeping the driver updated through official Ubuntu channels and monitoring DKMS status after every system update.
