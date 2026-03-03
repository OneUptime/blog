# How to Understand Talos Linux Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Linux Architecture, Operating System, Infrastructure

Description: A deep dive into the architecture of Talos Linux, the minimal, immutable operating system built specifically for Kubernetes.

---

Talos Linux is not your typical Linux distribution. It was designed from the ground up with a single purpose: running Kubernetes. There is no shell, no SSH, no package manager, and no way to log in to a running system in the traditional sense. If this sounds limiting, that is the point. By stripping away everything unnecessary, Talos reduces the attack surface, simplifies operations, and makes Kubernetes clusters more predictable.

Understanding the architecture of Talos Linux helps you operate it effectively and troubleshoot issues when they arise. This post breaks down how Talos is structured and why each design decision was made.

## The Big Picture

At a high level, Talos Linux consists of a minimal Linux kernel, an init system called machined, a set of system services, and Kubernetes itself. The entire operating system fits in a SquashFS image that is mounted as a read-only root filesystem. Configuration is provided as a YAML document at boot time, and all management happens through a gRPC API.

Here is how the components stack up:

```
+------------------------------------------+
|            Kubernetes Workloads           |
+------------------------------------------+
|   kubelet  |  containerd  |  etcd (CP)   |
+------------------------------------------+
|        Talos System Services             |
|  (networkd, apid, trustd, machined)     |
+------------------------------------------+
|         Talos Linux Kernel               |
+------------------------------------------+
|         Hardware / Hypervisor            |
+------------------------------------------+
```

## The Kernel

Talos uses a standard Linux kernel with a carefully selected set of modules. The kernel configuration includes only what is needed to run containers and manage networking. Unnecessary drivers and subsystems are disabled at compile time, which reduces the kernel size and eliminates potential vulnerability classes.

The kernel boots directly into machined as PID 1. There is no systemd, no init scripts, and no runlevels. This drastically simplifies the boot process and makes it faster and more predictable.

```bash
# Check the kernel version running on a Talos node
talosctl -n 10.0.0.11 version

# View kernel parameters
talosctl -n 10.0.0.11 read /proc/cmdline

# List loaded kernel modules
talosctl -n 10.0.0.11 read /proc/modules
```

## machined: The Init System

machined is the core of Talos Linux. It runs as PID 1 and is responsible for everything: booting the system, applying configuration, starting services, and exposing the management API.

When a Talos node boots, machined performs these steps in order:

1. Mounts the root filesystem from the SquashFS image
2. Reads the machine configuration (from a partition, network, or cloud metadata)
3. Configures networking
4. Starts system services (containerd, etcd on control plane nodes, kubelet)
5. Exposes the Talos API for management

machined also runs the controller runtime, which is a reconciliation loop that constantly ensures the actual state of the node matches the desired state defined in the configuration.

## The Configuration Model

Every Talos node is configured through a single YAML document called the machine configuration. This document defines everything about the node: networking, storage, cluster membership, certificates, and Kubernetes settings.

```yaml
# Simplified Talos machine configuration
version: v1alpha1
machine:
  type: controlplane  # or "worker"
  token: your-machine-token
  ca:
    crt: <base64-encoded-certificate>
    key: <base64-encoded-key>
  network:
    hostname: cp-01
    interfaces:
      - interface: eth0
        dhcp: true
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
cluster:
  clusterName: my-cluster
  controlPlane:
    endpoint: https://10.0.0.10:6443
  network:
    cni:
      name: flannel
  token: your-cluster-token
  ca:
    crt: <base64-encoded-certificate>
    key: <base64-encoded-key>
```

The configuration is applied during boot and can be updated at runtime through the Talos API. This declarative model means you never need to run ad-hoc commands on nodes. Everything is defined in configuration.

## System Services

Talos runs a small set of system services, each with a specific responsibility.

**apid** is the API server that handles incoming gRPC requests from talosctl and other clients. It authenticates requests using mutual TLS and routes them to the appropriate handler.

**trustd** manages the PKI infrastructure for the cluster. It handles certificate signing requests and distributes certificates to nodes.

**networkd** manages network configuration, including interface setup, DNS, NTP, and routing.

**containerd** is the container runtime. Talos uses containerd directly rather than Docker. All Kubernetes pods and system containers run through containerd.

**etcd** runs only on control plane nodes. It is the distributed key-value store that Kubernetes uses for all cluster state.

**kubelet** runs on every node and is the Kubernetes agent that manages pods and containers.

```bash
# List running services on a Talos node
talosctl -n 10.0.0.11 services

# Check the status of a specific service
talosctl -n 10.0.0.11 service apid

# View logs for a specific service
talosctl -n 10.0.0.11 logs kubelet
```

## The Filesystem Layout

The filesystem on a Talos node is carefully partitioned. Here is the typical disk layout.

The EFI or BIOS boot partition is used for booting. The BOOT partition contains the kernel and initramfs. The META partition stores metadata like the machine UUID and install configuration. The STATE partition holds the machine configuration and is encrypted at rest by default. The EPHEMERAL partition is where Kubernetes data lives, including containerd images, pod logs, and ephemeral storage.

```bash
# View the partition layout
talosctl -n 10.0.0.11 get blockdevices

# Check mount points
talosctl -n 10.0.0.11 mounts
```

The root filesystem is a SquashFS image that is mounted read-only. This means that nothing can modify system files at runtime, not even root processes. If a process tries to write to the root filesystem, the write will fail. This is a critical security feature that prevents tampering and drift.

## Networking Architecture

Talos Linux manages networking through its own networkd service. All network configuration comes from the machine config, and networkd ensures the actual network state matches the desired configuration.

Talos supports bonding, VLANs, static IPs, DHCP, and WireGuard. Network changes are applied without rebooting the node.

```yaml
# Network configuration in machine config
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
      - interface: bond0
        bond:
          mode: 802.3ad
          interfaces:
            - eth1
            - eth2
        addresses:
          - 10.0.0.11/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
```

## Security Architecture

Security is baked into every layer of Talos. The read-only root filesystem prevents unauthorized changes. All API access requires mutual TLS authentication. There is no shell or SSH, so remote code execution exploits are largely useless. The kernel is hardened with security modules and minimal capabilities.

Talos also supports disk encryption, Secure Boot, and measured boot with TPM. These features ensure that the boot chain is trusted from firmware to running workloads.

```yaml
# Enable disk encryption in machine config
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

## How Updates Work

Updating Talos is an atomic operation. Instead of updating individual packages, you replace the entire OS image. The new image is written to a standby partition, and the node reboots into it. If the new image fails to boot, the node automatically rolls back to the previous image.

```bash
# Upgrade a Talos node to a new version
talosctl -n 10.0.0.11 upgrade --image ghcr.io/siderolabs/installer:v1.7.0

# Check the upgrade status
talosctl -n 10.0.0.11 version
```

This approach eliminates the risk of partial updates and ensures that every node runs a known, complete, and tested OS image.

## Conclusion

The architecture of Talos Linux reflects a deliberate set of trade-offs. By removing traditional Linux capabilities like shell access and package management, Talos gains security, consistency, and operational simplicity. The API-driven model means every operation is auditable and reproducible. The immutable filesystem means nodes cannot drift from their desired configuration. And the minimal design means there are fewer things that can break. Understanding this architecture is the foundation for operating Talos Linux effectively, because once you internalize the design principles, the operational patterns follow naturally.
