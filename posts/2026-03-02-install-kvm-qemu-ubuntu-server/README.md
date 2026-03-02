# How to Install KVM and QEMU on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, QEMU, Virtualization

Description: A complete guide to installing and configuring KVM and QEMU on Ubuntu Server, including hardware verification, package installation, network setup, and running your first virtual machine.

---

KVM (Kernel-based Virtual Machine) combined with QEMU provides a production-grade hypervisor built directly into the Linux kernel. Unlike VMware or VirtualBox, KVM is a Type 1 hypervisor - it runs directly on the hardware with minimal overhead. This guide covers installing and verifying a working KVM stack on Ubuntu Server.

## Verifying Hardware Virtualization Support

Before installing anything, confirm your CPU supports hardware virtualization:

```bash
# Check for Intel VT-x or AMD-V virtualization support
grep -E --count '(vmx|svm)' /proc/cpuinfo

# A non-zero result means virtualization is supported
# vmx = Intel VT-x, svm = AMD-V
```

If the output is 0, virtualization extensions are either not supported or disabled in BIOS. Check your motherboard/server BIOS settings and look for "Intel Virtualization Technology", "VT-x", "AMD-V", or "SVM" and enable it.

```bash
# Alternative check using lscpu
lscpu | grep Virtualization

# Should show: Virtualization: VT-x (Intel) or AMD-V (AMD)
```

Also verify the KVM kernel module can load:

```bash
# Load KVM modules
sudo modprobe kvm
sudo modprobe kvm_intel   # For Intel CPUs
# OR
sudo modprobe kvm_amd     # For AMD CPUs

# Check modules are loaded
lsmod | grep kvm
```

## Installing KVM and Related Packages

```bash
sudo apt update
sudo apt install -y \
  qemu-kvm \
  libvirt-daemon-system \
  libvirt-clients \
  bridge-utils \
  virtinst \
  virt-manager \
  libguestfs-tools

# Package descriptions:
# qemu-kvm           - QEMU hypervisor with KVM acceleration
# libvirt-daemon-system - libvirt daemon and default config
# libvirt-clients    - virsh and other libvirt client tools
# bridge-utils       - for creating network bridges
# virtinst           - virt-install command for creating VMs
# virt-manager       - optional GUI (useful even on server via X forwarding)
# libguestfs-tools   - tools for manipulating VM disk images
```

## Configuring User Permissions

Add your user to the `libvirt` and `kvm` groups to manage VMs without sudo:

```bash
# Add current user to required groups
sudo usermod -aG libvirt $USER
sudo usermod -aG kvm $USER

# Verify group membership (log out and back in for this to take effect)
groups $USER
```

Log out and log back in, then verify:

```bash
# Confirm group membership is active
id | grep libvirt
```

## Starting and Enabling the libvirt Daemon

```bash
# Start libvirtd
sudo systemctl start libvirtd

# Enable at boot
sudo systemctl enable libvirtd

# Check status
sudo systemctl status libvirtd
```

## Verifying the Installation

Run the built-in verification tool:

```bash
# Check KVM installation readiness
sudo virt-host-validate

# Expected output for a healthy system:
# QEMU: Checking for hardware virtualization                          : PASS
# QEMU: Checking if device /dev/kvm exists                           : PASS
# QEMU: Checking if device /dev/kvm is accessible                    : PASS
# QEMU: Checking if device /dev/vhost-net exists                     : PASS
# QEMU: Checking if device /dev/net/tun exists                       : PASS
```

Check the default storage pool and network:

```bash
# List available virtual networks
virsh net-list --all

# Expected output:
# Name      State    Autostart   Persistent
# default   active   yes         yes

# Start the default network if not running
sudo virsh net-start default
sudo virsh net-autostart default

# List storage pools
virsh pool-list --all
```

## Setting Up the Default Storage Pool

The default storage pool stores VM disk images:

