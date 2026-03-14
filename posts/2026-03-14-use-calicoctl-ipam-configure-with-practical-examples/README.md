# Using calicoctl ipam configure with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, IP Address Management, Kubernetes

Description: Configure Calico's IP Address Management with calicoctl ipam configure, including strict affinity settings and IPAM behavior tuning for optimal IP allocation.

---

## Introduction

Calico's IPAM (IP Address Management) system is responsible for allocating IP addresses to pods across your cluster. The `calicoctl ipam configure` command allows you to tune IPAM behavior, most notably the strict affinity setting that controls whether IP blocks are exclusively owned by a single node.

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
calicoctl ipam configure show
```

Output:

```yaml
StrictAffinity: false
```

- **StrictAffinity: false** (default): IP blocks can be shared across nodes when a node's primary blocks are exhausted. This maximizes IP utilization but can complicate routing.
- **StrictAffinity: true**: Each IP block is exclusively assigned to a single node. Required for certain cloud provider integrations and simplifies routing at the cost of potentially lower IP utilization.

## Enabling Strict Affinity

```bash
# Enable strict affinity
calicoctl ipam configure --strictaffinity=true

# Verify the change
calicoctl ipam configure show
```

When to use strict affinity:
- Running on AWS with VPC routing
- Using Azure CNI integration
- When you need predictable IP-to-node mapping
- When external systems need to route to pods based on IP prefix

## Disabling Strict Affinity

```bash
# Disable strict affinity (return to default)
calicoctl ipam configure --strictaffinity=false

# Verify
calicoctl ipam configure show
```

When to disable strict affinity:
- Small IP pools where block fragmentation wastes addresses
- Clusters with highly variable pod counts per node
- When IP utilization is more important than routing simplicity

## Practical Example: AWS VPC Integration

For AWS deployments with VPC routing:

```bash
# Step 1: Enable strict affinity (required for AWS VPC routing)
calicoctl ipam configure --strictaffinity=true

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
  blockSize: 26  # 64 IPs per block per node
  natOutgoing: true
  nodeSelector: all()
```

With strict affinity enabled and blockSize of 26, each node gets exclusive blocks of 64 IPs.

## Impact Assessment Before Changing

```bash
#!/bin/bash
# assess-ipam-change.sh
# Assess the impact of changing strict affinity

echo "=== IPAM Configuration Assessment ==="

# Current setting
echo "Current configuration:"
calicoctl ipam configure show

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
calicoctl ipam configure show

# Check IP allocation still works
kubectl run test-ipam --image=busybox --restart=Never -- sleep 30
kubectl get pod test-ipam -o jsonpath='{.status.podIP}'
kubectl delete pod test-ipam

# Check block allocation
calicoctl ipam show --show-blocks
```

## Troubleshooting

- **Pods stuck in pending after enabling strict affinity**: The node may have exhausted its block allocation. Check with `calicoctl ipam show --show-blocks` and consider adding more IP pools.
- **IP conflicts after disabling strict affinity**: Run `calicoctl ipam check` to identify and resolve any conflicts.
- **Cannot change strict affinity**: Ensure you have admin-level access to the Calico datastore.
- **IP utilization dropped after enabling strict affinity**: This is expected. Each node exclusively owns its blocks, so some IPs in partially-used blocks become unavailable to other nodes.

## Conclusion

`calicoctl ipam configure` gives you control over how Calico allocates IP addresses across your cluster. The strict affinity setting is the most impactful configuration, affecting routing behavior, IP utilization, and cloud provider integration. Always assess the impact before changing this setting in production and verify IP allocation works correctly afterward.
