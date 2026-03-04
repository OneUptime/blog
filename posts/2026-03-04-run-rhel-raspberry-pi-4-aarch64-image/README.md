# How to Run RHEL on Raspberry Pi 4 Using the aarch64 Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Raspberry Pi, AArch64, ARM, Linux

Description: Install and run RHEL on a Raspberry Pi 4 using the official aarch64 image for development, testing, or edge computing use cases.

---

Red Hat provides an aarch64 image that can run on the Raspberry Pi 4 Model B (4GB or 8GB recommended). This is useful for edge computing, development, and testing RHEL on low-cost ARM hardware.

## Prerequisites

- Raspberry Pi 4 Model B with 4GB or 8GB RAM
- MicroSD card (32GB minimum, Class 10 or UHS-I recommended)
- Active RHEL subscription
- Ethernet connection (Wi-Fi requires additional firmware)

## Download the RHEL Image

```bash
# From the Red Hat Customer Portal, download the RHEL image for ARM
# Navigate to: https://access.redhat.com/downloads/content/rhel
# Select architecture: aarch64
# Download the "KVM Guest Image" or "Raw image" for Raspberry Pi
```

## Write the Image to a MicroSD Card

```bash
# On a Linux workstation, identify the microSD card device
lsblk

# Write the raw image to the microSD card
# Replace /dev/sdX with your actual device
sudo dd if=rhel-9.4-aarch64-kvm.img of=/dev/sdX bs=4M status=progress oflag=sync

# Sync and eject
sync
```

## Expand the Root Partition

The default image has a small root partition. Expand it to use the full SD card.

```bash
# Use fdisk or parted to resize the last partition
# First, resize the partition
sudo parted /dev/sdX resizepart 3 100%

# Then, after booting the Pi, expand the filesystem
sudo xfs_growfs /
```

## First Boot Setup

1. Insert the microSD card into the Raspberry Pi 4
2. Connect an Ethernet cable
3. Connect a monitor via micro-HDMI or use serial console via GPIO pins
4. Power on the Pi

The default credentials are typically `root` with a predefined password or cloud-init configuration.

## Configure Network and Register

```bash
# Set the hostname
sudo hostnamectl set-hostname rpi4-rhel

# Register with Red Hat
sudo subscription-manager register --username your_username --password your_password
sudo subscription-manager attach --auto

# Update the system
sudo dnf update -y
```

## Configure Wi-Fi (Optional)

```bash
# Wi-Fi on Raspberry Pi 4 requires firmware from linux-firmware
sudo dnf install -y linux-firmware

# Reboot to load the firmware
sudo reboot

# After reboot, configure Wi-Fi with nmcli
sudo nmcli device wifi list
sudo nmcli device wifi connect "YourSSID" password "YourPassword"
```

## Verify System Information

```bash
# Check the running kernel
uname -a

# View hardware information
cat /proc/device-tree/model
# Output: Raspberry Pi 4 Model B Rev 1.4

# Check memory
free -h

# Check storage
df -h /
```

## Performance Considerations

The Raspberry Pi 4 has limited I/O bandwidth compared to server hardware. For better performance:

```bash
# Use a USB 3.0 SSD instead of a microSD card for the root filesystem
# Boot from SD, then move root to SSD using:
sudo dnf install -y rsync
# (Follow the standard root migration process)
```

Running RHEL on a Raspberry Pi 4 gives you a fully supported enterprise Linux environment on affordable hardware, ideal for edge deployments and prototyping.
