# How to Use HWE (Hardware Enablement) Kernels on Ubuntu LTS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HWE, Kernel, LTS

Description: How to install and manage Hardware Enablement kernels on Ubuntu LTS to gain support for newer hardware while staying on a supported LTS release.

---

Ubuntu LTS releases ship with a kernel version frozen at release time. For hardware purchased after the LTS release date, the bundled kernel may lack support for newer components - network cards, NVMe controllers, GPU drivers, and various peripherals. Hardware Enablement (HWE) kernels solve this by bringing newer upstream kernels to LTS releases.

## What HWE Kernels Are

When Canonical releases an LTS (e.g., 22.04 in April 2022), it ships with the kernel from that time (5.15 for 22.04). Subsequent interim releases bring newer kernels:

- 22.10 shipped with kernel 5.19
- 23.04 shipped with kernel 6.2
- 23.10 shipped with kernel 6.5
- 24.04 shipped with kernel 6.8

The HWE stack for 22.04 LTS progressively backports these newer kernels to 22.04. This gives you:
- Newer kernel with newer hardware support
- Remaining on the 22.04 LTS security maintenance track
- Same userspace and packages as standard 22.04

There are two HWE tracks:
- **Rolling HWE**: Automatically advances to newer kernels as they become available. Good for keeping up with the latest, but moves the kernel under you.
- **Point release HWE**: Pinned to a specific kernel version associated with a point release (22.04.3, 22.04.4, etc.). More stable.

## Checking Your Current Kernel and HWE Status

```bash
# Check current kernel version
uname -r

# Check if you are on a GA or HWE kernel
# GA (General Availability) kernels are named: X.X.0-XX-generic
# HWE kernels follow the same naming but come from the HWE packages

# Check what kernel packages are installed
dpkg -l | grep linux-image | grep "^ii"

# Check the HWE status
hwe-support-status
# Or
hwe-support-status --verbose
```

Example output:

```text
Your HWE kernel (6.5.0-35-generic) is supported until April 2025.
You have packages from a series that was released in October 2023,
which reaches its HWE end-of-life in April 2025.
```

## Checking What HWE Kernels Are Available

```bash
# Search for available HWE packages
apt-cache search linux-generic-hwe

# For Ubuntu 22.04, typical output:
# linux-generic-hwe-22.04 - Complete Linux kernel on HWE
# linux-generic-hwe-22.04-edge - Newer HWE kernel (edge/rolling)

# Check details of an HWE package
apt-cache show linux-generic-hwe-22.04
```

## Installing HWE Kernels

### Standard HWE Kernel (Recommended)

```bash
# Install HWE kernel for Ubuntu 22.04
sudo apt install linux-generic-hwe-22.04

# This also installs:
# - linux-image-generic-hwe-22.04
# - linux-headers-generic-hwe-22.04
# - Associated modules packages

# Reboot to activate the new kernel
sudo reboot

# After reboot, verify
uname -r
# Should show a newer kernel version than the GA kernel
```

### Edge HWE Kernel (Cutting Edge)

```bash
# Install edge HWE for the absolute newest kernel on an LTS
sudo apt install linux-generic-hwe-22.04-edge

# This tracks the kernel from the very latest Ubuntu release
# More cutting edge, less tested combination with 22.04 userspace
```

### For Ubuntu 24.04

```bash
# HWE for 24.04 (available once subsequent interim releases ship)
sudo apt install linux-generic-hwe-24.04
```

## Verifying the HWE Kernel Is Running

```bash
# After reboot
uname -r
# Example: 6.5.0-35-generic (HWE from 23.10) vs 5.15.0-105-generic (GA)

# Check which packages are installed
dpkg -l | grep linux | grep "hwe\|generic"

# Verify HWE support status
hwe-support-status --verbose
```

## When to Use HWE Kernels

### New Hardware Support

If you have hardware that requires a newer kernel:

```bash
# Check for unrecognized hardware
lspci | grep -i "unknown"

# Check dmesg for firmware or driver loading errors
dmesg | grep -E -i "firmware\|no driver\|unknown"

# Check if a network card is detected
ip link show
# If expected interface is missing, a newer kernel may have the driver
```

