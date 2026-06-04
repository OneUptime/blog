# How to configure pod network CIDR allocation per node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, IPAM, CIDR, CNI

Description: Learn how to configure per-node pod CIDR allocation in Kubernetes for efficient IP address management including node IPAM controller setup, custom CIDR ranges, and troubleshooting IP exhaustion.

---

Pod network CIDR allocation determines how IP addresses are distributed across nodes in your Kubernetes cluster. In clusters that enable Kubernetes node CIDR allocation, each node receives a subnet from the cluster's pod CIDR range, and pods on that node get IPs from the node's subnet when the CNI plugin uses that allocation. Understanding and configuring per-node CIDR allocation lets you optimize IP address usage and avoid exhaustion in large clusters.

## Understanding Node CIDR Allocation

When you initialize a Kubernetes cluster that uses node CIDR allocation, you specify a pod network CIDR (like 10.244.0.0/16). The controller manager's node IPAM (IP Address Management) controller divides this range into smaller subnets and assigns one subnet to each node.

The size of each node's subnet is determined by the node CIDR mask size. For example, if your cluster CIDR is 10.244.0.0/16 and the node mask is /24, each node gets a /24 subnet (256 addresses). The number of pods that can actually run on the node also depends on CNI reservations and the kubelet's `maxPods` setting.

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
    image: registry.k8s.io/kube-controller-manager:v1.28.0
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

The node CIDR mask size determines how many pod IP addresses can be allocated per node. Here's how different mask sizes affect capacity:

```bash
# /24 subnet: 256 addresses

--node-cidr-mask-size=24

# /25 subnet: 128 addresses
--node-cidr-mask-size=25

# /23 subnet: 512 addresses
--node-cidr-mask-size=23

# /26 subnet: 64 addresses
--node-cidr-mask-size=26
```

Calculate the total number of nodes you can support:

```text
Nodes = 2^(node-mask - cluster-mask)

For 10.244.0.0/16 with /24 node masks:
Nodes = 2^(24-16) = 2^8 = 256 nodes

For 10.244.0.0/16 with /26 node masks:
Nodes = 2^(26-16) = 2^10 = 1024 nodes
```

Choose your mask size based on your cluster requirements:

```yaml
# Small cluster, many pods per node
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
controllerManager:
  extraArgs:
    - name: node-cidr-mask-size
      value: "23"  # 512 addresses per node, 128 max node CIDRs
---
# Large cluster, fewer pods per node
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
controllerManager:
  extraArgs:
    - name: node-cidr-mask-size
      value: "25"  # 128 addresses per node, 512 max node CIDRs
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

Your CNI plugin must be configured consistently with the node CIDR allocation model. Some CNIs use the node's allocated CIDR directly, while others have their own IPAM and only need a compatible cluster-wide pod CIDR.

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

With Calico IPAM, Calico does not use the Kubernetes `Node.spec.podCIDR` allocation by default. It allocates blocks from Calico IPPools instead. The blockSize is typically smaller than the overall IPPool for more granular allocation.

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

Flannel's SubnetLen should match the per-node subnet size you want to use. In Kubernetes mode, flannel uses the Kubernetes API as its subnet manager and expects the configured network to match the cluster's pod CIDR.

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
        "subnet": "10.244.1.0/24"
      }]
    ],
    "routes": [
      { "dst": "0.0.0.0/0" }
    ]
  }
}
```

The host-local IPAM plugin expects a concrete CIDR in the `subnet` field. If you build a custom CNI around node CIDR allocation, your CNI or installer needs to read the node's `podCIDR` from the Kubernetes API and render the node-specific subnet into this configuration.

## Handling CIDR Exhaustion

When you run out of available CIDRs, new nodes can register but cannot be assigned pod CIDRs. Monitor CIDR usage to prevent this:

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

# New: /26 = 1024 nodes (but only 64 addresses per node)
--node-cidr-mask-size=26
```

**Option 3: Use CNI-specific IP pools for node groups**

For CNIs with their own IPAM, configure node-specific pools using the CNI's supported mechanisms. For example, Calico IPPools can be limited to selected nodes:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: special-node-pool
spec:
  cidr: 10.250.0.0/24
  blockSize: 26
  natOutgoing: true
  nodeSelector: 'node-pool == "special"'
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

# Verify the IPAM section uses a node-specific CIDR
# For host-local IPAM, this should be a concrete subnet for that node
```

## Implementing Custom CIDR Allocation

For advanced scenarios, you can implement custom CIDR allocation logic. Here's a basic example using the Kubernetes API:

```go
package main

import (
    "context"
    "fmt"
    "net"

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
