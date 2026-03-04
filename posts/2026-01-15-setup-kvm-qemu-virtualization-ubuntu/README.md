# How to Set Up KVM/QEMU Virtualization on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, KVM, QEMU, Virtualization, Virtual Machines, Tutorial

Description: Complete guide to setting up KVM virtualization on Ubuntu for running virtual machines with near-native performance.

---

KVM (Kernel-based Virtual Machine) is Linux's built-in hypervisor that provides hardware-accelerated virtualization. Combined with QEMU, it enables running virtual machines with near-native performance. This guide covers installation, configuration, and basic VM management.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- CPU with virtualization support (Intel VT-x or AMD-V)
- At least 4GB RAM (more for running VMs)
- Sufficient disk space for VM images

## Check Virtualization Support

```bash
# Check CPU supports virtualization
egrep -c '(vmx|svm)' /proc/cpuinfo
# Output should be > 0

# Detailed check
lscpu | grep Virtualization

# Check KVM module is available
lsmod | grep kvm
```

If virtualization is disabled, enable it in BIOS/UEFI settings.

## Install KVM and Tools

```bash
# Install KVM, QEMU, and management tools
sudo apt update
sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virtinst virt-manager -y

# Verify installation
virsh --version
qemu-system-x86_64 --version
```

## Configure User Permissions

```bash
# Add your user to libvirt and kvm groups
sudo usermod -aG libvirt $USER
sudo usermod -aG kvm $USER

# Apply changes (or log out and back in)
newgrp libvirt
```

## Start and Enable libvirtd

```bash
# Start libvirt daemon
sudo systemctl start libvirtd

# Enable on boot
sudo systemctl enable libvirtd

# Check status
sudo systemctl status libvirtd
```

## Verify KVM Installation

```bash
# Check KVM is working
virsh list --all

# Check default network
virsh net-list --all

# If default network is inactive, start it
virsh net-start default
virsh net-autostart default
```

## Create Virtual Machine

### Using virt-install (CLI)

```bash
# Create VM from ISO
virt-install \
  --name ubuntu-vm \
  --ram 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/ubuntu-vm.qcow2,size=20 \
  --os-variant ubuntu22.04 \
  --network network=default \
  --graphics vnc,listen=0.0.0.0 \
  --cdrom /path/to/ubuntu-22.04-live-server-amd64.iso \
  --boot cdrom
```

### Using virt-manager (GUI)

```bash
# Launch virtual machine manager
virt-manager
```

1. Click "Create a new virtual machine"
2. Select installation method (ISO)
3. Choose OS type and version
4. Allocate RAM and CPUs
5. Create disk image
6. Name VM and configure network
7. Begin installation

## VM Management Commands

### Basic Operations

```bash
# List all VMs
virsh list --all

# Start VM
virsh start ubuntu-vm

# Shutdown VM gracefully
virsh shutdown ubuntu-vm

# Force stop VM
virsh destroy ubuntu-vm

# Reboot VM
virsh reboot ubuntu-vm

# Suspend VM
virsh suspend ubuntu-vm

# Resume VM
virsh resume ubuntu-vm
```

### VM Information

```bash
# VM details
virsh dominfo ubuntu-vm

# VM configuration XML
virsh dumpxml ubuntu-vm

# Console access
virsh console ubuntu-vm

# VNC display info
virsh vncdisplay ubuntu-vm
```

### Delete VM

```bash
# Remove VM (keeps disk)
virsh undefine ubuntu-vm

# Remove VM and disk
virsh undefine ubuntu-vm --remove-all-storage
```

## Networking Configuration

### Default NAT Network

VMs use NAT by default, sharing the host's IP:

```bash
# View default network
virsh net-dumpxml default

# List network interfaces for VM
virsh domiflist ubuntu-vm
```

### Bridged Network

For VMs to have their own IP on the LAN:

```bash
# Create bridge configuration
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3:
      dhcp4: false
  bridges:
    br0:
      interfaces: [enp0s3]
      dhcp4: true
      parameters:
        stp: false
        forward-delay: 0
```

```bash
# Apply configuration
sudo netplan apply

# Define bridge network for libvirt
sudo nano /tmp/bridge-network.xml
```

```xml
<network>
  <name>br0-network</name>
  <forward mode="bridge"/>
  <bridge name="br0"/>
</network>
```

```bash
# Create and start bridge network
virsh net-define /tmp/bridge-network.xml
virsh net-start br0-network
virsh net-autostart br0-network
```

## Storage Management

### Storage Pools

