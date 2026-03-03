# How to Configure VM Resources for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Virtualization, VM Configuration, Kubernetes, Resource Management

Description: Learn how to properly allocate CPU, memory, disk, and network resources for Talos Linux virtual machines to build a stable and performant Kubernetes cluster.

---

Getting virtual machine resource allocation right is one of those things that can make or break your Talos Linux cluster. Too little memory and your control plane pods start getting OOM-killed. Too much and you waste resources on the host. Talos Linux has specific requirements and recommendations that differ from traditional Linux distributions because it is a stripped-down OS built exclusively for running Kubernetes.

This guide covers the practical details of configuring CPU, memory, disk, and network resources for Talos Linux VMs across different hypervisors.

## Understanding Talos Linux Resource Requirements

Talos Linux is extremely lean compared to general-purpose Linux distributions. The base OS uses roughly 100-150 MB of RAM, which leaves the rest available for Kubernetes components and your workloads. But Kubernetes itself is not exactly lightweight. The control plane components - etcd, kube-apiserver, kube-controller-manager, and kube-scheduler - all need room to operate.

Here are the minimum and recommended resource allocations:

| Role | Min CPU | Rec CPU | Min RAM | Rec RAM | Min Disk | Rec Disk |
|------|---------|---------|---------|---------|----------|----------|
| Control Plane | 2 vCPU | 4 vCPU | 2 GB | 4 GB | 10 GB | 50 GB |
| Worker | 1 vCPU | 2+ vCPU | 1 GB | 4+ GB | 10 GB | 100+ GB |

These numbers assume you are running a basic cluster. If you plan on deploying monitoring stacks, service meshes, or heavy workloads, you will need to scale up accordingly.

## CPU Allocation

The number of vCPUs you assign affects both the speed of Kubernetes operations and the scheduling capacity of your cluster. For control plane nodes, two vCPUs is the bare minimum, but four makes a noticeable difference in responsiveness, especially during cluster bootstrapping and upgrades.

On VMware vSphere, you configure CPU through the VM settings:

```bash
# Using govc to set CPU count for a Talos VM
govc vm.change -vm talos-cp-1 -cpu 4

# You can also set CPU reservation to guarantee resources
govc vm.change -vm talos-cp-1 -cpu.reservation 2000
```

For QEMU/KVM environments, the CPU configuration goes in the VM definition:

```bash
# Create a QEMU VM with 4 vCPUs
qemu-system-x86_64 \
  -smp cpus=4,cores=4,threads=1 \
  -cpu host \
  -enable-kvm \
  -m 4096 \
  -drive file=talos-cp-1.qcow2,format=qcow2 \
  -cdrom metal-amd64.iso
```

The `-cpu host` flag passes through the host CPU features, which gives better performance than emulated CPU types.

On Proxmox, adjust CPU settings through the web interface or CLI:

```bash
# Set CPU cores on Proxmox
qm set 100 --cores 4 --sockets 1

# Enable host CPU type for best performance
qm set 100 --cpu host
```

## Memory Allocation

Memory is where Talos Linux VMs can get tricky. The Kubernetes control plane components, particularly etcd, are sensitive to memory pressure. If your control plane node runs out of memory, etcd can become unresponsive and your entire cluster goes down.

For control plane nodes, 4 GB is a comfortable starting point. For workers, the amount depends entirely on what you plan to run. A worker running just a few lightweight pods might do fine with 2 GB, while a worker running a Prometheus stack needs 8 GB or more.

```bash
# Set memory on a libvirt VM
virsh setmaxmem talos-cp-1 4194304 --config
virsh setmem talos-cp-1 4194304 --config

# For dynamic memory on Hyper-V (PowerShell)
Set-VMMemory -VMName "talos-cp-1" -StartupBytes 4GB -MinimumBytes 2GB -MaximumBytes 8GB
```

One important note about memory ballooning: Talos Linux does not include guest agents for most hypervisors by default. This means dynamic memory features may not work correctly. It is generally better to allocate a fixed amount of memory rather than relying on ballooning.

## Disk Configuration

