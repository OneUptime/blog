# Using calicoctl ipam configure with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, IP Address Management, Kubernetes

Description: Configure Calico's IP Address Management with calicoctl ipam configure, including strict affinity settings and IPAM behavior tuning for optimal IP allocation.

---

## Introduction

Calico's IPAM (IP Address Management) system is responsible for allocating IP addresses to pods across your cluster. The `calicoctl ipam configure` command allows you to tune IPAM behavior, most notably the strict affinity setting that controls whether nodes may borrow IP addresses from blocks affine to other nodes.

Proper IPAM configuration is crucial for large clusters where IP address exhaustion, fragmentation, or allocation conflicts can occur. Understanding and correctly configuring IPAM parameters prevents pods from getting stuck in pending state due to IP allocation failures.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` v3.25+ installed
- Understanding of IP address management concepts
- Knowledge of your cluster's IP pool configuration

## Understanding Strict Affinity

The primary setting controlled by `calicoctl ipam configure` is strict affinity:

```bash
# View current IPAM configuration

calicoctl ipam show --show-configuration
```

Output:

```text
+--------------------+-------+
|      PROPERTY      | VALUE |
+--------------------+-------+
| StrictAffinity     | false |
| AutoAllocateBlocks | true  |
+--------------------+-------+
```

- **StrictAffinity: false** (default): Nodes can borrow addresses from blocks that are affine to other nodes when their own blocks are exhausted. This maximizes IP utilization but can make IP-to-node ownership less direct.
- **StrictAffinity: true**: Borrowing IP addresses from blocks affine to other nodes is not allowed. Required for Calico for Windows when using Calico IPAM, and useful when you need predictable IP-to-node mapping, at the cost of potentially lower IP utilization.

## Enabling Strict Affinity

```bash
# Enable strict affinity
calicoctl ipam configure --strictaffinity=true

# Verify the change
calicoctl ipam show --show-configuration
```

When to use strict affinity:
- Running Calico for Windows with Calico IPAM
- When you need predictable IP-to-node mapping
- When external systems need to route to pods based on IP prefix

## Disabling Strict Affinity

```bash
# Disable strict affinity (return to default)
calicoctl ipam configure --strictaffinity=false

# Verify
calicoctl ipam show --show-configuration
```

When to disable strict affinity:
- Small IP pools where block fragmentation wastes addresses
- Clusters with highly variable pod counts per node
- When IP utilization is more important than routing simplicity

## Practical Example: AWS Single-Subnet Routing

For AWS deployments using Calico routing within a single VPC subnet:

```bash
# Step 1: Verify the current IPAM configuration
calicoctl ipam show --show-configuration

# Step 2: Verify IP pools are configured correctly
calicoctl get ippools -o yaml
```

Expected IP pool for AWS:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  ipipMode: Never
  natOutgoing: true
  nodeSelector: all()
  vxlanMode: Never
```

```bash
# Step 3: Verify IPAM block allocation
calicoctl ipam show --show-blocks
```

## Configuring Block Size

While block size is set on the IP pool (not via `ipam configure`), it works in conjunction with strict affinity:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-pool
spec:
  cidr: 10.244.0.0/16
  blockSize: 26  # 64 IPs per block
  natOutgoing: true
  nodeSelector: all()
```

With strict affinity enabled and blockSize of 26, each affine block contains 64 IPs and cannot be borrowed from by another node.

## Impact Assessment Before Changing

```bash
#!/bin/bash
# assess-ipam-change.sh
# Assess the impact of changing strict affinity

echo "=== IPAM Configuration Assessment ==="

# Current setting
echo "Current configuration:"
calicoctl ipam show --show-configuration

# Current IP utilization
echo ""
echo "Current IP utilization:"
calicoctl ipam show

# Block allocation
echo ""
echo "Block allocation:"
calicoctl ipam show --show-blocks

# Count pods per node
echo ""
echo "Pods per node:"
kubectl get pods --all-namespaces -o json | python3 -c "
import json, sys
from collections import Counter
data = json.load(sys.stdin)
nodes = Counter(p['spec'].get('nodeName','unscheduled') for p in data['items'] if p['status'].get('phase')=='Running')
for node, count in sorted(nodes.items()):
    print(f'  {node}: {count} pods')
"
```

## Verification

After configuring IPAM:

```bash
# Verify configuration
calicoctl ipam show --show-configuration

# Check IP allocation still works
kubectl run test-ipam --image=busybox --restart=Never -- sleep 30
kubectl get pod test-ipam -o jsonpath='{.status.podIP}'
kubectl delete pod test-ipam

# Check block allocation
calicoctl ipam show --show-blocks
```

## Troubleshooting

- **Pods stuck in pending after enabling strict affinity**: The node may have exhausted its block allocation, reached the configured per-host block limit, or the pool may have no free blocks. Check with `calicoctl ipam show --show-blocks` and consider adding more IP pools.
- **Suspected IPAM inconsistencies**: Run `calicoctl ipam check` to identify leaked or incorrectly allocated IPs.
- **Cannot change strict affinity**: Ensure you have admin-level access to the Calico datastore.
- **IP utilization dropped after enabling strict affinity**: This is expected. Each node exclusively owns its blocks, so some IPs in partially-used blocks become unavailable to other nodes.

## Conclusion

`calicoctl ipam configure` gives you control over how Calico allocates IP addresses across your cluster. The strict affinity setting is the most impactful configuration, affecting IP utilization and whether workloads can use addresses from blocks affine to other nodes. Always assess the impact before changing this setting in production and verify IP allocation works correctly afterward.
