# How to configure pod network CIDR allocation per node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, IPAM, CIDR, CNI

Description: Learn how to configure per-node pod CIDR allocation in Kubernetes for efficient IP address management including node IPAM controller setup, custom CIDR ranges, and troubleshooting IP exhaustion.

---

Pod network CIDR allocation determines how IP addresses are distributed across nodes in your Kubernetes cluster. By default, each node receives a subnet from the cluster's pod CIDR range, and pods on that node get IPs from the node's subnet. Understanding and configuring per-node CIDR allocation lets you optimize IP address usage and avoid exhaustion in large clusters.

## Understanding Node CIDR Allocation

When you initialize a Kubernetes cluster, you specify a pod network CIDR (like 10.244.0.0/16). The controller manager's node IPAM (IP Address Management) controller divides this range into smaller subnets and assigns one subnet to each node.

The size of each node's subnet is determined by the node CIDR mask size. For example, if your cluster CIDR is 10.244.0.0/16 and the node mask is /24, each node gets a /24 subnet (256 addresses), allowing for about 254 pods per node after accounting for network and broadcast addresses.

The node IPAM controller runs as part of kube-controller-manager. It watches for new nodes and allocates CIDRs from the available pool. When a node is deleted, its CIDR is eventually released back to the pool for reuse.

## Configuring Controller Manager for CIDR Allocation

The kube-controller-manager needs specific flags to enable and configure node CIDR allocation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-controller-manager
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-controller-manager
    - --allocate-node-cidrs=true
    - --cluster-cidr=10.244.0.0/16
    - --node-cidr-mask-size=24
    - --service-cluster-ip-range=10.96.0.0/12
    - --kubeconfig=/etc/kubernetes/controller-manager.conf
    - --authentication-kubeconfig=/etc/kubernetes/controller-manager.conf
    - --authorization-kubeconfig=/etc/kubernetes/controller-manager.conf
    - --leader-elect=true
    image: k8s.gcr.io/kube-controller-manager:v1.28.0
    name: kube-controller-manager
```

Key flags for CIDR allocation:

- `--allocate-node-cidrs=true`: Enables automatic CIDR allocation to nodes
- `--cluster-cidr`: The overall pod network CIDR range
- `--node-cidr-mask-size`: The subnet size for each node (default: 24)
- `--service-cluster-ip-range`: Service CIDR (must not overlap with pod CIDR)

For dual-stack IPv4/IPv6 clusters, you can specify multiple CIDRs:

```bash
--cluster-cidr=10.244.0.0/16,fd00:10:244::/56
--node-cidr-mask-size-ipv4=24
--node-cidr-mask-size-ipv6=64
```

## Setting Node CIDR Mask Size

The node CIDR mask size determines how many pods each node can support. Here's how different mask sizes affect capacity:

```bash
# /24 subnet: 256 addresses, ~254 pods per node
--node-cidr-mask-size=24

# /25 subnet: 128 addresses, ~126 pods per node
--node-cidr-mask-size=25

# /23 subnet: 512 addresses, ~510 pods per node
--node-cidr-mask-size=23

# /26 subnet: 64 addresses, ~62 pods per node
--node-cidr-mask-size=26
```

Calculate the total number of nodes you can support:

```
Nodes = 2^(node-mask - cluster-mask)

For 10.244.0.0/16 with /24 node masks:
Nodes = 2^(24-16) = 2^8 = 256 nodes

For 10.244.0.0/16 with /26 node masks:
Nodes = 2^(26-16) = 2^10 = 1024 nodes
```

Choose your mask size based on your cluster requirements:

```yaml
# Small cluster, many pods per node
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
controllerManager:
  extraArgs:
    node-cidr-mask-size: "23"  # 510 pods per node, 128 max nodes
---
# Large cluster, fewer pods per node
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
controllerManager:
  extraArgs:
    node-cidr-mask-size: "25"  # 126 pods per node, 512 max nodes
```

## Viewing Node CIDR Allocations

Check which CIDR each node has been allocated:

```bash
# View node CIDRs
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CIDR:.spec.podCIDR,\
CIDRS:.spec.podCIDRs

# Example output:
# NAME        CIDR              CIDRS
# node-1      10.244.0.0/24     10.244.0.0/24
# node-2      10.244.1.0/24     10.244.1.0/24
# node-3      10.244.2.0/24     10.244.2.0/24

# View detailed node information
kubectl get node node-1 -o yaml | grep -A 5 podCIDR

# Check CIDR allocation status
kubectl describe node node-1 | grep PodCIDR
```

For dual-stack clusters, you'll see both IPv4 and IPv6 CIDRs:

```bash
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDRs}{"\n"}{end}'

# Output:
# node-1  ["10.244.0.0/24","fd00:10:244:0::/64"]
# node-2  ["10.244.1.0/24","fd00:10:244:1::/64"]
```

## Configuring CNI to Use Node CIDRs

Your CNI plugin must read and use the node's allocated CIDR. Most CNIs do this automatically, but here's how it works with common plugins:

**Calico configuration:**

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  blockSize: 26  # Calico's internal block size
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
```