```bash
# Check default pool location
virsh pool-info default

# If no default pool exists, create one
sudo virsh pool-define-as default dir - - - - /var/lib/libvirt/images
sudo virsh pool-build default
sudo virsh pool-start default
sudo virsh pool-autostart default

# Verify pool is active
sudo virsh pool-list
```

## Configuring Networking

### Default NAT Network (works out of the box)

The default network provides NAT connectivity - VMs can reach the internet but are not directly accessible from outside:

```bash
# Check default network config
virsh net-dumpxml default

# This shows the virbr0 bridge with 192.168.122.0/24 subnet
```

### Creating a Bridge Network for Direct LAN Access

For VMs that need their own IP address on your LAN, create a bridge:

```bash
# Find your primary network interface
ip link show

# Create bridge configuration using netplan
sudo nano /etc/netplan/01-bridge.yaml
```

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:                    # Replace with your actual interface name
      dhcp4: false
      dhcp6: false
  bridges:
    br0:
      interfaces:
        - enp3s0
      dhcp4: true              # Or use static IP configuration
      parameters:
        stp: false
        forward-delay: 0
```

```bash
# Apply network configuration
sudo netplan apply

# Verify bridge is up
ip addr show br0
brctl show br0
```

## Creating Your First Virtual Machine

Download a cloud image to test with:

```bash
# Download Ubuntu 22.04 cloud image
wget -P /var/lib/libvirt/images/ \
  https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# Resize it to a usable size
sudo qemu-img resize /var/lib/libvirt/images/jammy-server-cloudimg-amd64.img 20G
```

Create a VM using `virt-install`:

```bash
sudo virt-install \
  --name ubuntu-test \
  --ram 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/ubuntu-test.qcow2,size=20,format=qcow2 \
  --os-variant ubuntu22.04 \
  --network network=default \
  --graphics none \
  --console pty,target_type=serial \
  --location 'http://archive.ubuntu.com/ubuntu/dists/jammy/main/installer-amd64/' \
  --extra-args 'console=ttyS0,115200n8 serial'
```

For a faster setup using a cloud image directly:

```bash
# Copy and customize the cloud image
sudo cp /var/lib/libvirt/images/jammy-server-cloudimg-amd64.img \
        /var/lib/libvirt/images/ubuntu-vm1.qcow2

sudo virt-install \
  --name ubuntu-vm1 \
  --ram 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/ubuntu-vm1.qcow2,format=qcow2 \
  --os-variant ubuntu22.04 \
  --network network=default \
  --import \
  --graphics none \
  --noautoconsole
```

## Basic VM Management Commands

```bash
# List all VMs
virsh list --all

# Start a VM
virsh start ubuntu-vm1

# Stop a VM gracefully
virsh shutdown ubuntu-vm1

# Force stop (like pulling the power)
virsh destroy ubuntu-vm1

# View VM information
virsh dominfo ubuntu-vm1

# Connect to VM console
virsh console ubuntu-vm1
# Press Ctrl+] to exit the console

# Get VM IP address
virsh domifaddr ubuntu-vm1
```

## Checking KVM Performance

Verify VMs are using hardware acceleration (not software emulation):

```bash
# Check CPU model in a running VM - should show host-model features
virsh capabilities | grep -A5 "<cpu>"

# View per-VM CPU usage
virt-top

# Check KVM is being used (not TCG software emulation)
virsh dumpxml ubuntu-vm1 | grep -A3 "<emulator>"
```

The emulator should be `/usr/bin/qemu-system-x86_64` and the domain type should be `kvm`:

```bash
virsh dumpxml ubuntu-vm1 | head -5
# Should show: <domain type='kvm'>
```

With KVM and QEMU installed, you have a solid foundation for running virtual machines. The libvirt layer provides a consistent management interface via `virsh`, and all the advanced features like live migration, snapshots, storage management, and networking build on top of this baseline installation.
