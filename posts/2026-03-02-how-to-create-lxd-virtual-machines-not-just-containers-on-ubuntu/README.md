# How to Create LXD Virtual Machines (Not Just Containers) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Virtualization, KVM, Virtual Machine

Description: Learn how to create full virtual machines (not just containers) using LXD on Ubuntu, including UEFI boot, resource configuration, and differences from LXD containers.

---

LXD is often described as a container manager, but since version 4.0 it also manages full virtual machines using QEMU/KVM under the hood. LXD VMs provide hardware-level isolation with the same `lxc` CLI you use for containers. This is genuinely useful - you get KVM-backed VMs without touching libvirt XML or virt-install flags.

## Containers vs VMs in LXD

Understanding the difference matters for choosing the right tool:

| Feature | LXD Container | LXD VM |
|---------|--------------|--------|
| Isolation | Kernel namespaces | Hardware (KVM) |
| Kernel | Shares host kernel | Own kernel |
| Boot time | ~1 second | ~10-20 seconds |
| Performance | Near-native | ~5-10% overhead |
| UEFI/SecureBoot | No | Yes |
| Nested virt | Complex | Yes |
| OS support | Linux only | Any OS |

Use containers for Linux workloads where performance and density matter. Use VMs when you need a different kernel, Windows, hardware isolation, or nested virtualization.

## Prerequisites

LXD VMs require QEMU/KVM support:

```bash
# Verify KVM is available
kvm-ok

# Check LXD version (4.0+ required for VM support)
lxc version  # or: snap info lxd | grep installed

# Ensure the lxd snap is installed
snap list lxd
```

## Creating Your First LXD VM

The key difference from container creation is the `--vm` flag:

```bash
# Create a VM (note: --vm flag)
lxc launch ubuntu:24.04 myvm --vm

# Monitor launch progress
lxc list

# Wait for the VM to show as Running
# NAME   TYPE          STATE    IPV4          IPV6
# myvm   VIRTUAL-MACHINE  Running  10.200.0.100  ...
```

The first launch downloads the VM image (larger than container images - typically 300-500MB).

## Available VM Images

```bash
# Search for VM images
lxc image list images: architecture=x86_64 type=virtual-machine

# Common options:
lxc launch ubuntu:22.04 vm1 --vm          # Ubuntu 22.04
lxc launch ubuntu:24.04 vm2 --vm          # Ubuntu 24.04
lxc launch images:fedora/40 vm3 --vm      # Fedora 40
lxc launch images:debian/12 vm4 --vm      # Debian 12
lxc launch images:centos/9-Stream vm5 --vm # CentOS Stream 9
lxc launch images:alpine/3.19 vm6 --vm   # Alpine Linux
```

## Accessing a VM

```bash
# Open a shell (uses QEMU agent for communication)
lxc exec myvm -- bash

# If the agent isn't ready yet, use the console
lxc console myvm
# Press Ctrl+a q to exit the console

# Check if the QEMU guest agent is running
lxc exec myvm -- systemctl status qemu-guest-agent
```

The QEMU guest agent (`qemu-guest-agent`) is pre-installed in LXD VM images and allows `lxc exec` to work without SSH.

## Configuring VM Resources

Set resources at launch time:

```bash
# Create a VM with custom resources
lxc init ubuntu:24.04 myvm --vm
lxc config set myvm limits.cpu 4
lxc config set myvm limits.memory 8GiB
lxc config device override myvm root size=50GiB
lxc start myvm
```

Or all in one step using config overrides at launch:

```bash
lxc launch ubuntu:24.04 myvm --vm \
  -c limits.cpu=4 \
  -c limits.memory=8GiB \
  -d root,size=50GiB
```

## Listing and Managing VMs

```bash
# List all instances (containers and VMs)
lxc list

# Filter to VMs only
lxc list type=virtual-machine

# Detailed info
lxc info myvm

# Start/stop
lxc start myvm
lxc stop myvm

# Graceful shutdown (sends shutdown signal to guest)
lxc stop myvm --force   # if graceful stop hangs

# Restart
lxc restart myvm
```