Calico reads the node's podCIDR and creates IP blocks within that CIDR. The blockSize is typically smaller than the node CIDR mask for more granular allocation.

**Flannel configuration:**

```json
{
  "Network": "10.244.0.0/16",
  "SubnetLen": 24,
  "SubnetMin": "10.244.0.0",
  "SubnetMax": "10.244.255.0",
  "Backend": {
    "Type": "vxlan"
  }
}
```

Flannel's SubnetLen should match your node CIDR mask size. Flannel allocates subnets to nodes and stores the mapping in etcd or the Kubernetes API.

**Host-local IPAM (for custom CNIs):**

```json
{
  "cniVersion": "0.4.0",
  "name": "mynet",
  "type": "bridge",
  "bridge": "cni0",
  "ipam": {
    "type": "host-local",
    "ranges": [
      [{
        "subnet": "usePodCIDR"
      }]
    ],
    "routes": [
      { "dst": "0.0.0.0/0" }
    ]
  }
}
```

The special value `"usePodCIDR"` tells the host-local IPAM plugin to read the node's podCIDR field from the Kubernetes API.

## Handling CIDR Exhaustion

When you run out of available CIDRs, new nodes can't join the cluster. Monitor CIDR usage to prevent this:

```bash
# Count allocated nodes vs available CIDRs
kubectl get nodes --no-headers | wc -l

# Calculate available CIDRs based on your configuration
# For 10.244.0.0/16 with /24 node masks: 256 possible CIDRs

# Check for nodes without CIDRs (indicates allocation failure)
kubectl get nodes -o json | jq -r '.items[] | select(.spec.podCIDR == null) | .metadata.name'
```

If you're approaching exhaustion, you have several options:

**Option 1: Expand the cluster CIDR (requires cluster rebuild)**

This is disruptive but provides the most headroom:

```bash
# New cluster configuration
--cluster-cidr=10.240.0.0/12  # Expands from /16 to /12 (16x more addresses)
--node-cidr-mask-size=24
```

**Option 2: Increase node CIDR mask size (requires node recreation)**

Smaller per-node subnets allow more nodes:

```bash
# Original: /24 = 256 nodes
--node-cidr-mask-size=24

# New: /26 = 1024 nodes (but only 62 pods per node)
--node-cidr-mask-size=26
```

**Option 3: Use pod CIDR per node annotation**

Manually specify CIDRs for specific nodes:

```bash
kubectl annotate node special-node \
  projectcalico.org/IPv4IPIPTunnelAddr=10.250.0.1 \
  projectcalico.org/IPv4Address=10.250.0.1/24
```

## Troubleshooting CIDR Allocation

When nodes don't receive CIDRs or pods can't get IPs, check these areas:

```bash
# 1. Verify controller-manager is allocating CIDRs
kubectl logs -n kube-system kube-controller-manager-xxx | grep -i cidr

# Look for:
# "Allocated CIDR 10.244.1.0/24 to node node-2"

# 2. Check for allocation errors
kubectl logs -n kube-system kube-controller-manager-xxx | grep -i "error.*cidr"

# Common errors:
# - "CIDR allocation failed: out of CIDRs"
# - "CIDR allocation failed: CIDR already in use"

# 3. Verify node has CIDR
kubectl get node problematic-node -o yaml | grep podCIDR

# 4. Check CNI plugin logs
journalctl -u kubelet | grep CNI
kubectl logs -n kube-system <cni-pod> | grep IPAM

# 5. Verify IP allocation on the node
kubectl get pods -A -o wide --field-selector spec.nodeName=node-1
# All pod IPs should be within the node's CIDR
```

For CNI plugins that don't automatically use node CIDRs:

```bash
# Check CNI config on the node
cat /etc/cni/net.d/*

# Verify the IPAM section references the node CIDR
# Should see "usePodCIDR" or similar mechanism
```

## Implementing Custom CIDR Allocation

For advanced scenarios, you can implement custom CIDR allocation logic. Here's a basic example using the Kubernetes API:

```go
package main

import (
    "context"
    "fmt"
    "net"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func allocateCIDR(nodeName string, cidr string) error {
    config, err := rest.InClusterConfig()
    if err != nil {
        return err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return err
    }

    node, err := clientset.CoreV1().Nodes().Get(context.TODO(), nodeName, metav1.GetOptions{})
    if err != nil {
        return err
    }

    // Validate CIDR format
    _, _, err = net.ParseCIDR(cidr)
    if err != nil {
        return fmt.Errorf("invalid CIDR: %v", err)
    }

    // Update node with CIDR
    node.Spec.PodCIDR = cidr
    node.Spec.PodCIDRs = []string{cidr}

    _, err = clientset.CoreV1().Nodes().Update(context.TODO(), node, metav1.UpdateOptions{})
    return err
}
```

This approach is useful when you need more complex allocation logic, like reserving specific CIDR ranges for different node pools or implementing custom IP address planning schemes.

Proper pod network CIDR allocation is fundamental to cluster networking. By understanding how node CIDRs are allocated and configuring the allocation parameters correctly, you can build clusters that scale efficiently while avoiding IP address exhaustion.
