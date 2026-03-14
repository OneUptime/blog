# Update Cilium System Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, requirements, kubernetes, linux, kernel, ebpf, system

Description: A comprehensive reference guide to Cilium's core system requirements, covering kernel versions, Linux capabilities, container runtime support, and Kubernetes version compatibility.

---

## Introduction

Cilium's powerful eBPF-based networking requires a specific set of system capabilities that differ significantly from traditional CNI plugins. Before deploying Cilium — or before upgrading an existing installation — it's essential to verify that your infrastructure meets all system requirements. Mismatched requirements are the leading cause of failed Cilium installations.

Cilium's requirements have evolved over time as the project has added new features. Each major version of Cilium raises the minimum supported kernel version and may add new Linux capability requirements. Operators must check requirements not just at initial installation but before every upgrade, as Cilium's minimum supported Kubernetes and kernel versions can change between releases.

This guide provides a comprehensive overview of Cilium's current system requirements, explains why each requirement exists, and shows how to verify compliance across all nodes in your cluster.

## Prerequisites

- Kubernetes cluster with nodes to evaluate
- `kubectl` with cluster-admin access
- SSH access to cluster nodes (or node debugging capability)
- `cilium` CLI installed

## Step 1: Verify Kubernetes Version Compatibility

Cilium supports a specific range of Kubernetes versions. Check your cluster version.

```bash
# Check Kubernetes server version
kubectl version --short

# Check Cilium's supported Kubernetes version range
# Current Cilium versions support Kubernetes 1.25 through 1.30+
# Always check: https://docs.cilium.io/en/stable/concepts/kubernetes/compatibility/

# For each node, check the kubelet version
kubectl get nodes -o custom-columns="NODE:.metadata.name,KUBELET:.status.nodeInfo.kubeletVersion"
```

## Step 2: Verify Linux Kernel Requirements

Check kernel version for each node and feature tier.

```bash
# Check all node kernel versions
kubectl get nodes \
  -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion"
```

Cilium kernel requirement tiers:

| Feature | Minimum Kernel |
|---------|---------------|
| Basic CNI (iptables) | 4.9.17 |
| eBPF dataplane | 4.19.57 |
| kube-proxy replacement | 5.3 |
| Host routing | 5.10 |
| L7 policy (HTTP) | 4.19.57 |
| Bandwidth Manager | 5.1 |
| WireGuard encryption | 5.6 |

```bash
# Check specific kernel capabilities on nodes
kubectl debug node/<node-name> -it --image=busybox -- \
  chroot /host sh -c "uname -r && ls /sys/fs/bpf"
```

## Step 3: Verify Required Linux Capabilities

Cilium's agent pod requires specific Linux capabilities.

```bash
# Required capabilities for cilium-agent:
# NET_ADMIN - Configure network interfaces and iptables
# SYS_MODULE - Load kernel modules
# SYS_ADMIN - Mount BPF filesystem, manage namespaces

# Verify the cilium-agent pod has required capabilities
kubectl get pod -n kube-system -l k8s-app=cilium \
  -o jsonpath='{.items[0].spec.containers[0].securityContext}'
```

## Step 4: Verify Container Runtime Support

Check that the container runtime version meets Cilium's requirements.

```bash
# Check container runtime on all nodes
kubectl get nodes \
  -o custom-columns="NODE:.metadata.name,RUNTIME:.status.nodeInfo.containerRuntimeVersion"

# Supported container runtimes:
# containerd 1.5.2+
# CRI-O 1.20+
# Docker Engine 20.10+ (deprecated in newer Kubernetes versions)

# For containerd — verify CNI plugin path configuration
kubectl debug node/<node-name> -it --image=ubuntu -- \
  chroot /host cat /etc/containerd/config.toml | grep cni
```

## Step 5: Verify BPF Filesystem and System Configuration

BPF filesystem and sysctl settings must be properly configured.

```bash
# Verify BPF filesystem is mounted on all nodes
kubectl get nodes -o name | while read node; do
  echo "=== ${node} ==="
  kubectl debug ${node} -it --image=busybox --attach=false -- \
    chroot /host mount | grep bpf
done

# Check required sysctl settings
# net.ipv4.ip_forward must be 1
kubectl debug node/<node-name> -it --image=ubuntu -- \
  chroot /host sysctl net.ipv4.ip_forward

# Check that cgroups v2 is supported (recommended for Cilium 1.12+)
kubectl debug node/<node-name> -it --image=ubuntu -- \
  chroot /host stat /sys/fs/cgroup/cgroup.controllers
```

## Best Practices

- Run `cilium preflight check` before every Cilium installation or upgrade
- Maintain a node requirements matrix in your cluster documentation
- Subscribe to Cilium release notes to stay aware of requirement changes
- Use consistent node OS images across the fleet to simplify requirement management
- Document which Cilium features you use and the kernel requirements they impose

## Conclusion

Cilium's system requirements span Kubernetes version compatibility, Linux kernel capabilities, container runtime support, and system configuration. By systematically verifying each requirement tier before installation or upgrade, you avoid the most common failure modes. The investment in requirements verification pays off as a stable, feature-complete Cilium deployment that doesn't encounter runtime surprises from missing kernel capabilities.
