# How to Install Ubuntu Server on an IBM Z (s390x) Mainframe

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, IBM Z, S390x, Mainframe, Enterprise

Description: A guide to installing Ubuntu Server on IBM Z (zSeries) mainframe systems in s390x architecture, covering LPAR setup, z/VM, and KVM on IBM Z configurations.

---

IBM Z mainframes represent the pinnacle of enterprise computing reliability - designed for continuous availability, cryptographic acceleration built into the CPU, and hardware-based virtualization that can run thousands of concurrent workloads on a single system. Ubuntu has supported s390x (IBM Z architecture) as an official port since Ubuntu 16.04, and Ubuntu 24.04 LTS maintains full s390x support. This makes Ubuntu a viable choice for Linux workloads on IBM Z systems, including z/VM guests and KVM virtual machines.

## IBM Z Architecture Overview

IBM Z (formerly zSeries, System z, z/Architecture) runs on 64-bit s390x architecture. Key concepts:

- **LPAR (Logical Partition)**: Hardware-level partitioning of the mainframe; each LPAR behaves like an independent system
- **z/VM**: IBM's hypervisor that runs in an LPAR and can host hundreds of Linux virtual machines
- **KVM on IBM Z**: Open-source KVM hypervisor running on an IBM Z LPAR; supports running standard Linux VMs
- **HMC (Hardware Management Console)**: The web-based management interface for IBM Z systems
- **SE (Support Element)**: The built-in management processor in each IBM Z frame

Ubuntu on IBM Z typically runs as:
1. A z/VM guest (traditional mainframe Linux)
2. A KVM guest under KVM on IBM Z
3. A Linux on LPAR (LINUXONLY or z/VM) in a LPAR directly

## s390x Installation Media

Ubuntu does not provide a traditional bootable ISO for s390x. Instead, the IBM Z port provides:

- A **kernel** and **initrd** for network boot (the primary installation method)
- A generic image for z/VM and KVM guests

```bash
# Download s390x Ubuntu installation kernel and initrd
wget https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-live-server-s390x.iso

# For network boot specifically:
# kernel: ubuntu-installer/s390x/linux
# initrd: ubuntu-installer/s390x/initrd.gz
```

## Installing Ubuntu as a z/VM Guest

### Prerequisites

- An IBM Z system with z/VM installed
- A z/VM guest definition (virtual machine) created
- DASD (Direct Access Storage Device) or SCSI storage allocated to the guest
- Network connectivity from the z/VM guest

### Define the z/VM Guest

From the z/VM XEDIT or SMAPI interface, define a virtual machine. A minimal definition in DIRECTORY ENTRY format:

```text
IDENTITY UBUNTU1 password 512M 4G G
  ACCOUNT usergroup billing-code
  CPU 00 BASE
  CPU 01
  CPU 02
  CPU 03
  MEMORY DEFINE 4096M
  SPOOL 000C 2540 READER
  SPOOL 000D 2540 PUNCH
  SPOOL 000E 1403 PRINTER
  LINK MAINT 190 190 RR
  LINK MAINT 19E 19E RR
  LINK MAINT 19D 19D RR
  MDISK 0100 3390 1 5 USER01 MR READ WRITE MULT
  MDISK 0101 3390 6 10 USER01 MR READ WRITE MULT
  NICDEF 0600 TYPE QDIO LAN SYSTEM VSW1 MACID 111111
```

This defines a guest with:
- 4 CPUs
- 4 GB memory
- Two DASD disks (3390 type)
- One virtual NIC connected to VSW1 (virtual switch)

### Network Boot

IBM Z installations are almost always done via network boot (IPL from network). Set up a netboot server with the Ubuntu s390x kernel and initrd:

```bash
# On your netboot server (x86_64 Ubuntu with TFTP)
sudo apt install tftpd-hpa

# Download and place the s390x installer files
sudo mkdir -p /srv/tftp/ubuntu-s390x
cd /srv/tftp/ubuntu-s390x

# Mount the s390x ISO and extract netboot files
sudo mount ubuntu-24.04-live-server-s390x.iso /mnt
sudo cp /mnt/casper/vmlinuz .
sudo cp /mnt/casper/initrd .
sudo umount /mnt
```

Configure a boot script (`parmfile`) that the IBM Z bootloader reads:

```bash
# parmfile for network installation
cat > /srv/tftp/ubuntu-s390x/parmfile << 'EOF'
ip=dhcp
console=ttyS0
quiet
EOF
```

### Booting the z/VM Guest

From the z/VM console, boot the guest using the network or from a punched card reader:

```text
/* IPL the guest from the TFTP server */
VMFIPLD UBUNTU1 PROFILE EXEC
/* Or use the HMC to load the kernel/initrd */
```

More commonly, use the HMC's "Load from Removable Media or Server" option for the LPAR.

## Installing Ubuntu as a KVM Guest on IBM Z

KVM on IBM Z allows running standard KVM virtual machines with hardware virtualization acceleration. A z/VM LPAR running Linux with KVM can host many Ubuntu VMs.

### Setting Up the KVM Host

First, an IBM Z LPAR must run Linux (Ubuntu or RHEL) as the KVM host. Ensure the LPAR has the `AP` (adjunct processor, for cryptography) and `z/Architecture` facilities enabled.

