# How to Install K3s on ARM Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, ARM, Edge Computing, IoT

Description: Learn how to install and configure K3s on ARM-based devices including Raspberry Pi, NVIDIA Jetson, and other SBCs.

## Introduction

K3s was designed with ARM support from the beginning, making it the ideal Kubernetes distribution for ARM-based single-board computers (SBCs) and edge devices. K3s supports both ARM64 (AArch64) and ARMv7 (armhf) architectures, making it a strong fit for Raspberry Pi, Jetson, and other modern SBCs.

## Supported ARM Architectures

| Architecture | Binary | Typical Devices |
|---|---|---|
| ARM64 (AArch64) | k3s-arm64 | Raspberry Pi 3/4/5 with a 64-bit OS, Jetson, newer SBCs |
| ARMv7 (32-bit) | k3s-armhf | Raspberry Pi 2/3 with a 32-bit OS, older SBCs |

## Prerequisites

Regardless of the ARM device, these steps are universal:

```bash
# Check your architecture

uname -m
# aarch64 = ARM64
# armv7l  = ARMv7/armhf
# armv6l  = ARMv6 (not supported by current K3s releases)

# Check available memory
free -h

# Check disk space
df -h /
```

## General ARM Installation

The K3s install script auto-detects the supported ARM architecture:

```bash
# The script detects ARM and downloads the correct binary
curl -sfL https://get.k3s.io | sudo sh -

# For ARM agents joining an existing cluster
curl -sfL https://get.k3s.io | \
    K3S_URL="https://server-ip:6443" \
    K3S_TOKEN="your-token" \
    sudo sh -
```

## Raspberry Pi Preparation (All Models)

### Enable cgroup Memory

K3s requires cgroup memory management to be enabled:

```bash
# Check if cgroup memory is enabled
cat /proc/cgroups | grep memory

# Edit the boot command line
sudo nano /boot/firmware/cmdline.txt
# On Debian 11 and older Raspberry Pi OS releases, use /boot/cmdline.txt

# Add these parameters to the END of the single line (don't create a new line)
# cgroup_memory=1 cgroup_enable=memory

# The line should look like:
# console=serial0,115200 console=tty1 root=PARTUUID=... ... cgroup_memory=1 cgroup_enable=memory

# Reboot to apply
sudo reboot
```

### Disable Swap (Recommended)

```bash
# Disable swap
sudo dphys-swapfile swapoff
sudo dphys-swapfile uninstall
sudo update-rc.d dphys-swapfile remove

# Or via systemctl
sudo systemctl disable dphys-swapfile.service
```

## Raspberry Pi 4 (ARM64)

```bash
# Update the OS
sudo apt-get update && sudo apt-get upgrade -y

# Enable 64-bit mode if not already enabled
# Edit /boot/firmware/config.txt and add: arm_64bit=1
# On older Raspberry Pi OS releases, use /boot/config.txt
# Then reboot

# Verify ARM64
uname -m  # Should show: aarch64

# Install K3s (auto-detects ARM64)
curl -sfL https://get.k3s.io | sudo sh -
```

## Raspberry Pi 3 (ARMv7 or ARM64)

Pi 3 can run either a 32-bit or 64-bit OS. For better K3s performance, use the 64-bit Raspberry Pi OS:

```bash
# If running 32-bit OS (armv7l), K3s will use the armhf binary
curl -sfL https://get.k3s.io | sudo sh -

# If you are running a 64-bit OS (aarch64)
# K3s will use the arm64 binary automatically
curl -sfL https://get.k3s.io | sudo sh -
```

## Raspberry Pi Zero (ARMv6)

The original Pi Zero, Zero W, and Pi 1 use an ARMv6 CPU. Current K3s releases do not provide ARMv6 binaries, so these models are not supported.

If you need a Zero-class board, use a Raspberry Pi Zero 2 W and follow the Pi 3 instructions above.

## NVIDIA Jetson Devices

Jetson devices run a customized Ubuntu (JetPack) and use ARM64:

```bash
# Verify ARM64
uname -m  # aarch64

# The Jetson may use a different boot partition for kernel parameters
sudo nano /boot/extlinux/extlinux.conf
# Add cgroup parameters to the APPEND line:
# APPEND root=... cgroup_memory=1 cgroup_enable=memory

sudo reboot

# Install K3s
curl -sfL https://get.k3s.io | sudo sh -
```

## Performance Tuning for ARM Devices

### Memory-Constrained Devices (< 2GB RAM)

```yaml
# /etc/rancher/k3s/config.yaml
# Disable components not needed to save memory
disable:
  - traefik
  - servicelb
  - metrics-server

# Reduce kubelet overhead
kubelet-arg:
  - "max-pods=50"
  - "kube-reserved=cpu=100m,memory=128Mi"
  - "system-reserved=cpu=100m,memory=64Mi"
  - "eviction-hard=memory.available<64Mi"
  - "image-gc-high-threshold=85"
  - "image-gc-low-threshold=70"
```

### Storage on ARM Devices

ARM SBCs often use SD cards which are slow and prone to wear:

```bash
# Mount a USB SSD for better performance
sudo mkdir -p /mnt/ssd
sudo tee -a /etc/fstab > /dev/null <<EOF
/dev/sda1  /mnt/ssd  ext4  defaults,noatime  0  2
EOF

sudo mount -a
sudo mkdir -p /mnt/ssd/k3s

# Configure K3s to use the SSD
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
data-dir: /mnt/ssd/k3s
EOF
```

## Verifying ARM Installation

```bash
# Check K3s is running
sudo systemctl status k3s        # server node
sudo systemctl status k3s-agent  # agent node

# On a server node, view nodes and their architecture
sudo k3s kubectl get nodes
sudo k3s kubectl get nodes -o custom-columns=\
'NAME:.metadata.name,OS:.status.nodeInfo.operatingSystem,ARCH:.status.nodeInfo.architecture'

# Verify K3s binary architecture
file "$(command -v k3s)"
# For ARM64: ELF 64-bit LSB executable, ARM aarch64
# For ARMv7: ELF 32-bit LSB executable, ARM, EABI5
```

## Conclusion

K3s's native ARM support makes it the premier Kubernetes distribution for ARM devices. The install script handles architecture detection automatically for supported ARM64 and ARMv7 systems, so the installation process is largely the same across those devices. On Raspberry Pi OS, the key preparation steps are enabling cgroup memory in the boot parameters and disabling swap. For resource-constrained supported devices, agent-only deployments let you offload the control plane to more capable hardware.