### Better Performance on Newer CPUs

Newer kernels often include performance improvements for recent processor generations:

```bash
# Check CPU flags and features
cat /proc/cpuinfo | grep flags | head -1 | tr ' ' '\n' | sort | grep -E "avx|aes|sha"

# Some features only work with specific kernel versions
```

### Security: Spectre/Meltdown and Newer CPU Vulnerabilities

Mitigations for CPU-level vulnerabilities are added to newer kernels:

```bash
# Check current vulnerability mitigations
grep -r "" /sys/devices/system/cpu/vulnerabilities/

# Newer kernels often have updated mitigations for newer CPU variants
```

## HWE Kernel Support Timelines

HWE kernels do not have the same 5-year support window as the LTS release. Each HWE kernel version has its own EOL:

| Ubuntu LTS | HWE Kernel | HWE EOL |
|------------|-----------|---------|
| 22.04 | 5.19 (from 22.10) | July 2023 |
| 22.04 | 6.2 (from 23.04) | January 2024 |
| 22.04 | 6.5 (from 23.10) | April 2025 |
| 22.04 | 6.8 (from 24.04) | April 2027 |

```bash
# Always check your HWE kernel's support status
hwe-support-status

# If the HWE kernel is approaching EOL, update to the next HWE version
sudo apt install linux-generic-hwe-22.04
# This will pull in the latest available HWE kernel
sudo apt update && sudo apt upgrade
```

## Rolling Back from HWE to GA Kernel

If the HWE kernel causes issues:

```bash
# Check installed GA kernels
dpkg -l | grep linux-image | grep -v hwe | grep "^ii"

# At boot, select the GA kernel from GRUB's advanced options

# After booting into GA kernel, remove HWE packages
sudo apt remove linux-generic-hwe-22.04 linux-image-generic-hwe-22.04
sudo apt autoremove

# Set the GA kernel as default
# Find the exact name in /boot/grub/grub.cfg
grep menuentry /boot/grub/grub.cfg | head -20

# Edit grub default
sudo nano /etc/default/grub
# GRUB_DEFAULT="Advanced options for Ubuntu>Ubuntu, with Linux 5.15.0-105-generic"
sudo update-grub
```

## HWE in the Context of Cloud Instances

Most cloud providers use their own optimized kernels:

```bash
# Check if running a cloud-optimized kernel
uname -r | grep -E "aws|gcp|azure|generic"
# aws: 6.8.0-1010-aws
# gcp: 6.8.0-1007-gcp
```

Cloud kernels are maintained by the providers and are usually at recent versions. Installing HWE kernels on cloud instances may not be necessary and can sometimes cause issues with cloud-specific kernel modules.

Check with your cloud provider's documentation before changing kernel packages on their instances.

## Combining HWE with Ubuntu Pro Livepatch

Livepatch works with HWE kernels:

```bash
# Verify Livepatch is active on HWE kernel
sudo canonical-livepatch status

# If Livepatch shows "kernel not supported", it may be temporarily unavailable
# for a newly released HWE kernel version
# Check support status
sudo canonical-livepatch status --verbose | grep "machine-id\|kernel"
```

## Keeping HWE Updated

HWE packages are meta-packages that track the latest HWE kernel automatically:

```bash
# Regular apt upgrade keeps the HWE kernel updated
sudo apt update && sudo apt upgrade

# Check if HWE kernel has updates pending
apt list --upgradable | grep hwe
```

## DKMS Modules with HWE Kernels

DKMS modules must build for each kernel version, including HWE:

```bash
# After installing HWE kernel, check DKMS built successfully
dkms status | grep $(uname -r)

# If any are missing, rebuild them
sudo dkms install module-name/version

# Check specific modules
dkms status | grep -E "nvidia|zfs|virtualbox"
```

HWE kernels provide a supported path to newer Linux kernel features on Ubuntu LTS releases. For servers with hardware requirements that the GA kernel cannot meet, or for environments that benefit from newer kernel performance improvements and security mitigations, HWE is the right choice over switching to an interim release.
