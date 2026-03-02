# How to Install Proxmox VE on Ubuntu Hardware

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Proxmox, Virtualization, KVM, Server Administration

Description: Step-by-step guide to installing Proxmox VE on existing Ubuntu-compatible hardware, including hardware requirements, installation, initial configuration, and network setup.

---

Proxmox VE (Virtual Environment) is an open-source hypervisor platform built on Debian that provides a web-based interface for managing KVM virtual machines and LXC containers. If you have server hardware running Ubuntu or just Ubuntu-compatible hardware, you can run Proxmox VE on it to create a powerful virtualization platform without paying for VMware or Hyper-V licensing.

It's worth clarifying upfront: Proxmox VE is not installed on top of Ubuntu - it runs on Debian. The "Ubuntu hardware" in this context means hardware that Ubuntu supports, which Proxmox VE (being Debian-based) also supports. This guide covers installing Proxmox VE fresh on bare metal that you may have previously used for Ubuntu.

## Hardware Requirements

Before starting, verify your hardware meets these requirements:

- **CPU**: Intel or AMD 64-bit processor with hardware virtualization (Intel VT-x or AMD-V). Check BIOS settings to ensure it's enabled.
- **RAM**: Minimum 2GB, but 8GB+ is practical. Each VM needs its own RAM allocation.
- **Storage**: At least 32GB for the Proxmox system itself. SSDs are strongly recommended.
- **Network**: At least one network interface card (NIC). Dual NICs are better for separating management and VM traffic.

Check CPU virtualization support:

```bash
# On your current Ubuntu system before migration
grep -E '(vmx|svm)' /proc/cpuinfo | head -5
# vmx = Intel VT-x, svm = AMD-V
# If no output, virtualization may be disabled in BIOS

# Also check with
lscpu | grep Virtualization
```

## Downloading Proxmox VE

Download the Proxmox VE ISO from the official site. As of early 2026, the current stable release is Proxmox VE 8.x (based on Debian 12 Bookworm).

```bash
# Download the ISO (do this on another machine or use wget)
wget https://enterprise.proxmox.com/iso/proxmox-ve_8.2-1.iso

# Verify the checksum
sha256sum proxmox-ve_8.2-1.iso
# Compare with the checksum published on the Proxmox download page
```

## Creating a Bootable USB Drive

```bash
# Find your USB device
lsblk
# Look for your USB drive, e.g., /dev/sdb

# Write the ISO to the USB drive (this erases all data on the USB)
sudo dd if=proxmox-ve_8.2-1.iso of=/dev/sdb bs=4M status=progress conv=fsync

# Sync to ensure write completes
sync
```

On macOS, use `diskutil list` to find the drive and use the same `dd` command.

## BIOS/UEFI Configuration

Before booting from USB, configure the BIOS/UEFI:

1. Enable Intel VT-x or AMD-V (CPU virtualization extension)
2. Enable VT-d or AMD-Vi (IOMMU - needed for PCI passthrough)
3. Set the USB drive as the first boot device
4. Disable Secure Boot if it causes issues (Proxmox VE may require this on some hardware)

## Installing Proxmox VE

Boot from the USB drive. The installer is graphical and relatively straightforward:

### Installation Steps

1. **Select Install Proxmox VE** from the boot menu
2. **Accept the EULA**
3. **Select target hard disk**: Choose the disk to install Proxmox on. This will erase the disk. For better performance with the VM storage backend:
   - Click "Options" to configure the filesystem
   - For SSDs: Choose `ext4` or `xfs`
   - For advanced setups: `ZFS` (mirrors or RAIDZ) provides data integrity and snapshots, but requires more RAM

4. **Configure locale and timezone**

5. **Set the admin password and email**: The `root` password is used for both the web interface and SSH.

6. **Network configuration**:
   - Hostname: Use a fully-qualified domain name like `pve1.yourdomain.com`
   - IP Address: Set a static IP (DHCP is not recommended for server management interfaces)
   - Gateway and DNS: Fill in your network settings

7. **Review settings and install**

The installation takes 5-10 minutes. When complete, remove the USB drive and reboot.

## First Boot and Web Interface Access

