# How to Monitor Calico IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Networking, IP Management

Description: Monitor Calico IPAM health with metrics on IP pool utilization, block allocations, and allocation failures to prevent pod scheduling issues.

---

## Introduction

Calico IPAM (IP Address Management) is responsible for assigning IP addresses to pods from configured IP pools. Unlike simpler CNIs that pre-allocate large blocks per node, Calico IPAM uses a dynamic block allocation scheme where each node is assigned blocks (default /26, 64 IPs) on demand as pods are created. This allows for efficient IP utilization across large clusters with variable pod density.

The IPAM system tracks allocations in the Calico datastore (Kubernetes CRDs or etcd), maintains block affinity mappings between nodes and CIDR blocks, and supports advanced features like topology-aware allocation, IP pool selection via node selectors, and specific IP assignment for pods that need consistent addressing.

## Prerequisites

- Calico v3.20+ installed
- kubectl and calicoctl configured
- IP pools configured

## Monitor Calico IPAM

```bash
# View current IPAM allocations
calicoctl ipam show --show-blocks

# Check IP pool utilization
calicoctl ipam show --show-configuration

# View node block assignments
kubectl get ipamhandles -A

# Check for leaked allocations
calicoctl ipam check
```

## Configure IPAM Settings

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - cidr: 10.48.0.0/16
      blockSize: 26
      natOutgoing: Enabled
      encapsulation: VXLAN
```

## IPAM Block Allocation

```mermaid
graph TB
    subgraph IP Pool 10.48.0.0/16
        B1[Block 10.48.0.0/26\nNode 1 - 64 IPs]
        B2[Block 10.48.0.64/26\nNode 2 - 64 IPs]
        B3[Block 10.48.0.128/26\nNode 3 - 64 IPs]
        B4[Block 10.48.N.0/26\nAllocated on demand]
    end
    N1[Node 1] --> B1
    N2[Node 2] --> B2
    N3[Node 3] --> B3
```

## Verify IPAM Health

```bash
# Run IPAM consistency check
calicoctl ipam check -o ipam-report.json

# List all allocated IPs
calicoctl ipam check --show-all-ips

# Check for orphaned allocations
calicoctl ipam check --show-all-ips
```

## Conclusion

Calico IPAM provides flexible, efficient IP address management for Kubernetes clusters. The block-based allocation scheme balances per-node IP availability with overall pool utilization. Regular IPAM health checks catch orphaned allocations and pool exhaustion before they cause pod scheduling failures. Monitor IP pool utilization and expand pools proactively before exhaustion affects your cluster.
