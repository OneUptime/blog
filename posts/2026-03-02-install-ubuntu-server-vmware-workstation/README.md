# How to Install Ubuntu Server on VMware Workstation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VMware, Virtualization, Installation, Server

Description: A complete guide to installing Ubuntu Server on VMware Workstation, including VM configuration, storage options, network modes, and VMware Tools installation.

---

VMware Workstation is one of the most capable desktop hypervisors available, supporting advanced features like snapshots, cloning, linked clones, and VM teams. Installing Ubuntu Server in VMware Workstation gives you a fully isolated server environment on your workstation that can be paused, snapshotted, and cloned at will. This makes it ideal for testing, development, and learning server administration without touching production systems.

## Prerequisites

- VMware Workstation Pro 17 or later (or Workstation Player for non-commercial use)
- Ubuntu Server 24.04 LTS ISO downloaded from ubuntu.com
- At least 4 GB RAM and 40 GB free disk space on the host

## Creating the Virtual Machine

Open VMware Workstation and click "Create a New Virtual Machine".

### Setup Type

Choose "Custom (advanced)" for full control over VM settings. The Typical option works but auto-detects settings that you should verify anyway.

### Installer Disk Image

Select "Installer disc image file (ISO)" and browse to your Ubuntu Server ISO. VMware will detect it as Ubuntu and offer Easy Install, which fills in some settings automatically. Skip Easy Install - it can create configurations that differ from what you want. Choose "I will install the operating system later" so you have full control, then attach the ISO later.

### Guest OS Selection

- Guest operating system: Linux
- Version: Ubuntu 64-bit

### VM Name and Location

Choose a descriptive name like `ubuntu-server-24.04` and a location with enough free disk space.

### Processor Configuration

For a server VM used for testing:
- Number of processors: 1
- Number of cores per processor: 2

For CPU-intensive workloads (database, compilation):
- Number of processors: 2
- Cores per processor: 2

### Memory

- Minimum: 1 GB (installer runs but slowly)
- Recommended: 2-4 GB
- Database/app servers: 4-8 GB

### Network Type

This is the most important decision for usability:

**NAT (default)**: The VM shares the host's IP through VMware's NAT. The VM can reach the internet but is not directly accessible from the local network. Fine for most testing.

**Bridged**: The VM gets its own IP from your router's DHCP. Other machines on the network can reach the VM directly. Required if you need the VM accessible from other devices.

**Host-only**: The VM can only talk to the host machine. Good for isolated testing environments.

For a server VM you want to SSH into from your host, any mode works, but Bridged or NAT with port forwarding is most convenient.

### Disk Configuration

**Disk type**: NVMe is the most performant option on modern hardware. SCSI and SATA are also fine.

**Disk size**: 40 GB minimum, 80 GB recommended.

**Store as single file vs split**: For performance, single file is marginally faster. Split into 2 GB files makes moving the VM easier. Choose based on your needs.

**Disk space allocation**: Do not pre-allocate unless you need guaranteed performance. Thin provisioning (space allocated as needed) is fine for most uses.

### Finishing VM Setup

Click "Customize Hardware" before finishing:

```
# Recommended hardware settings:
Memory: 2048 MB
Processors: 2 cores
Hard Disk: 40 GB NVMe (thin)
CD/DVD: Use your Ubuntu ISO
Network: NAT or Bridged
USB: USB 3.1 controller
Sound: Remove if not needed (saves overhead)
Printer: Remove
Display: Default
```

Remove the sound card and printer - they are unnecessary for a server.

## Installing Ubuntu Server

Power on the VM. The Ubuntu installer will boot from the ISO.

Follow the standard Ubuntu Server installation process:
1. Language: English
2. Keyboard: your layout
3. Installation type: Ubuntu Server
4. Network: DHCP is fine (configure static later)
5. Storage: Use entire disk with LVM
6. Profile: set hostname, username, password
7. SSH: enable OpenSSH server

During storage configuration, the installer will see your virtual disk as the only available device. The guided LVM setup is appropriate.

When installation completes, eject the ISO before rebooting. In VMware, go to VM - Settings - CD/DVD and uncheck "Connected", or set it to use the physical drive. Then reboot.

## Post-Install: VMware Tools

VMware Tools improves the VM's integration with the host: better performance, folder sharing, and cleaner shutdown behavior. On Ubuntu, install open-vm-tools from the repositories:

```bash
# Update package list
sudo apt update

# Install VMware Tools (open source version)
sudo apt install open-vm-tools -y

# Verify it is running
systemctl status open-vm-tools
```

The `open-vm-tools` package is preferred over VMware's proprietary tools package on Linux. It is maintained in Ubuntu's repositories and updates with the system.

## Network Configuration

### Finding the VM's IP (NAT Mode)

```bash
# On the Ubuntu VM
ip addr show ens33
# Look for the inet line - this is your VM's IP on VMware's virtual network
```

For NAT mode, the VM's IP is typically in the 192.168.x.x range assigned by VMware's NAT service.

### SSH from Host to VM (NAT Mode)

In NAT mode, SSH directly to the VM's IP:

```bash
# From your host machine
ssh username@192.168.x.x
```

This works because your host is on the same VMware NAT network.

### Static IP Configuration

For a server VM, a static IP makes SSH access predictable. Edit Netplan:

```bash
# Find your network interface name
ip link show

# Edit netplan config
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    ens33:
      dhcp4: no
      addresses:
        - 192.168.62.100/24    # Use an IP in VMware's NAT subnet
      routes:
        - to: default
          via: 192.168.62.2    # VMware NAT gateway (usually .2)
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

```bash
# Apply the changes
sudo netplan apply
```

Find VMware's NAT subnet and gateway from the host:
- Windows: VMware - Edit - Virtual Network Editor
- Linux: `cat /etc/vmware/vmnet8/nat/nat.conf`

## Snapshots

One of VMware Workstation's best features for testing. Take a snapshot before any risky change:

```bash
# From VMware UI: VM - Snapshot - Take Snapshot
# Give it a descriptive name: "Clean install - before nginx"
```

To revert to a snapshot if something breaks:
```
VM - Snapshot - Snapshot Manager - select snapshot - Go To
```

Snapshots capture the entire VM state including RAM (if taken while running), so you can restore to exactly where you were.

## Cloning VMs

Once you have a working Ubuntu Server VM, clone it for new projects rather than installing from scratch:

- VM - Manage - Clone
- Choose "Create a full clone" for an independent copy
- Name it based on the project

Cloning takes a minute and gives you a fully configured starting point.

## Shared Folders

VMware Workstation supports shared folders between host and guest, useful for moving files:

1. VM - Settings - Options - Shared Folders
2. Add a host path to share
3. In the VM, the share appears at `/mnt/hflys/<sharename>`

```bash
# Verify shared folder is accessible (requires open-vm-tools)
ls /mnt/hgfs/
```

If the directory is empty, ensure the vmhgfs kernel module is loaded:

```bash
vmware-hgfsclient
sudo mount -t fuse.vmhgfs-fuse .host:/ /mnt/hgfs -o allow_other
```

## Performance Tips

```bash
# Disable the swap file if you have given the VM enough RAM
sudo swapoff -a
# Comment out the swap entry in /etc/fstab

# Use the paravirtual SCSI adapter for better disk I/O
# Set in VM Settings - Hard Disk - Advanced - Bus type: Paravirtual

# Enable memory ballooning by ensuring open-vm-tools is running
systemctl status vmtoolsd
```

VMware Workstation is an excellent platform for Ubuntu Server development and testing. The snapshot and clone features alone save enormous amounts of time compared to reinstalling from scratch each time.
