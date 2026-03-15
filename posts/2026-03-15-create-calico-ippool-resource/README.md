# How to Create the Calico IPPool Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPPool, Kubernetes, Networking, IPAM, DevOps

Description: Learn how to create and configure Calico IPPool resources to manage IP address allocation for pods in your Kubernetes cluster.

---

## Introduction

The IPPool resource in Calico defines ranges of IP addresses from which Calico assigns pod IPs. Each IPPool specifies a CIDR block along with configuration for NAT, encapsulation, and node selection. Without a properly configured IPPool, pods cannot receive IP addresses and will remain in a pending state.

When you install Calico, a default IPPool is typically created that covers a broad CIDR range. However, production environments often require multiple pools with different characteristics. You might need separate pools for different node groups, varying encapsulation modes, or distinct NAT behaviors.

This guide walks through creating IPPool resources from scratch, covering all essential fields and common configuration patterns.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20 or later recommended)
- `kubectl` configured with cluster admin access
- `calicoctl` installed for direct Calico API interaction
- Familiarity with CIDR notation and IP address planning

## Understanding IPPool Fields

Before creating an IPPool, it helps to understand the key fields available in the resource spec:

- **cidr**: The IP range for the pool in CIDR notation
- **vxlanMode**: VXLAN encapsulation mode (Always, CrossSubnet, or Never)
- **ipipMode**: IP-in-IP encapsulation mode (Always, CrossSubnet, or Never)
- **natOutgoing**: Whether pods using this pool should have their traffic masqueraded
- **nodeSelector**: Restricts which nodes can use this pool
- **blockSize**: The size of allocation blocks assigned to each node

## Creating a Basic IPPool

Start by defining a simple IPPool manifest:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-pool
spec:
  cidr: 10.244.0.0/16
  vxlanMode: CrossSubnet
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
```

Apply the resource using calicoctl:

```bash
calicoctl apply -f ippool.yaml
```

You can also use kubectl if the Calico API server is installed:

```bash
kubectl apply -f ippool.yaml
```

## Creating an IPPool with Node Selection

To restrict an IPPool to specific nodes, use the nodeSelector field:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-a-pool
spec:
  cidr: 10.245.0.0/20
  vxlanMode: Always
  natOutgoing: true
  nodeSelector: topology.kubernetes.io/zone == "us-east-1a"
  blockSize: 26
```

This ensures only nodes in zone us-east-1a allocate IPs from this pool.

## Creating an IPPool with IPIP Encapsulation

For environments that support IPIP tunneling:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: ipip-pool
spec:
  cidr: 10.246.0.0/16
  ipipMode: CrossSubnet
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
```

The CrossSubnet variants only encapsulate traffic crossing L3 boundaries, which reduces overhead for same-subnet communication.

## Creating an IPv6 IPPool

Calico supports dual-stack networking with IPv6 pools:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv6-pool
spec:
  cidr: fd00:10:244::/48
  vxlanMode: Never
  ipipMode: Never
  natOutgoing: false
  nodeSelector: all()
  blockSize: 122
```

IPv6 pools typically use a blockSize of 122, which gives 64 addresses per block.

## Verification

After creating an IPPool, verify it is active and available:

```bash
calicoctl get ippools -o wide
```

Check that new pods receive IPs from the correct pool:

```bash
kubectl run test-pod --image=busybox --restart=Never -- sleep 3600
kubectl get pod test-pod -o jsonpath='{.status.podIP}'
```

Confirm the assigned IP falls within your IPPool CIDR range. Inspect block allocations per node:

```bash
calicoctl ipam show --show-blocks
```

## Troubleshooting

If pods are not receiving IPs from the expected pool, check the following:

- Verify the IPPool is not disabled by running `calicoctl get ippool <name> -o yaml` and checking that `disabled` is not set to true
- Ensure the nodeSelector matches the target nodes by checking node labels with `kubectl get nodes --show-labels`
- Confirm the CIDR does not overlap with existing pools using `calicoctl get ippools -o wide`
- Check calico-node logs for IPAM errors: `kubectl logs -n calico-system -l k8s-app=calico-node --tail=50`
- Verify blockSize is appropriate for your cluster size (smaller blocks mean more blocks per node)

## Conclusion

Creating Calico IPPool resources gives you fine-grained control over IP address allocation in your cluster. By defining multiple pools with different CIDRs, encapsulation modes, and node selectors, you can segment your network to match your infrastructure topology. Start with a single pool for simple deployments and add additional pools as your networking requirements grow.
