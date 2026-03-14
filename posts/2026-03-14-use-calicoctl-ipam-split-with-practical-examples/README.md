# Using calicoctl ipam split with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, IPAM, Kubernetes, IP Address Management

Description: Use calicoctl ipam split to divide IP blocks into smaller allocations for improved IP utilization and more granular per-node address management.

---

## Introduction

The `calicoctl ipam split` command is an essential IPAM management tool in Calico. Understanding how to use it effectively helps you maintain healthy IP address allocation, troubleshoot address-related issues, and optimize IP utilization across your Kubernetes cluster.

Proper IP address management becomes increasingly important as clusters grow. Without visibility into how IPs are allocated and used, you risk pool exhaustion, address conflicts, and difficulty troubleshooting connectivity issues.

This guide provides practical examples of using `calicoctl ipam split` for common operational scenarios.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` v3.25+ installed and configured
- Admin-level access to the Calico datastore
- Understanding of IP addressing and CIDR notation

## Basic Usage

```bash
# Split a /24 block into /26 blocks
calicoctl ipam split 10.244.0.0/24 --cidr-size=26
```

This divides one block of 256 IPs into four blocks of 64 IPs each, allowing them to be distributed across multiple nodes.

## Understanding Block Splitting

Calico allocates IP addresses in blocks. The default block size is /26 (64 IPs). Sometimes you need to split larger allocations into smaller blocks for better distribution:

```
Before split: 10.244.0.0/24 (256 IPs, one node)
After split:  10.244.0.0/26   (64 IPs)
              10.244.0.64/26  (64 IPs)
              10.244.0.128/26 (64 IPs)
              10.244.0.192/26 (64 IPs)
```

## When to Split Blocks

- **Uneven IP distribution**: One node holds a large block while others are starved
- **After changing block size**: When reducing the default block size in an IP pool
- **During cluster rebalancing**: Redistributing IPs after node additions
- **IP utilization optimization**: Breaking up underutilized large blocks

## Practical Example: Rebalancing After Block Size Change

```bash
# Step 1: Check current block allocation
calicoctl ipam show --show-blocks

# Step 2: Identify large blocks that need splitting
# Look for blocks larger than the desired size

# Step 3: Split the blocks
calicoctl ipam split 10.244.0.0/24 --cidr-size=26

# Step 4: Verify the split
calicoctl ipam show --show-blocks
```

## Planning a Split Operation

```bash
#!/bin/bash
# plan-ipam-split.sh
# Plans block splits based on current allocation

echo "=== IPAM Split Planning ==="

TARGET_SIZE=26  # Desired block size (/26 = 64 IPs)

echo "Current block allocation:"
calicoctl ipam show --show-blocks

echo ""
echo "Recommended splits:"
# This analysis would identify blocks larger than the target size
# and suggest split operations

calicoctl ipam show --show-blocks 2>/dev/null | grep "Block" | while read -r line; do
  CIDR=$(echo "$line" | awk '{print $4}')
  PREFIX=$(echo "$CIDR" | cut -d/ -f2)
  if [ -n "$PREFIX" ] && [ "$PREFIX" -lt "$TARGET_SIZE" ]; then
    echo "  Split: $CIDR -> /$TARGET_SIZE blocks"
  fi
done
```

## Pre-Split Validation

```bash
#!/bin/bash
# pre-split-check.sh

BLOCK="$1"
TARGET_SIZE="$2"

echo "Pre-split validation for $BLOCK -> /$TARGET_SIZE"

# Check the block exists
calicoctl ipam show --ip=$(echo "$BLOCK" | cut -d/ -f1)

# Check how many IPs are in use
echo "Current utilization:"
calicoctl ipam show --show-blocks | grep "$BLOCK"

echo ""
echo "After split, the block will become:"
# Calculate the number of sub-blocks
CURRENT_PREFIX=$(echo "$BLOCK" | cut -d/ -f2)
NUM_BLOCKS=$((1 << (TARGET_SIZE - CURRENT_PREFIX)))
echo "  $NUM_BLOCKS blocks of /$TARGET_SIZE"
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
