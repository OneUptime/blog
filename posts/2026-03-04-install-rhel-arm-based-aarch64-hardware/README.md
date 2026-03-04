# How to Install RHEL on ARM-Based (aarch64) Hardware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ARM, aarch64, Installation, Linux

Description: Install Red Hat Enterprise Linux on ARM-based (aarch64) hardware, including server platforms and development boards that support the UEFI boot standard.

---

RHEL provides full support for the aarch64 (ARM 64-bit) architecture, covering server-class ARM hardware from vendors like Ampere, Marvell, and Fujitsu, as well as cloud instances from AWS (Graviton) and Oracle (Ampere A1). This guide covers the installation process for physical ARM hardware.

## Download the RHEL aarch64 ISO

```bash
# Log into the Red Hat Customer Portal
# Navigate to: https://access.redhat.com/downloads/content/rhel
# Select "Red Hat Enterprise Linux 9" and architecture "aarch64"
# Download the DVD ISO or Boot ISO
```

## Create a Bootable USB Drive

From a Linux workstation, write the ISO to a USB drive.

```bash
# Identify the USB device (be very careful to select the right device)
lsblk

# Write the ISO to the USB drive (replace /dev/sdX with your device)
sudo dd if=rhel-9.4-aarch64-dvd.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

## Boot from USB on ARM Hardware

ARM servers typically use UEFI firmware. Access the firmware setup or boot menu:

1. Connect a serial console or BMC/IPMI interface
2. Power on the server and enter the UEFI boot menu
3. Select the USB drive as the boot device
4. The RHEL installer (Anaconda) will start

## Install via Serial Console

Many ARM servers use serial console instead of a graphics adapter.

```bash
# If using a serial console, append console parameters to the boot command
# In the GRUB menu, press 'e' to edit the boot entry and add:
console=ttyAMA0,115200n8
```

## Network-Based Installation (PXE)

For data center deployments, PXE boot is common.

```bash
# Set up a TFTP server with the aarch64 boot files
# The GRUB EFI binary for ARM is grubaa64.efi
sudo cp /path/to/rhel9-aarch64/EFI/BOOT/BOOTAA64.EFI /var/lib/tftpboot/

# Configure the DHCP server to point to the ARM bootloader
# In dhcpd.conf:
# if option architecture-type = 00:0b {
#     filename "BOOTAA64.EFI";
# }
```

## Post-Installation Verification

```bash
# Verify the architecture after installation
uname -m
# Output: aarch64

# Check the RHEL version
cat /etc/redhat-release

# Verify hardware details
lscpu | grep -E "Architecture|Model name|CPU"

# Register the system
sudo subscription-manager register --username your_username --password your_password
sudo subscription-manager attach --auto

# Update the system
sudo dnf update -y
```

## Enable Additional Repositories

```bash
# Enable the CodeReady Builder repository for development packages
sudo subscription-manager repos --enable=codeready-builder-for-rhel-9-aarch64-rpms

# Verify enabled repos
sudo dnf repolist
```

RHEL on aarch64 provides the same package ecosystem and lifecycle as the x86_64 version, making it straightforward to deploy ARM-based infrastructure alongside existing x86 systems.
