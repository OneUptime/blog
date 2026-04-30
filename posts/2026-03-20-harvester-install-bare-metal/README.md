# How to Install Harvester on Bare Metal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Bare Metal

Description: A step-by-step guide to installing Harvester HCI on bare metal servers for production hyperconverged infrastructure.

## Introduction

Harvester is an open-source hyperconverged infrastructure (HCI) solution built on Kubernetes. It combines compute, storage, and networking into a unified platform, making it ideal for running virtual machines alongside containerized workloads. Installing Harvester on bare metal gives you full hardware control and the best performance characteristics.

This guide walks you through the complete bare metal installation process, from pre-installation checks to a running Harvester cluster.

## Prerequisites

Before you begin, ensure you meet these hardware and software requirements:

**Minimum Hardware Requirements (per node):**
- CPU: 8 cores minimum for development/testing or 16 cores minimum for production, with hardware virtualization support (Intel VT-x or AMD-V)
- RAM: 32 GB minimum for development/testing or 64 GB minimum for production
- Storage: 250 GB minimum for development/testing (180 GB minimum when using multiple disks); 500 GB minimum for production
- Network: At least one NIC for the management network and one for VM workload traffic; additional NICs are recommended for redundancy and performance

**Software Requirements:**
- Harvester ISO (download from the [official releases page](https://github.com/harvester/harvester/releases))
- A USB drive (8 GB or larger) or a PXE boot environment

**Network Requirements:**
- A static IP address or DHCP reservation for the management network
- DNS servers for the nodes, and optionally a DNS record for the cluster VIP (Virtual IP) if you want name-based access
- NTP access for time synchronization

## Step 1: Download the Harvester ISO

Download the current stable Harvester ISO from the GitHub releases page:

```bash
# Example: replace this with the current stable release from the releases page
HARVESTER_VERSION=v1.7.1

# Download the Harvester AMD64 ISO
wget https://releases.rancher.com/harvester/${HARVESTER_VERSION}/harvester-${HARVESTER_VERSION}-amd64.iso

# Verify the checksum
wget https://releases.rancher.com/harvester/${HARVESTER_VERSION}/harvester-${HARVESTER_VERSION}-amd64.sha512
grep " harvester-${HARVESTER_VERSION}-amd64.iso$" harvester-${HARVESTER_VERSION}-amd64.sha512 | sha512sum -c -
```

## Step 2: Create Bootable Media

Use `dd` on Linux or Rufus on Windows to write the ISO to a USB drive:

```bash
# On Linux: Identify your USB device (replace /dev/sdX with your device)
lsblk

# If you opened a new shell, set the version again
HARVESTER_VERSION=v1.7.1

# Write the ISO to the USB drive (this will erase all data on the USB)
sudo dd if=harvester-${HARVESTER_VERSION}-amd64.iso of=/dev/sdX bs=64k status=progress oflag=sync
```

## Step 3: Configure BIOS/UEFI Settings

Before booting from the installation media, configure your server's BIOS/UEFI:

1. Enable hardware virtualization (Intel VT-x / AMD-V)
2. Enable IOMMU if you plan to use PCI passthrough
3. Set the boot order to boot from USB first
4. Use UEFI boot mode for new installations (legacy BIOS boot is deprecated in Harvester v1.7 and later)
5. Enable Wake-on-LAN if needed for remote management

## Step 4: Boot from Installation Media

1. Insert the USB drive into the server
2. Power on the server and enter the boot menu (typically F12, F10, or Del)
3. Select the USB drive as the boot device
4. The Harvester boot menu will appear - select **Harvester Installer**

## Step 5: Run the Interactive Installer

The Harvester installer is a text-based UI that guides you through the setup:

### Installation Mode
Choose **Create a new Harvester cluster** for the first node, or **Join an existing Harvester cluster** for additional nodes.

### Network Configuration
```text
# Example network settings for the management interface
Management Interface(s): eth0
IP Address:            192.168.1.10/24
Gateway:               192.168.1.1
DNS:                   8.8.8.8, 8.8.4.4
```

### Cluster VIP
The Virtual IP (VIP) is the highly available endpoint for the cluster API and UI:

```text
Cluster VIP: 192.168.1.100
```

This VIP must be on the same subnet as the management network and must not be assigned to any other device.

### Storage Configuration
Select the installation disk for Harvester and a data disk for VM storage. If you use a single disk for both, configure the persistent partition size in the installer.

```text
Installation Disk: /dev/sda  (250 GB SSD - for the Harvester OS)
Data Disk:         /dev/sdb  (recommended separate disk for VM data)
```

### Set Passwords
Configure the `rancher` user password for node SSH access. You will set the default `admin` user password the first time you log in to the Harvester UI.

## Step 6: Complete Installation

The installer will:
1. Partition and format the selected OS disk
2. Install the Harvester OS (built on SUSE Linux Micro)
3. Configure Kubernetes (RKE2) and all Harvester components
4. Reboot the node

Installation typically takes 10–20 minutes depending on hardware speed.

## Step 7: Access the Harvester UI

Once the node reboots, you can access the Harvester dashboard:

1. Open a browser and navigate to `https://<CLUSTER_VIP>`
2. Accept the self-signed certificate warning
3. On first login, set the password for the default `admin` user and then sign in

```bash
# Alternatively, access via kubectl from a management node
sudo cat /etc/rancher/rke2/rke2.yaml

# Verify cluster health
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get nodes
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get pods -A
```

## Step 8: Verify the Installation

After logging in, verify your cluster is healthy:

```bash
# Check all nodes are Ready
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get nodes -o wide

# Check Harvester system pods are running
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get pods -n harvester-system

# Check Longhorn storage is healthy
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get pods -n longhorn-system
```

In the UI, navigate to **Dashboard** and confirm:
- Node status shows **Ready**
- Storage shows available capacity
- No critical alerts are present

## Post-Installation Configuration

After the base installation, consider these next steps:

- **Add additional nodes** to increase capacity and redundancy
- **Configure backup targets** (NFS or S3) for VM backups
- **Set up VLAN networks** for VM network isolation
- **Integrate with Rancher** for advanced cluster management
- **Enable the `rancher-monitoring` add-on** if you want Prometheus/Grafana monitoring

## Conclusion

You now have a running single-node Harvester cluster on bare metal. While a single node is useful for development and testing, production deployments should use at least three nodes for high availability. The bare metal installation gives you full access to hardware capabilities including SR-IOV, PCI passthrough, and NUMA-aware scheduling. From here, you can start creating VM images, defining networks, and deploying virtual machines through the intuitive Harvester UI or Kubernetes-native APIs.
