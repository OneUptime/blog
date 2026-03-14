# Update Cilium Requirements for Generic Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A comprehensive guide to checking and updating Cilium's system requirements on generic (self-managed) Kubernetes clusters, covering kernel version, Linux distribution, and network configuration...

---

## Introduction

Generic Kubernetes clusters - those not managed by a cloud provider (bare metal, on-premises VMs, private cloud) - provide maximum flexibility for Cilium configuration but also require the most thorough requirements verification. Unlike managed services that ensure baseline compatibility, self-managed clusters may run a wide variety of Linux distributions, kernel versions, and storage configurations.

Cilium's requirements for generic Kubernetes span multiple layers: the Linux kernel must support specific eBPF program types, the container runtime must mount the eBPF filesystem, network interfaces must be configurable, and the Kubernetes version must be within the supported compatibility window.

This guide walks through verifying and updating every layer of Cilium's requirements on generic Kubernetes clusters, from checking kernel capabilities to configuring container runtime parameters.

## Prerequisites

- Self-managed Kubernetes cluster
- SSH access to cluster nodes
- `kubectl` with cluster-admin permissions
- `cilium` CLI installed
- Root or sudo access on nodes

## Step 1: Verify Kernel Version and BPF Support

Cilium requires specific kernel capabilities. Check each node thoroughly.

```bash
# Check kernel version on all nodes
kubectl get nodes -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion"

# On individual nodes, check BPF support
ssh <node-ip> "grep -m 1 CONFIG_BPF /boot/config-$(uname -r)"
ssh <node-ip> "grep -m 1 CONFIG_BPF_SYSCALL /boot/config-$(uname -r)"
ssh <node-ip> "grep -m 1 CONFIG_NET_CLS_BPF /boot/config-$(uname -r)"

# Check if BPF filesystem is mounted
ssh <node-ip> "mount | grep bpf"
```

Minimum kernel requirements:
- Basic Cilium: Linux 4.9.17+
- Cilium with kube-proxy replacement: Linux 5.3+
- Full eBPF features: Linux 5.10+

## Step 2: Mount the BPF Filesystem

If the BPF filesystem is not mounted, configure it to mount at boot.

```bash
# Mount BPF filesystem immediately
ssh <node-ip> "sudo mount bpffs -t bpf /sys/fs/bpf"

# Make it persistent across reboots
ssh <node-ip> 'echo "bpffs /sys/fs/bpf bpf defaults 0 0" | sudo tee -a /etc/fstab'

# Verify the mount is present
ssh <node-ip> "mount | grep /sys/fs/bpf"
```

## Step 3: Check and Update Container Runtime

Cilium requires a compatible container runtime with specific configuration.

```bash
# Check container runtime on nodes
kubectl get nodes -o custom-columns="NODE:.metadata.name,RUNTIME:.status.nodeInfo.containerRuntimeVersion"

# For containerd, verify the configuration allows BPF
ssh <node-ip> "containerd config dump | grep -A 5 cni"

# Ensure /opt/cni/bin and /etc/cni/net.d are accessible
ssh <node-ip> "ls /opt/cni/bin"
ssh <node-ip> "ls /etc/cni/net.d"
```

## Step 4: Check Linux Distribution Compatibility

Different Linux distributions have different package availability affecting Cilium.

```bash
# Check distribution on nodes
kubectl get nodes -o custom-columns="NODE:.metadata.name,OS:.status.nodeInfo.osImage"

# For Ubuntu nodes, install required packages
ssh <node-ip> "sudo apt-get install -y linux-headers-$(uname -r) iproute2 ipset"

# For RHEL/CentOS nodes
ssh <node-ip> "sudo yum install -y kernel-devel-$(uname -r) iproute iptables"

# For Flatcar Container Linux, verify BPF support
ssh <node-ip> "cat /usr/share/flatcar/update.conf"
```

## Step 5: Verify Networking Prerequisites

Check that network interfaces and protocols needed by Cilium are available.

```bash
# Verify required kernel modules are loaded
ssh <node-ip> "lsmod | grep -E 'ip_tables|xt_|nf_conntrack|bridge'"

# Load required modules if missing
ssh <node-ip> "sudo modprobe ip_tables xt_bpf"

# Check that IPv4 forwarding is enabled
ssh <node-ip> "sysctl net.ipv4.ip_forward"

# Enable if not active
ssh <node-ip> "sudo sysctl -w net.ipv4.ip_forward=1"
ssh <node-ip> 'echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-cilium.conf'
```

## Best Practices

- Run the `cilium preflight` check before installing on new nodes
- Document node OS versions and kernel versions in your cluster inventory
- Use a consistent Linux distribution across all nodes to simplify requirements management
- Enable kernel auto-updates within a pinned major version to keep security patches current
- Test new node configurations in a separate worker pool before rolling to production

## Conclusion

Meeting Cilium's requirements on generic Kubernetes clusters requires checking multiple system layers: kernel version, BPF filesystem availability, container runtime configuration, and Linux distribution compatibility. By systematically verifying each requirement and addressing gaps before installation, you ensure a smooth Cilium deployment and avoid runtime issues caused by missing system capabilities.
