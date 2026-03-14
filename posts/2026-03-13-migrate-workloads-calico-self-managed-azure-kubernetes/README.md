# How to Migrate Existing Workloads to Calico on Self-Managed Azure Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, Azure, Self-Managed

Description: Migrate existing workloads to Calico on self-managed Kubernetes clusters running on Azure Virtual Machines.

---

## Introduction

Self-managed Kubernetes on Azure VMs gives operators the flexibility to choose their networking stack independent of AKS constraints. Teams running kubeadm-based clusters on Azure often begin with a simple CNI like Flannel and later need Calico's richer network policy model, BGP support, or multi-pool IPAM as their cluster grows.

Azure's Virtual Network (VNet) provides the underlying L3 network, and Calico can operate in VXLAN or IP-in-IP encapsulation mode to overlay pod networking on top of the VNet fabric. Understanding how Azure VNet routes interact with Calico's data plane is essential for a smooth migration.

This guide covers the full migration path from an existing CNI to Calico on self-managed Azure Kubernetes, including VNet CIDR alignment, encapsulation selection, and post-migration validation using `calicoctl`.

## Prerequisites

- Self-managed Kubernetes cluster on Azure VMs (kubeadm recommended)
- `kubectl` with cluster-admin privileges
- `calicoctl` v3.27+ installed locally
- SSH access to Azure VM nodes or Azure Bastion configured
- Existing pod CIDR documented (from `kubeadm init --pod-network-cidr`)
- Azure VNet with non-overlapping address space for Calico IP pools

## Step 1: Document Current Network Configuration

Record your existing network settings before making any changes.

Capture current pod CIDRs and node assignments to reference during migration:

```bash
# List all nodes with their internal IPs
kubectl get nodes -o custom-columns=NAME:.metadata.name,IP:.status.addresses[0].address

# Check the current pod CIDR allocation
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'

# Document existing CNI configuration on a node
sudo cat /etc/cni/net.d/*.conf 2>/dev/null || sudo cat /etc/cni/net.d/*.conflist
```

## Step 2: Drain and Remove Existing CNI

Safely drain workloads and remove the current CNI DaemonSet.

Cordon and drain the target node before modifying its CNI configuration:

```bash
# Cordon the node to prevent new pod scheduling
kubectl cordon <node-name>

# Drain existing pods with a generous timeout for stateful workloads
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=180s

# Remove old CNI binaries and config on the node (via SSH)
sudo rm -f /etc/cni/net.d/*
sudo ip link delete cni0 2>/dev/null || true
sudo ip link delete flannel.1 2>/dev/null || true
sudo systemctl restart kubelet
```

## Step 3: Install Calico Operator

Deploy the Tigera operator which manages the Calico lifecycle.

Install the Calico operator and its CRDs onto your cluster:

```bash
# Apply the Tigera operator manifest
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Verify the operator pod is running
kubectl get pods -n tigera-operator
```

## Step 4: Configure Calico for Azure VNet

Create an Installation resource that aligns Calico's IP pools with your Azure VNet.

Configure VXLAN encapsulation since Azure VNet does not support BGP route injection by default:

```yaml
# calico-installation.yaml - Calico configuration for Azure self-managed Kubernetes
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      # Must not overlap with Azure VNet address space
      cidr: 10.244.0.0/16
      encapsulation: VXLAN   # Required for Azure VNet compatibility
      natOutgoing: Enabled
      nodeSelector: all()
---
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
```

Apply the configuration to the cluster:

```bash
kubectl create -f calico-installation.yaml
```

## Step 5: Validate and Uncordon Nodes

Verify Calico is operational and restore nodes to scheduling.

Confirm all Calico pods are healthy before uncordoning the node:

```bash
# Watch Calico system pods come online
kubectl get pods -n calico-system -w

# Verify node is reporting Ready in Calico
calicoctl get nodes -o wide

# Uncordon the migrated node
kubectl uncordon <node-name>

# Test connectivity between pods on different nodes
kubectl run test-pod --image=busybox --rm -it -- ping <target-pod-ip>
```

## Best Practices

- Align Calico IP pool CIDR with the `--pod-network-cidr` used during `kubeadm init`
- Use VXLAN encapsulation on Azure since User Defined Routes have per-route limits
- Enable Azure Accelerated Networking on VMs before migration for better throughput
- Apply a default-deny GlobalNetworkPolicy after migration to enforce zero-trust networking
- Monitor Calico node status with OneUptime synthetic checks to detect flapping peers

## Conclusion

Migrating to Calico on self-managed Azure Kubernetes unlocks advanced network policy, flexible IPAM, and improved observability compared to simpler CNI plugins. By carefully aligning IP pools with your VNet design and using VXLAN encapsulation, you can achieve a seamless migration. Integrate with OneUptime post-migration to continuously monitor network connectivity and enforce alerting on policy violations.