```bash
# List storage pools
virsh pool-list --all

# Create new storage pool
virsh pool-define-as mypool dir --target /data/vms

# Start and autostart pool
virsh pool-start mypool
virsh pool-autostart mypool

# List volumes in pool
virsh vol-list mypool
```

### Disk Images

```bash
# Create disk image
qemu-img create -f qcow2 /var/lib/libvirt/images/newdisk.qcow2 50G

# Check image info
qemu-img info /var/lib/libvirt/images/newdisk.qcow2

# Resize disk (VM must be off)
qemu-img resize /var/lib/libvirt/images/ubuntu-vm.qcow2 +10G

# Convert image format
qemu-img convert -f raw -O qcow2 disk.raw disk.qcow2
```

### Attach Disk to VM

```bash
# Attach disk (persistent)
virsh attach-disk ubuntu-vm /var/lib/libvirt/images/data.qcow2 vdb --persistent

# Detach disk
virsh detach-disk ubuntu-vm vdb --persistent
```

## Snapshots

```bash
# Create snapshot
virsh snapshot-create-as ubuntu-vm snap1 "Before update"

# List snapshots
virsh snapshot-list ubuntu-vm

# Revert to snapshot
virsh snapshot-revert ubuntu-vm snap1

# Delete snapshot
virsh snapshot-delete ubuntu-vm snap1
```

## Resource Management

### CPU and Memory

```bash
# Set vCPUs (online)
virsh setvcpus ubuntu-vm 4 --live

# Set maximum vCPUs
virsh setvcpus ubuntu-vm 8 --config --maximum

# Set memory (live, in KiB)
virsh setmem ubuntu-vm 4194304 --live

# Edit VM configuration
virsh edit ubuntu-vm
```

### CPU Pinning

Pin vCPUs to specific host CPUs:

```bash
virsh edit ubuntu-vm
```

Add to `<vcpu>` section:
```xml
<cputune>
  <vcpupin vcpu='0' cpuset='0'/>
  <vcpupin vcpu='1' cpuset='1'/>
</cputune>
```

## Clone VMs

```bash
# Clone VM (source must be off)
virt-clone --original ubuntu-vm --name ubuntu-vm-clone --auto-clone

# Clone with specific disk path
virt-clone --original ubuntu-vm --name ubuntu-vm-clone --file /var/lib/libvirt/images/ubuntu-vm-clone.qcow2
```

## Migration

### Live Migration (requires shared storage)

```bash
# Migrate VM to another host
virsh migrate --live ubuntu-vm qemu+ssh://destination-host/system
```

### Offline Migration

```bash
# Dump VM XML
virsh dumpxml ubuntu-vm > ubuntu-vm.xml

# Copy disk and XML to destination
scp /var/lib/libvirt/images/ubuntu-vm.qcow2 dest:/var/lib/libvirt/images/
scp ubuntu-vm.xml dest:

# On destination, define VM
virsh define ubuntu-vm.xml
```

## Performance Tuning

### Enable Hugepages

```bash
# Check current hugepages
cat /proc/meminfo | grep Huge

# Configure hugepages (2MB pages)
echo 1024 | sudo tee /proc/sys/vm/nr_hugepages

# Make permanent
echo "vm.nr_hugepages=1024" | sudo tee -a /etc/sysctl.conf
```

Enable in VM configuration:
```xml
<memoryBacking>
  <hugepages/>
</memoryBacking>
```

### VirtIO Drivers

Use VirtIO for best performance:
```xml
<disk type='file' device='disk'>
  <driver name='qemu' type='qcow2'/>
  <source file='/var/lib/libvirt/images/vm.qcow2'/>
  <target dev='vda' bus='virtio'/>
</disk>

<interface type='network'>
  <source network='default'/>
  <model type='virtio'/>
</interface>
```

## Troubleshooting

### VM Won't Start

```bash
# Check libvirtd logs
sudo journalctl -u libvirtd -n 50

# Check VM logs
sudo cat /var/log/libvirt/qemu/ubuntu-vm.log
```

### Network Issues

```bash
# Restart default network
virsh net-destroy default
virsh net-start default

# Check iptables rules
sudo iptables -L -n | grep virbr
```

### Permission Denied

```bash
# Fix image permissions
sudo chown libvirt-qemu:kvm /var/lib/libvirt/images/*.qcow2
sudo chmod 600 /var/lib/libvirt/images/*.qcow2
```

---

KVM provides enterprise-grade virtualization on Ubuntu. For production environments, consider implementing proper backup strategies, monitoring, and using management tools like oVirt or Proxmox for larger deployments.