Talos Linux uses its disk space for several purposes: the OS partition, the ephemeral data partition (for pod logs, container images), and optionally a separate partition for persistent storage.

The default disk layout in Talos allocates:
- A small boot partition (around 100 MB)
- A system partition for the OS (roughly 1 GB)
- The remaining space as an ephemeral partition

For control plane nodes, the ephemeral partition stores etcd data. A busy cluster can generate significant etcd write activity, so fast storage matters. Use SSDs or NVMe-backed storage whenever possible.

```bash
# Create a QCOW2 disk for a Talos VM
qemu-img create -f qcow2 talos-cp-1.qcow2 50G

# On Proxmox, resize a disk
qm resize 100 scsi0 +40G
```

You can also configure Talos to use additional disks for specific purposes through the machine configuration:

```yaml
# Machine config snippet for additional disk
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/storage
          size: 0  # Use all available space
```

## Disk I/O Performance

The disk I/O driver you use in your hypervisor significantly impacts performance. For QEMU/KVM, use the VirtIO drivers for best throughput:

```bash
# Use virtio for disk in QEMU
qemu-system-x86_64 \
  -drive file=talos-cp-1.qcow2,format=qcow2,if=virtio,cache=writeback \
  -m 4096 \
  -smp 4
```

The `cache=writeback` setting improves write performance at the cost of potential data loss on host crashes. For production environments, `cache=none` with `aio=native` is the safer choice:

```bash
# Production-safe disk settings
qemu-system-x86_64 \
  -drive file=talos-cp-1.qcow2,format=qcow2,if=virtio,cache=none,aio=native \
  -m 4096 \
  -smp 4
```

On VMware, use the Paravirtual SCSI controller for best performance with Talos Linux.

## Network Configuration

Network performance matters for Kubernetes, especially for pod-to-pod communication across nodes. Use VirtIO network adapters whenever possible, as they offer near-native performance compared to emulated NICs.

```bash
# QEMU with virtio-net
qemu-system-x86_64 \
  -netdev bridge,id=net0,br=br0 \
  -device virtio-net-pci,netdev=net0,mac=52:54:00:12:34:56 \
  -m 4096 \
  -smp 4 \
  -drive file=talos-cp-1.qcow2,format=qcow2,if=virtio
```

For multi-node clusters, bridged networking is almost always the right choice. NAT networking adds latency and complicates service discovery. If you are using Proxmox, create a Linux bridge and attach all Talos VMs to it:

```bash
# On Proxmox, set the network to use a bridge
qm set 100 --net0 virtio,bridge=vmbr0
```

## Monitoring Resource Usage

After your cluster is running, keep an eye on resource consumption. Talos provides built-in system information through `talosctl`:

```bash
# Check memory usage on a node
talosctl -n <NODE_IP> memory

# Check CPU usage
talosctl -n <NODE_IP> stats

# Check disk usage
talosctl -n <NODE_IP> usage /var
```

If you notice consistent high memory or CPU usage, adjust VM resources and apply updates. Talos supports live configuration changes for some settings, but CPU and memory changes typically require a VM restart.

## Resource Allocation Patterns

For a typical development cluster, a good starting configuration is:

- 1 control plane node: 4 vCPUs, 4 GB RAM, 50 GB disk
- 2 worker nodes: 2 vCPUs each, 4 GB RAM, 100 GB disk each

For staging or production-like environments:

- 3 control plane nodes: 4 vCPUs, 8 GB RAM, 100 GB SSD each
- 3+ worker nodes: 4-8 vCPUs, 16 GB RAM, 200 GB SSD each

The key takeaway is to always give control plane nodes fast storage and enough memory to keep etcd happy. Worker node sizing depends entirely on your workloads, so start with reasonable defaults and adjust based on actual usage data.

## Wrapping Up

Proper resource allocation for Talos Linux VMs comes down to understanding what Kubernetes needs at each layer. The control plane needs fast disks and reliable memory, while workers need enough CPU and memory for your application workloads. Since Talos itself is so lightweight, nearly all the resources you allocate go directly to Kubernetes and your applications, making it one of the most efficient platforms for running virtualized clusters.
