# How to Check Talos Linux System Requirements Before Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Requirements, Hardware, Planning, Kubernetes

Description: Understand the hardware and network requirements for Talos Linux before you start your installation process.

---

Before you start installing Talos Linux, it pays to verify that your hardware and network meet the requirements. Talos is a lean operating system, but Kubernetes itself has specific needs, and running both together means your machines need to meet certain minimums. Getting this right upfront saves you from debugging mysterious failures later.

This guide covers every requirement you should check before beginning your Talos Linux installation.

## Minimum Hardware Requirements

Talos Linux is lightweight compared to traditional Linux distributions, but Kubernetes components need a reasonable amount of resources.

### Control Plane Nodes

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4-8 GB |
| Disk | 10 GB | 50+ GB |
| Network | 1 Gbps | 1 Gbps+ |

The 2 GB RAM minimum is tight. At that level, the control plane components (etcd, API server, controller manager, scheduler) consume most of the available memory. With 4 GB, you have breathing room for system overhead and small workloads. For production, 8 GB or more is strongly recommended.

### Worker Nodes

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 1 GB | 4+ GB |
| Disk | 10 GB | 50+ GB |
| Network | 1 Gbps | 1 Gbps+ |

Worker node requirements depend heavily on the workloads you plan to run. The minimums above get Talos and the kubelet running, but your applications will need additional resources on top of this.

### etcd Storage Considerations

etcd is particularly sensitive to disk performance. On control plane nodes, etcd writes data to disk on every transaction, and slow disks lead to cluster instability. The Kubernetes documentation recommends 50 sequential IOPS as a minimum, but 500+ IOPS is better.

SSDs are strongly recommended for control plane nodes. Spinning disks can work for small clusters but will cause problems under load.

You can check disk performance on an existing Linux system with:

```bash
# Test sequential write speed (run on the target disk)
dd if=/dev/zero of=/tmp/testfile bs=1M count=1024 oflag=dsync
```

If you are seeing less than 50 MB/s on sequential writes, consider upgrading the storage.

## CPU Architecture

Talos Linux supports two CPU architectures:

- **amd64 (x86_64)** - Standard Intel and AMD processors. This is the most common architecture for servers.
- **arm64 (aarch64)** - ARM-based processors like AWS Graviton, Ampere Altra, Apple Silicon (for VMs), and Raspberry Pi 4.

Make sure you download the correct image for your architecture. Booting an amd64 image on an arm64 machine (or vice versa) simply will not work.

```bash
# Check your CPU architecture on Linux
uname -m
# Expected: x86_64 or aarch64

# Check on macOS
arch
# Expected: arm64 (Apple Silicon) or i386 (Intel)
```

## Firmware and Boot Mode

Talos supports both UEFI and legacy BIOS boot modes. Check which mode your hardware uses:

- **UEFI** - Modern systems (most hardware from 2012 onwards). This is the recommended mode.
- **Legacy BIOS** - Older systems. Still supported but UEFI is preferred.

If your system uses UEFI, check whether Secure Boot is enabled. Talos Linux has support for Secure Boot starting with recent versions, but depending on your hardware and Talos version, you may need to disable it or enroll custom keys.

## Network Requirements

Talos nodes need network connectivity for several purposes. Here is what needs to be reachable:

### Between Nodes

The following ports must be open between all cluster nodes:

| Port | Protocol | Purpose |
|------|----------|---------|
| 50000 | TCP | Talos API (apid) |
| 50001 | TCP | Talos trustd |
| 6443 | TCP | Kubernetes API |
| 2379-2380 | TCP | etcd client and peer |
| 10250 | TCP | kubelet API |
| 10259 | TCP | kube-scheduler |
| 10257 | TCP | kube-controller-manager |
| 51871 | UDP | Wireguard (if using KubeSpan) |

### From Workstation to Nodes

Your management workstation needs access to:

| Port | Protocol | Purpose |
|------|----------|---------|
| 50000 | TCP | Talos API (for talosctl) |
| 6443 | TCP | Kubernetes API (for kubectl) |

### Outbound Internet Access

During initial setup, nodes need outbound internet access to:

- Pull container images from container registries (gcr.io, registry.k8s.io, docker.io)
- Download Kubernetes components
- Reach the Talos discovery service (optional, for cluster discovery)

If your environment does not have outbound internet access, you will need to set up a container registry mirror and pre-load images.

## DHCP vs Static IP

Talos nodes can use DHCP or static IP addresses.

**DHCP** is simpler for initial setup. When a node boots in maintenance mode, it gets an IP from DHCP, and you can apply the configuration to that address. You can then configure static IPs in the machine configuration if needed.

**Static IPs** require you to configure them in the machine configuration before applying it. For the initial maintenance mode connection, you can either use DHCP temporarily or connect via IPv6 link-local addresses.

For production clusters, static IPs are recommended because DHCP lease changes can disrupt etcd and other cluster components.

## Disk Layout

Talos installs itself to a single disk. It creates several partitions:

- **EFI System Partition** (for UEFI boot) - ~100 MB
- **BIOS Boot Partition** (for legacy BIOS) - ~1 MB
- **Boot Partition** - ~1 GB
- **Meta Partition** - ~1 MB
- **State Partition** - ~100 MB (stores machine configuration)
- **Ephemeral Partition** - Remaining space (used for kubelet data, container images, logs)

Talos needs a dedicated disk. It will format and partition the entire disk during installation. Do not try to dual-boot Talos with another operating system.

Check available disks before installation:

```bash
# Once Talos is in maintenance mode, you can check disks via talosctl
talosctl disks --insecure --nodes 192.168.1.50
```

## Virtual Machine Specifics

If running Talos in VMs, check these additional items:

### Hypervisor Support

Talos works on all major hypervisors:

- VMware ESXi / vSphere
- Proxmox / QEMU / KVM
- VirtualBox
- Hyper-V
- Cloud providers (AWS, GCP, Azure, etc.)

### VM Configuration Tips

```
# Recommended VM settings for Talos:
# - CPU: Enable hardware virtualization passthrough
# - Disk Controller: Use virtio (KVM) or PVSCSI (VMware) for best performance
# - Network: Use virtio (KVM) or VMXNET3 (VMware)
# - Disk: Use thin provisioning if available
# - Firmware: UEFI preferred over BIOS
```

### Nested Virtualization

If you are running Talos inside a VM that is itself on a hypervisor (nested virtualization), performance will be degraded. This is fine for testing but not recommended for production.

## Pre-Installation Checklist

Before you start, run through this checklist:

1. Each node meets minimum CPU and RAM requirements
2. Each node has a dedicated disk of at least 10 GB (50 GB preferred)
3. Control plane nodes have SSD storage
4. Network connectivity between all nodes is confirmed
5. Required ports are open (no firewall blocking inter-node communication)
6. Outbound internet access is available (or registry mirrors are configured)
7. You have downloaded the correct Talos image for your architecture and platform
8. `talosctl` and `kubectl` are installed on your workstation
9. You have planned IP addresses for all nodes and the Kubernetes API endpoint
10. DNS and/or DHCP is available on the network

Getting these requirements validated before you start saves significant troubleshooting time. Most installation issues trace back to one of these requirements not being met, so take a few minutes to verify everything before proceeding.