## VM Console Access

The console connects directly to the VM's serial/VGA console, useful when the OS hasn't booted fully or network isn't configured:

```bash
# Open the console
lxc console myvm

# VGA console (graphical output via a VNC-like interface)
lxc console myvm --type=vga
```

For the VGA console, you need `remote-viewer` or a compatible VNC client on the host.

## Configuring the VM's UEFI Settings

LXD VMs use OVMF (UEFI firmware). You can access the UEFI shell via the console if boot fails:

```bash
# Open console at boot time
lxc console myvm

# Press ESC during the TianoCore splash to enter UEFI setup
```

## Snapshots for VMs

LXD VM snapshots work the same as container snapshots:

```bash
# Create a snapshot
lxc snapshot myvm baseline

# List snapshots
lxc info myvm | grep -A5 "Snapshots"

# Restore a snapshot
lxc restore myvm baseline

# Delete a snapshot
lxc delete myvm/baseline
```

## Live Migration of VMs

In an LXD cluster, VMs can be live-migrated between cluster nodes:

```bash
# Migrate a VM to another cluster node
lxc move myvm --target node2

# Or evacuate a node (migrate all its VMs)
lxc cluster evacuate node1
```

## Attaching Additional Disks

```bash
# Create a new disk in the storage pool
lxc config device add myvm data-disk disk \
  pool=default \
  size=100GiB \
  path=/mnt/data

# The disk appears inside the VM at /mnt/data
lxc exec myvm -- lsblk
lxc exec myvm -- df -h /mnt/data
```

## Network Configuration

By default, LXD VMs get one NIC attached to `lxdbr0`:

```bash
# Check VM network
lxc info myvm | grep -A5 "Network"

# Add a second NIC (e.g., bridged to host network)
lxc config device add myvm eth1 nic \
  nictype=bridged \
  parent=br0
```

## GPU Passthrough for VMs

LXD supports passing physical GPUs to VMs:

```bash
# List available GPUs on host
lxc info --resources | grep -A3 "GPU"

# Pass GPU to VM (VM must be stopped)
lxc config device add myvm gpu0 gpu \
  vendorid=10de \
  productid=2204

# Or pass by PCI address
lxc config device add myvm gpu0 gpu gputype=physical pci=0000:01:00.0
```

## Comparing LXD VM Performance with Docker

A practical benchmark shows LXD VMs are significantly lighter than KVM VMs managed via libvirt, and start faster:

```bash
# Time a container launch
time lxc launch ubuntu:24.04 test-container

# Time a VM launch
time lxc launch ubuntu:24.04 test-vm --vm

# Compare boot times
lxc exec test-container -- systemd-analyze
lxc exec test-vm -- systemd-analyze
```

Typical results:
- Container: 1-3 seconds to Running state
- VM: 10-25 seconds to Running state (includes kernel boot)

## Deleting VMs

```bash
# Stop then delete
lxc stop myvm
lxc delete myvm

# Delete with all snapshots in one command
lxc delete myvm --force

# Delete multiple
lxc delete vm1 vm2 vm3 --force
```

## Troubleshooting VM Issues

### VM Stuck in Starting State

```bash
# Check QEMU logs
lxc info myvm --show-log

# Check LXD logs
sudo journalctl -u snap.lxd.daemon -f
```

### Cannot Run VMs: "KVM not supported"

```bash
# Check KVM kernel module
lsmod | grep kvm

# Load it if missing
sudo modprobe kvm_intel  # or kvm_amd for AMD

# Verify
kvm-ok
```

### VM Shows No IP Address

The DHCP lease may not have been issued yet, or the guest agent may not be running. Wait 30 seconds after the VM shows Running, then check again:

```bash
# Force refresh
lxc list --refresh
```

LXD's VM support makes it a versatile tool that covers both lightweight containers and full hardware-isolated VMs under a single CLI and API. For teams already using LXD containers, adding VMs for specific workloads requires no additional tooling.
