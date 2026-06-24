# How to Run RHEL on Raspberry Pi 4 Using the aarch64 Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Raspberry Pi, AArch64, ARM, Linux

Description: Install and run RHEL on a Raspberry Pi 4 using the official aarch64 image for development, testing, or edge computing use cases.

---

Red Hat provides RHEL for ARM 64 on aarch64 systems, but it does not provide a Raspberry Pi 4-specific SD card image. Red Hat recommends certified RHEL for ARM 64 hardware for supported deployments; Raspberry Pi 4 use should be treated as an experimental setup that depends on compatible UEFI firmware and the standard ARM installer rather than the KVM guest image.

## Prerequisites

- Raspberry Pi 4 Model B with 4GB or 8GB RAM
- MicroSD card for Raspberry Pi firmware and a USB drive or SSD for installation media/storage
- Active RHEL subscription
- Ethernet connection
- Compatible Raspberry Pi 4 UEFI firmware

## Download the RHEL Image

```bash
# From the Red Hat Customer Portal, download the RHEL installer for ARM

# Navigate to: https://access.redhat.com/downloads/content/rhel
# Select architecture: aarch64
# Download the Boot ISO or Binary DVD ISO for RHEL for ARM 64

# Do not write the KVM Guest Image directly to a Raspberry Pi microSD card.
# Red Hat documents KVM guest images as qcow2 VM images that use cloud-init.
```

## Write the Image to a MicroSD Card

```bash
# On a Linux workstation, identify the target USB installer device
lsblk

# Write the installer ISO to the USB device
# Replace /dev/sdX with your actual device
sudo dd if=rhel-9.4-aarch64-boot.iso of=/dev/sdX bs=4M status=progress conv=fsync

# Sync and eject
sync
```

## Expand the Root Partition

If you install to a larger target disk and need to expand an XFS root filesystem later, grow the partition first and then grow the mounted filesystem.

```bash
# Replace 3 with the actual root partition number
sudo parted /dev/sdX --script resizepart 3 100%

# Then, after booting the Pi, expand the filesystem
sudo xfs_growfs /
```

## First Boot Setup

1. Insert the microSD card into the Raspberry Pi 4
2. Connect an Ethernet cable
3. Connect the RHEL installer USB drive or installation target
4. Power on the Pi

Use the RHEL installer to create the root password or user account. KVM guest images do not have a default root password; they use cloud-init and the `cloud-user` account when launched in a supported VM environment.

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
# Wi-Fi support depends on the firmware and drivers available for the running kernel
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

Running RHEL on a Raspberry Pi 4 can be useful for experiments and prototyping, but it should not be described as a fully supported enterprise deployment unless the hardware and boot environment are covered by Red Hat's RHEL for ARM 64 support requirements.
