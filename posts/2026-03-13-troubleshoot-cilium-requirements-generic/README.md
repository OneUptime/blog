# Troubleshoot Cilium Requirements on Generic Kubernetes Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A comprehensive guide to verifying system requirements for Cilium on generic Kubernetes clusters, covering kernel versions, mount points, and CNI prerequisites.

---

## Introduction

Installing Cilium on a generic (self-managed) Kubernetes cluster requires careful validation of the underlying system environment. Unlike managed cloud offerings, generic clusters can run on a wide variety of Linux distributions, kernel versions, and hardware configurations - each introducing unique compatibility challenges.

Cilium's eBPF-based dataplane relies on specific kernel features that must be available and properly configured. Missing kernel modules, incorrect mount points, or incompatible CNI configurations are the most common reasons for Cilium installation failures on generic clusters.

This guide provides a systematic checklist for validating requirements before and after Cilium installation, helping you identify gaps quickly and resolve them without trial-and-error.

## Prerequisites

- Root or sudo access to cluster nodes
- `kubectl` configured against your cluster
- `cilium` CLI installed on your workstation
- Linux kernel 4.9.17+ on all nodes (5.10+ recommended for full eBPF feature set)

## Step 1: Validate Kernel Version and eBPF Support

Cilium depends on eBPF, which requires specific kernel capabilities. Run this check on each node to confirm compatibility.

SSH into each node and run the kernel validation:

```bash
# Check kernel version - must be 4.9.17 or higher
uname -r

# Verify eBPF filesystem is mounted
mount | grep bpf

# If not mounted, mount the BPF filesystem manually
mount bpffs /sys/fs/bpf -t bpf -o rw,nosuid,nodev,noexec,relatime,mode=700
```

## Step 2: Check Required Kernel Modules

Cilium requires several kernel modules to be available. Missing modules cause agent startup failures that can be hard to diagnose without this check.

Verify all required modules are loaded:

```bash
# Check for required kernel modules
for module in ip_tables ip6_tables xt_socket xt_tproxy xt_mark; do
  if lsmod | grep -q "^${module}"; then
    echo "${module}: LOADED"
  else
    echo "${module}: MISSING - load with: modprobe ${module}"
  fi
done

# Load any missing modules persistently
echo "xt_socket" >> /etc/modules-load.d/cilium.conf
```

## Step 3: Validate CNI Directory and Configuration

Cilium installs its CNI configuration into `/etc/cni/net.d/`. Conflicting CNI configurations from previous installations can prevent Cilium from taking control of the network.

Clean up conflicting CNI configurations:

```bash
# List existing CNI configurations
ls -la /etc/cni/net.d/

# Remove configurations from any previous CNI (e.g., flannel, calico) before installing Cilium
# WARNING: This will disrupt existing pod networking - drain nodes first
sudo rm -f /etc/cni/net.d/10-flannel.conflist
sudo rm -f /etc/cni/net.d/calico.conflist

# Confirm the CNI binary directory exists and is writable
ls -la /opt/cni/bin/
```

## Step 4: Verify Cilium Agent Health After Installation

After installation, confirm the Cilium agent is running correctly on all nodes using the Cilium CLI.

Run a full status and connectivity check:

```bash
# Check Cilium agent status across all nodes
cilium status --wait

# Run the built-in connectivity test to validate pod-to-pod and pod-to-service traffic
cilium connectivity test

# Check individual agent logs for any startup errors
kubectl -n kube-system logs -l k8s-app=cilium --tail=50
```

## Best Practices

- Always drain and cordon a node before replacing its CNI to avoid traffic disruption
- Use a consistent Linux distribution across all nodes to avoid per-distro kernel module differences
- Enable the BPF filesystem in systemd with a persistent mount unit rather than relying on manual mounts
- Pin the Cilium Helm chart version in CI to prevent accidental upgrades during testing
- Run `cilium connectivity test` after every node replacement or kernel upgrade

## Conclusion

Generic Kubernetes clusters require careful pre-installation validation for Cilium. By confirming kernel versions, eBPF filesystem mounts, kernel modules, and CNI directory cleanliness, you eliminate the majority of installation failures before they occur. The Cilium CLI's status and connectivity tests then give you a clear signal that the environment is healthy and ready for production workloads.
