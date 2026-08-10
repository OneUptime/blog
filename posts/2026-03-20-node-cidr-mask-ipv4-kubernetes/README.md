# How to Configure Node CIDR Mask Size for IPv4 Pod Allocation in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv4, Node CIDR, Pod Allocation, kube-controller-manager, Networking

Description: Adjust the node CIDR mask size in Kubernetes to control how many IPv4 pod addresses are allocated per node from the cluster's Pod CIDR range.

The node CIDR mask size determines how large a subnet each node receives from the cluster's Pod CIDR. A `/24` gives each node 254 usable pod IPs; a `/26` gives only 62. This balances pod density against the number of nodes the cluster can support.

## How CIDR Allocation Works

```text
Cluster Pod CIDR: 10.244.0.0/16 (65,536 addresses)
Node CIDR mask:   /24 (256 addresses per node)
Maximum nodes:    65,536 / 256 = 256 nodes
Pods per node:    256 - 2 (network/broadcast) - reserved ≈ 110

Node CIDR mask:   /26 (64 addresses per node)
Maximum nodes:    65,536 / 64 = 1,024 nodes
Pods per node:    64 - 2 - reserved ≈ 60
```

## Setting the Node CIDR Mask

The mask is set on `kube-controller-manager` via `--node-cidr-mask-size`:

### During kubeadm init

```yaml
# kubeadm-config.yaml

apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
controllerManager:
  extraArgs:
    # Each node gets a /24 subnet (254 usable IPs)
    node-cidr-mask-size: "24"
```

```bash
sudo kubeadm init --config kubeadm-config.yaml
```

### After Cluster Init (Modify Static Pod)

```bash
# Edit the kube-controller-manager static pod manifest
sudo nano /etc/kubernetes/manifests/kube-controller-manager.yaml

# Find and modify or add the --node-cidr-mask-size argument:
# - --node-cidr-mask-size=24
```

The kubelet automatically restarts the static pod after the file is saved.

## Verifying the Mask Size

```bash
# Check the running controller manager configuration
kubectl get pod -n kube-system kube-controller-manager-<node> -o yaml | \
  grep node-cidr-mask-size

# Check node CIDR allocations
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
# Expected:
# master    10.244.0.0/24
# worker1   10.244.1.0/24
# worker2   10.244.2.0/24
```

## Choosing the Right Mask Size

```bash
# Calculation helper
CLUSTER_CIDR_BITS=16          # /16 cluster pod CIDR
NODE_CIDR_BITS=24             # /24 per node
MAX_NODES=$((2**(NODE_CIDR_BITS - CLUSTER_CIDR_BITS)))
PODS_PER_NODE=$((2**(32 - NODE_CIDR_BITS) - 2))

echo "Max nodes: $MAX_NODES"
echo "Pods per node: $PODS_PER_NODE"
```

| Cluster CIDR | Node Mask | Max Nodes | Pods/Node |
|---|---|---|---|
| /16 | /24 | 256 | 254 |
| /16 | /25 | 512 | 126 |
| /16 | /26 | 1024 | 62 |
| /14 | /24 | 1024 | 254 |

## Default Kubernetes Limits

Kubernetes supports a maximum of 110 pods per node by default (configurable via `--max-pods` on kubelet). Ensure your node CIDR provides at least 128 addresses (use /25 or larger) for safe headroom.

```bash
# Check kubelet's max-pods setting
kubectl get node worker1 -o jsonpath='{.status.allocatable.pods}'
# Default: 110
```

Balance between more pods per node (larger CIDR per node) and more total nodes (smaller CIDR per node) based on your cluster's scaling requirements.
