# Update Cilium System Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A comprehensive reference guide to Cilium's core system requirements, covering kernel versions, Linux capabilities, container runtime support, and Kubernetes version compatibility.

---

## Introduction

Cilium's powerful eBPF-based networking requires a specific set of system capabilities that differ significantly from traditional CNI plugins. Before deploying Cilium - or before upgrading an existing installation - it's essential to verify that your infrastructure meets all system requirements. Mismatched requirements are the leading cause of failed Cilium installations.

Cilium's requirements have evolved over time as the project has added new features. Some Cilium releases raise the minimum supported kernel version or add new Linux capability requirements. Operators must check requirements not just at initial installation but before every upgrade, as Cilium's minimum supported Kubernetes and kernel versions can change between releases.

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

kubectl version

# Check Cilium's supported Kubernetes version range
# Cilium 1.19 is tested with Kubernetes 1.31 through 1.34
# Always check: https://docs.cilium.io/en/stable/network/kubernetes/requirements/

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
| Base Cilium agent requirement | 5.10 or equivalent, such as 4.18 on RHEL 8.10 |
| Multicast support (Beta, AMD64) | 5.10 |
| IPv6 BIG TCP support | 5.19 |
| Multicast support (Beta, AArch64) | 6.0 |
| IPv4 BIG TCP support | 6.3 |
| WireGuard encryption | Kernel support for WireGuard, such as `CONFIG_WIREGUARD=m` on Linux 5.6 and newer |
| BBR for Pods with Bandwidth Manager | 5.18 |

```bash
# Check specific kernel capabilities on nodes
kubectl debug node/<node-name> -it --image=busybox --profile=sysadmin -- \
  chroot /host sh -c "uname -r && ls /sys/fs/bpf"
```

## Step 3: Verify Required Linux Capabilities

Cilium's agent pod requires specific Linux capabilities.

```bash
# Default Cilium Helm chart capabilities for cilium-agent include:
# CHOWN, KILL, NET_ADMIN, NET_RAW, IPC_LOCK, SYS_MODULE, SYS_ADMIN,
# SYS_RESOURCE, DAC_OVERRIDE, FOWNER, SETGID, SETUID, and SYSLOG.

# Verify the cilium-agent pod has required capabilities
kubectl get pod -n kube-system -l k8s-app=cilium \
  -o jsonpath='{.items[0].spec.containers[0].securityContext}'
```

## Step 4: Verify Container Runtime Support

Check that the container runtime meets Kubernetes and Cilium deployment requirements.

```bash
# Check container runtime on all nodes
kubectl get nodes \
  -o custom-columns="NODE:.metadata.name,RUNTIME:.status.nodeInfo.containerRuntimeVersion"

# Cilium runs with Kubernetes-supported CRI runtimes such as containerd and CRI-O.
# Docker Engine requires a CRI shim such as cri-dockerd on Kubernetes versions
# that no longer include the legacy dockershim integration.

# For containerd - verify CNI plugin path configuration
kubectl debug node/<node-name> -it --image=ubuntu --profile=sysadmin -- \
  chroot /host cat /etc/containerd/config.toml | grep cni
```

## Step 5: Verify BPF Filesystem and System Configuration

BPF filesystem and sysctl settings must be properly configured.

```bash
# Verify BPF filesystem is mounted on all nodes
kubectl get nodes -o name | while read node; do
  echo "=== ${node} ==="
  kubectl debug ${node} --image=busybox --profile=sysadmin --attach=true -- \
    chroot /host sh -c "mount | grep ' /sys/fs/bpf '"
done

# Check required sysctl settings
# net.ipv4.ip_forward must be 1
kubectl debug node/<node-name> -it --image=ubuntu --profile=sysadmin -- \
  chroot /host sysctl net.ipv4.ip_forward

# Check whether cgroup v2 is mounted on the node
kubectl debug node/<node-name> -it --image=ubuntu --profile=sysadmin -- \
  chroot /host stat /sys/fs/cgroup/cgroup.controllers
```

## Best Practices

- Run the Cilium pre-flight check from the official upgrade guide before every Cilium upgrade
- Maintain a node requirements matrix in your cluster documentation
- Subscribe to Cilium release notes to stay aware of requirement changes
- Use consistent node OS images across the fleet to simplify requirement management
- Document which Cilium features you use and the kernel requirements they impose

## Conclusion

Cilium's system requirements span Kubernetes version compatibility, Linux kernel capabilities, container runtime support, and system configuration. By systematically verifying each requirement tier before installation or upgrade, you avoid the most common failure modes. The investment in requirements verification pays off as a stable, feature-complete Cilium deployment that doesn't encounter runtime surprises from missing kernel capabilities.