```bash
# On the IBM Z KVM host, install KVM tools
sudo apt install qemu-kvm libvirt-daemon-system virtinst

# Verify KVM acceleration is available (requires LPAR with appropriate features)
ls -la /dev/kvm
# Should exist if KVM is available

# Check available features
cat /proc/cpuinfo | grep features
```

### Creating an Ubuntu VM on KVM/Z

```bash
# Create a disk image for the guest
qemu-img create -f qcow2 /var/lib/libvirt/images/ubuntu-s390x-guest.qcow2 40G

# Install Ubuntu using virt-install (the guest will also be s390x)
sudo virt-install \
    --name ubuntu-s390x-vm1 \
    --ram 2048 \
    --vcpus 2 \
    --arch s390x \
    --machine s390-ccw-virtio \
    --disk path=/var/lib/libvirt/images/ubuntu-s390x-guest.qcow2,bus=virtio \
    --cdrom /path/to/ubuntu-24.04-live-server-s390x.iso \
    --network network=default,model=virtio \
    --graphics none \
    --console pty,target_type=sclp \
    --os-variant ubuntu24.04
```

IBM Z KVM uses `virtio` for all I/O devices - no emulated legacy hardware. The console type is `sclp` (System Console for Linux on POWER and Z).

## DASD Configuration

IBM Z uses DASD (Direct Access Storage Device) for disk storage, presented as channel-attached devices. In an z/VM guest or LPAR, DASD appears as `/dev/dasdX` devices.

```bash
# List available DASD devices
lsdasd

# Format a DASD device (low-level format required before use)
sudo dasdfmt -b 4096 -d cdl -y /dev/dasda

# Partition the DASD
sudo fdasd /dev/dasda
# In the fdasd menu, create native Linux partitions

# The partition naming is different from SCSI:
# /dev/dasda  = raw device
# /dev/dasda1 = first partition
```

### DASD Partition Layout

```bash
# Format partitions after fdasd
sudo mkfs.ext4 /dev/dasda1   # /boot
sudo mkfs.ext4 /dev/dasda2   # /
sudo mkswap /dev/dasda3      # swap

# Verify
lsblk /dev/dasda
```

## Bootloader Configuration

IBM Z uses z/IPL (Initial Program Load) instead of GRUB for the initial boot. The bootloader is `zipl`:

```bash
# Install zipl bootloader
sudo zipl -V

# zipl configuration
cat /etc/zipl.conf
```

A typical `/etc/zipl.conf`:

```ini
[defaultboot]
default=ubuntu

[ubuntu]
image=/boot/vmlinuz
ramdisk=/boot/initrd.img
parameters="root=/dev/dasda2 ro quiet"
target=/boot/zipl
```

```bash
# Apply zipl configuration after kernel updates
sudo zipl
```

The Ubuntu package manager (`apt`) runs `zipl` automatically during kernel upgrades through the `linux-s390x` package post-install hooks.

## Networking on IBM Z

IBM Z networking uses HiperSockets (extremely low-latency internal network between LPARs) and OSA-Express (Ethernet) cards.

```bash
# List network interfaces on IBM Z
ip link show

# IBM Z interfaces may appear as:
# enc600 (channel 0600 - OSA-Express)
# enc900 (HiperSocket)

# Configure with Netplan
sudo tee /etc/netplan/00-ibmz-network.yaml << 'EOF'
network:
  version: 2
  ethernets:
    enc600:
      dhcp4: false
      addresses:
        - 10.0.1.50/24
      routes:
        - to: default
          via: 10.0.1.1
      nameservers:
        addresses: [10.0.1.1, 8.8.8.8]
EOF

sudo netplan apply
```

## IBM Z Cryptographic Acceleration

IBM Z CPUs include built-in cryptographic hardware accelerators. Ubuntu's OpenSSL automatically uses them when available:

```bash
# Check for IBM Z crypto hardware
lszcrypt

# List available crypto cards and domains
lszcrypt -V

# Verify OpenSSL uses hardware acceleration
openssl speed -engine ibmca aes-256-cbc 2>/dev/null

# Test crypto performance (hardware vs software)
openssl speed aes-256-cbc
```

The `libica` library exposes IBM Z crypto hardware to applications. Install it:

```bash
sudo apt install libica-utils

# List ICA hardware features
icainfo
```

## Post-Installation Verification

```bash
# Verify architecture
uname -m
# Output: s390x

dpkg --print-architecture
# Output: s390x

# Check running kernel
uname -r
# Output: 6.8.0-31-generic  (Ubuntu generic kernel for s390x)

# System information
cat /proc/sysinfo
# Shows LPAR name, capacity, system model, etc.

# Check LPAR information
cat /sys/hypervisor/type  # "zvm" or "kvm"
```

## IBM Z-Specific Tools

Ubuntu provides several IBM Z management tools in the repositories:

```bash
# Install IBM Z tools
sudo apt install s390-tools

# Tools included:
# lsdasd     - list DASD devices
# lszcrypt   - list cryptographic devices
# parmfile   - manage IPL parameter files
# zipl       - bootloader
# dbginfo.sh - collect debug information

# Collect system debug information
sudo /usr/share/s390-tools/dbginfo.sh
```

Running Ubuntu on IBM Z gives you access to mainframe-class RAS features - hardware error correction, redundant components, and sub-millisecond failover - while using standard Ubuntu tooling. The architecture is specialized, but Canonical's s390x port ensures that the same Ubuntu packages and workflows you know from x86_64 work on IBM Z.