After reboot, Proxmox VE starts automatically. Access the web interface:

```
https://<your-proxmox-ip>:8006
```

Use `root` and the password you set during installation. You'll see a warning about a self-signed certificate - this is expected. You can replace it with a proper certificate later.

## Configuring the Repository Sources

By default, Proxmox VE is configured to use the enterprise repository, which requires a paid subscription. For a home lab or testing environment, switch to the free community repository:

```bash
# SSH into the Proxmox host or use the web shell
# Disable the enterprise repository
echo "# Enterprise repo disabled - requires subscription" > /etc/apt/sources.list.d/pve-enterprise.list

# Add the free community repository
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" > /etc/apt/sources.list.d/pve-community.list

# Also disable the Ceph enterprise repo if present
echo "# Ceph enterprise repo disabled" > /etc/apt/sources.list.d/ceph.list

# Update package lists
apt-get update && apt-get dist-upgrade -y
```

## Configuring Network Bridges

Proxmox VE uses Linux bridges to connect VMs to the network. The installer creates `vmbr0` automatically. Verify and configure it:

```bash
# View network configuration
cat /etc/network/interfaces
```

A typical configuration looks like:

```
# Loopback interface
auto lo
iface lo inet loopback

# Physical NIC - no IP assigned directly
auto eno1
iface eno1 inet manual

# Bridge for VM connectivity
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.100/24
    gateway 192.168.1.1
    bridge-ports eno1
    bridge-stp off
    bridge-fd 0

# Optional: Additional bridge for internal VM-to-VM traffic only
auto vmbr1
iface vmbr1 inet static
    address 10.10.0.1/24
    bridge-ports none
    bridge-stp off
    bridge-fd 0
```

Apply changes:

```bash
systemctl restart networking
# Or without disconnecting your SSH session:
ifreload -a
```

## Configuring Storage

Proxmox VE needs storage pools to hold VM disk images, ISO files, and backups.

### Adding a Local Directory Storage

```bash
# From the Proxmox web interface:
# Datacenter > Storage > Add > Directory
# Or via CLI:
pvesm add dir local-backup --path /mnt/backup --content backup,iso
```

### Adding an NFS Storage

```bash
# Add NFS share for VM images or backups
pvesm add nfs nas-storage \
    --server 192.168.1.50 \
    --export /volume1/proxmox \
    --content images,backup,iso \
    --options vers=4
```

### Creating a ZFS Pool (if using ZFS)

```bash
# List available disks for ZFS (disks not already in use)
lsblk

# Create a ZFS mirror pool with two drives
zpool create -f vm-pool mirror /dev/sdb /dev/sdc

# Add the ZFS pool to Proxmox storage
pvesm add zfspool vm-zfs-pool --pool vm-pool --content images,rootdir
```

## Disabling Subscription Nag

The free version shows a subscription nag message on login. Remove it:

```bash
# Backup the original file
cp /usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js /usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js.bak

# Replace the subscription check with a no-op
sed -i "s/Ext.Msg.show({/void({/" /usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js

# Restart the proxy to apply
systemctl restart pveproxy
```

This change may need to be reapplied after updates.

## Uploading ISO Images

To create VMs, you need ISO images in Proxmox storage:

```bash
# Via CLI - download directly to Proxmox storage
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.4-live-server-amd64.iso \
    -P /var/lib/vz/template/iso/

# Or via web interface:
# local storage > ISO Images > Upload or Download from URL
```

## Basic Hardening

Before putting Proxmox in production:

```bash
# Change SSH to a non-standard port
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
systemctl restart sshd

# Install and configure fail2ban
apt-get install -y fail2ban

# Set up firewall rules via Proxmox's built-in firewall
# Datacenter > Firewall > Add rules to restrict access to port 8006
# Or configure nftables/iptables directly
```

## Summary

Installing Proxmox VE on standard server hardware gives you an enterprise-grade hypervisor at zero licensing cost. The installation process is simple - create a bootable USB, configure BIOS for virtualization, run the graphical installer, and configure storage and networking for your environment.

With Proxmox VE running, you can create KVM VMs and LXC containers through the web interface, set up clustering for high availability, and manage backups - all from a single browser tab.
