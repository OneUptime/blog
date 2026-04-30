# How to Install Harvester with USB Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, USB Boot

Description: A complete guide to creating a bootable Harvester USB drive and performing an installation on bare metal servers.

## Introduction

USB boot is the most straightforward method to install Harvester on physical servers. It requires minimal infrastructure - just a USB drive and the Harvester ISO. This method is particularly useful for initial cluster setup, lab environments, or situations where network booting isn't available. This guide covers USB creation on Linux, macOS, and Windows, followed by the full installation walkthrough.

## Prerequisites

- Harvester ISO downloaded from the [official releases](https://github.com/harvester/harvester/releases)
- A USB drive with at least 8 GB capacity (all data will be erased)
- Target server meeting Harvester hardware requirements:
  - 8+ CPU cores with virtualization extensions
  - 32 GB+ RAM
  - 250 GB+ SSD for OS
  - A separate data disk for VM storage is recommended

## Step 1: Download the Harvester ISO

```bash
# Download a supported Harvester release

HARVESTER_VERSION="v1.7.1"
wget https://releases.rancher.com/harvester/${HARVESTER_VERSION}/harvester-${HARVESTER_VERSION}-amd64.iso

# Verify the SHA512 checksum to ensure file integrity
wget https://releases.rancher.com/harvester/${HARVESTER_VERSION}/harvester-${HARVESTER_VERSION}-amd64.sha512
grep " harvester-${HARVESTER_VERSION}-amd64\\.iso$" \
    harvester-${HARVESTER_VERSION}-amd64.sha512 | sha512sum -c -
```

## Step 2: Create a Bootable USB Drive

### On Linux

```bash
# Identify your USB device - look for the device that matches your USB capacity
lsblk -d -o NAME,SIZE,MODEL

# Example output:
# NAME    SIZE MODEL
# sda   500GB Samsung SSD
# sdb     16GB SanDisk Ultra

# Write the ISO to the USB drive (replace /dev/sdb with your actual device)
# WARNING: This will erase all data on the selected device
sudo dd if=harvester-v1.7.1-amd64.iso \
        of=/dev/sdb \
        bs=4M \
        status=progress \
        oflag=sync

# Sync to ensure all data is written before removing the drive
sync
```

### On macOS

```bash
# List disks to find your USB drive
diskutil list

# Unmount the USB drive (replace diskN with your disk number)
diskutil unmountDisk /dev/diskN

# Write the ISO using dd
sudo dd if=harvester-v1.7.1-amd64.iso \
        of=/dev/rdiskN \
        bs=4m

# Eject the drive safely
diskutil eject /dev/diskN
```

### On Windows

Use the free tool **Rufus** to create the bootable USB:

1. Download [Rufus](https://rufus.ie/) and run it (no installation required)
2. Under **Device**, select your USB drive
3. Under **Boot selection**, click **SELECT** and choose the Harvester ISO
4. Set **Partition scheme** to **GPT**
5. Leave other settings at defaults
6. Click **START** and confirm the warning about data erasure
7. Wait for Rufus to complete the process

## Step 3: Configure Server BIOS/UEFI

Before booting, configure the server firmware settings:

```text
BIOS/UEFI Settings to Configure:
├── Virtualization Technology (VT-x / AMD-V)  → ENABLED
├── VT-d / IOMMU                               → ENABLED (for PCI passthrough)
├── Secure Boot                                → DISABLED
├── Boot Mode                                  → UEFI
├── Boot Priority                              → USB Drive first
└── Wake on LAN                               → ENABLED (optional)
```

### Common Key Combos for BIOS Access:
- Dell: F2 or F12
- HP: F9 or F10
- Supermicro: Del or F11
- Lenovo: F1 or F2

## Step 4: Boot from USB and Start Installation

1. Insert the USB drive into the server
2. Power on and press the boot menu key (usually F12)
3. Select the USB device from the boot menu
4. The Harvester GRUB menu loads - select **Harvester Installer**

## Step 5: Navigate the Interactive Installer

The Harvester installer uses a text-based UI (TUI). Use arrow keys to navigate and Enter to select.

### Select Installation Mode

```text
┌─────────────────────────────────┐
│  Installation Mode              │
│                                 │
│  > Create a new Harvester       │
│    cluster                      │
│    Join an existing Harvester   │
│    cluster                      │
└─────────────────────────────────┘
```

Choose **Create a new Harvester cluster** for the first node.

### Configure Management Network

```yaml
# Example network configuration during installation
Interface: eth0
IP Configuration: Static
IP Address: 192.168.1.10
Subnet Mask: /24 (255.255.255.0)
Default Gateway: 192.168.1.1
DNS Servers: 8.8.8.8, 8.8.4.4
```

### Set the Cluster VIP

The Virtual IP provides a stable endpoint for the Harvester API and UI:

```text
Cluster VIP: 192.168.1.100
VIP Mode: Static

# This IP must be:
# - On the same subnet as the management network
# - Free from any other DHCP or static assignments
# - Reachable from your workstation
```

### Select the Installation Disk

Choose the disk for the Harvester OS:

```text
Available Disks:
  /dev/sda  - 250 GB  Samsung 870 EVO  [RECOMMENDED - OS disk]
  /dev/sdb  - 2 TB    Seagate Barracuda  [Will be used for VM storage]
  /dev/sdc  - 2 TB    Seagate Barracuda  [Will be used for VM storage]

Select: /dev/sda
```

### Set the Node Password

```text
Node Password (SSH user rancher):  ●●●●●●●●●●●●
Confirm Password:                   ●●●●●●●●●●●●
```

## Step 6: Confirm and Install

Review the configuration summary and confirm the installation. The installer will:

1. Partition and format the selected installation disk
2. Prepare the selected data disk, if configured, for VM storage
3. Install the Harvester OS
4. Configure RKE2 Kubernetes
5. Deploy Harvester system components
6. Deploy Longhorn system components
7. Reboot the node

**Estimated time: 10–20 minutes**

## Step 7: Post-Installation Access

After the server reboots, remove the USB drive. The Harvester console will display the management URL and node status:

```text
Dashboard URL: https://192.168.1.100
Node Status:   Ready
```

Open the dashboard URL in a browser and set the password for the default `admin` user on first login. SSH access uses the `rancher` user and the node password set during installation:

```bash
ssh rancher@192.168.1.10
```

## Step 8: Verify the Installation

```bash
# SSH into the node and verify cluster health
ssh rancher@192.168.1.10

# Check Kubernetes node status
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get nodes

# Check all system pods are running
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get pods -A

# Check Longhorn storage health
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml \
    get nodes.longhorn.io -n longhorn-system
```

## Common Issues and Fixes

**USB not detected during boot:**
- Try a different USB port (prefer USB 2.0 ports for compatibility)
- Try a different USB drive brand
- Verify the ISO checksum with `sha512sum`

**Installation fails partway through:**
- Check disk health: `smartctl -a /dev/sda`
- Ensure the OS disk has no existing LVM or RAID metadata: `wipefs -a /dev/sda`

**Node stuck at boot after installation:**
- Verify the server is configured for UEFI boot and that it matches the mode used during installation
- Check that the USB drive was removed before reboot

## Conclusion

Installing Harvester via USB boot is a reliable and straightforward process. Once you've installed the first node using a USB drive, additional nodes can be added either via USB or iPXE for a more scalable approach. The USB installation method gives you full interactive control over the configuration, making it ideal for initial deployments and environments where network boot infrastructure isn't available.
