# Using calicoctl ipam split with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Kubernetes, IP Address Management

Description: Use calicoctl ipam split to divide IP blocks into smaller allocations for improved IP utilization and more granular per-node address management.

---

## Introduction

The `calicoctl ipam split` command is an IPAM management tool in Calico Enterprise. Understanding how to use it effectively helps you maintain healthy IP address allocation, troubleshoot address-related issues, and optimize IP utilization across your Kubernetes cluster.

Proper IP address management becomes increasingly important as clusters grow. Without visibility into how IPs are allocated and used, you risk pool exhaustion, address conflicts, and difficulty troubleshooting connectivity issues.

This guide provides practical examples of using `calicoctl ipam split` for common operational scenarios.

## Prerequisites

- Kubernetes cluster with Calico Enterprise IPAM
- `calicoctl` installed, configured, and version-matched with the cluster
- Admin-level access to the Calico datastore
- Understanding of IP addressing and CIDR notation

## Basic Usage

```bash
# Split the IP pool containing 10.244.0.0/24 into 4 smaller pools

calicoctl datastore migrate lock
calicoctl ipam split --cidr=10.244.0.0/24 4
calicoctl datastore migrate unlock
```

This divides one pool into four equally sized smaller pools. The number of splits must be a power of 2 (2, 4, 8, 16, etc.).

## Understanding Pool Splitting

Calico allocates IP addresses from IP pools. Sometimes you need to split a larger pool into smaller pools for better management and distribution:

```text
Before split: 10.244.0.0/24 (256 IPs, one pool)
After split:  10.244.0.0/26   (64 IPs)
              10.244.0.64/26  (64 IPs)
              10.244.0.128/26 (64 IPs)
              10.244.0.192/26 (64 IPs)
```

## When to Split Pools

- **Topology-specific allocation**: Creating smaller pools that can be selected by node, namespace, or workload
- **Pool segmentation**: Dividing a large pool into smaller child pools for operational control
- **During cluster planning**: Preparing address ranges before node or workload placement changes
- **IP utilization optimization**: Breaking up underutilized large pools

## Practical Example: Pool Split Workflow

```bash
# Step 1: Check current pool allocation
calicoctl ipam show --show-blocks

# Step 2: Identify large pools that need splitting
calicoctl get ippools -o wide

# Step 3: Split the pool into 4 smaller pools (must be a power of 2)
calicoctl datastore migrate lock
calicoctl ipam split --cidr=10.244.0.0/24 4
calicoctl datastore migrate unlock

# Step 4: Verify the split
calicoctl get ippools -o wide
```

## Planning a Split Operation

```bash
#!/bin/bash
# plan-ipam-split.sh
# Plans pool splits based on current allocation

echo "=== IPAM Split Planning ==="

TARGET_SIZE=26  # Desired pool size (/26 = 64 IPs)

echo "Current pool allocation:"
calicoctl get ippools -o wide

echo ""
echo "Recommended splits:"
# This analysis would identify pools larger than the target size
# and suggest split operations

calicoctl get ippools -o json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for pool in data.get('items', []):
    cidr = pool['spec']['cidr']
    prefix = int(cidr.split('/')[1])
    if prefix < $TARGET_SIZE:
        num_splits = 2 ** ($TARGET_SIZE - prefix)
        name = pool['metadata']['name']
        print(f'  Split: {cidr} into {num_splits} pools (calicoctl ipam split --name={name} {num_splits})')
"
```

## Pre-Split Validation

```bash
#!/bin/bash
# pre-split-check.sh

POOL_NAME="$1"
NUM_SPLITS="$2"

echo "Pre-split validation for pool $POOL_NAME into $NUM_SPLITS parts"

# Check the pool exists
echo "Current pool details:"
calicoctl get ippool "$POOL_NAME" -o wide

# Check how many IPs are in use
echo "Current utilization:"
calicoctl ipam show

echo ""
# Verify num_splits is a power of 2
if (( NUM_SPLITS < 2 || (NUM_SPLITS & (NUM_SPLITS - 1)) != 0 )); then
  echo "ERROR: Number of splits must be a power of 2"
  exit 1
fi
echo "Will split into $NUM_SPLITS equal pools"
echo "Remember to run 'calicoctl datastore migrate lock' before the split and 'calicoctl datastore migrate unlock' after it"
```


## Verification

After running `calicoctl ipam split`, verify the results:

```bash
# Check overall IPAM state
calicoctl ipam show

# Verify no issues
calicoctl ipam check

# Confirm pod connectivity
kubectl run verify-test --image=busybox --restart=Never -- sleep 30
sleep 5
kubectl get pod verify-test -o wide
kubectl delete pod verify-test --grace-period=0
```

## Troubleshooting

- **Command returns empty output**: Verify datastore connectivity with `calicoctl get nodes`.
- **Permission errors**: Ensure RBAC allows access to IPAM resources (ipamblocks, ipamhandles, blockaffinities, ippools).
- **Unexpected results**: Cross-reference with `kubectl get pods --all-namespaces -o wide` to verify actual pod state matches IPAM records.

## Conclusion

`calicoctl ipam split` is a vital tool for maintaining visibility into and control over your cluster's IP address allocation. Regular use as part of your operational workflows ensures healthy IPAM state and prevents IP-related issues from impacting your workloads.
