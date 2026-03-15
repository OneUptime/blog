# How to Use calicoctl ipam split with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Kubernetes, Networking, IP Address Management, Scaling

Description: Learn how to use calicoctl ipam split to divide IP pools into smaller blocks for better distribution across cluster nodes.

---

## Introduction

As Kubernetes clusters grow, efficient distribution of IP address blocks across nodes becomes critical. The `calicoctl ipam split` command allows you to divide an existing IP pool into smaller, more granular blocks that can be distributed more evenly across nodes.

By splitting IP pools, you gain finer control over IP allocation density per node and can optimize address utilization in clusters where some nodes handle more pods than others. This is particularly useful when migrating from a small cluster to a larger one or when you need to rebalance IP allocations.

This guide demonstrates how to use `calicoctl ipam split` to manage IP pool segmentation and plan your IPAM architecture.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` configured with datastore access
- Understanding of CIDR notation and subnetting
- Current IPAM state reviewed with `calicoctl ipam show`

## Understanding IP Pool Block Sizes

Calico divides IP pools into blocks (default /26, providing 64 IPs per block). The `ipam split` command operates on these blocks. Before splitting, understand your current layout:

```bash
calicoctl ipam show --show-blocks
```

Example output:

```text
+----------+----------------+-----------+------------+-----------+
| GROUPING |      CIDR      | IPS TOTAL | IPS IN USE | IPS FREE  |
+----------+----------------+-----------+------------+-----------+
| IP Pool  | 10.244.0.0/16  |    65536  |     342    |   65194   |
| Block    | 10.244.0.0/26  |       64  |      45    |      19   |
| Block    | 10.244.0.64/26 |       64  |      28    |      36   |
| Block    | 10.244.1.0/26  |       64  |      60    |       4   |
+----------+----------------+-----------+------------+-----------+
```

## Splitting an IP Pool

Split an IP pool CIDR into a specified number of parts:

```bash
calicoctl ipam split 4 --cidr=10.244.0.0/16
```

This outputs the resulting CIDR blocks:

```text
10.244.0.0/18
10.244.64.0/18
10.244.128.0/18
10.244.192.0/18
```

Each resulting block covers 16384 IP addresses. Note that the number of parts must be a power of 2.

## Planning Splits for Multi-Zone Clusters

When running across multiple availability zones, split IP pools to assign ranges per zone:

```bash
# Split the main pool into 4 parts (must be a power of 2), then use 3 for 3 availability zones
calicoctl ipam split 4 --cidr=10.244.0.0/16
```

Output:

```text
10.244.0.0/18
10.244.64.0/18
10.244.128.0/18
10.244.192.0/18
```

Use the first three resulting CIDRs for your three zones (the fourth can be reserved for future use):

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-a-pool
spec:
  cidr: 10.244.0.0/18
  ipipMode: Always
  natOutgoing: true
  nodeSelector: topology.kubernetes.io/zone == "us-east-1a"
---
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-b-pool
spec:
  cidr: 10.244.64.0/18
  ipipMode: Always
  natOutgoing: true
  nodeSelector: topology.kubernetes.io/zone == "us-east-1b"
---
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-c-pool
spec:
  cidr: 10.244.128.0/18
  ipipMode: Always
  natOutgoing: true
  nodeSelector: topology.kubernetes.io/zone == "us-east-1c"
EOF
```

## Splitting for Tenant Isolation

In multi-tenant clusters, split IP pools to assign dedicated ranges per tenant:

```bash
# Split into 8 equal ranges for 8 tenants
calicoctl ipam split 8 --cidr=10.244.0.0/16
```

Output:

```text
10.244.0.0/19
10.244.32.0/19
10.244.64.0/19
10.244.96.0/19
10.244.128.0/19
10.244.160.0/19
10.244.192.0/19
10.244.224.0/19
```

Each tenant gets 8192 IP addresses. Create IP pools with namespace selectors to assign them:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: tenant-alpha-pool
spec:
  cidr: 10.244.0.0/19
  ipipMode: Always
  natOutgoing: true
```

## Calculating Split Results

Use a helper script to plan splits before applying them:

```bash
#!/bin/bash
CIDR=$1
PARTS=$2

if [ -z "$CIDR" ] || [ -z "$PARTS" ]; then
  echo "Usage: $0 <cidr> <number-of-parts>"
  exit 1
fi

echo "Splitting $CIDR into $PARTS parts:"
echo ""
calicoctl ipam split "$PARTS" --cidr="$CIDR"

# Calculate IPs per part
TOTAL_PREFIX=$(echo "$CIDR" | cut -d'/' -f2)
TOTAL_IPS=$((2 ** (32 - TOTAL_PREFIX)))
IPS_PER_PART=$((TOTAL_IPS / PARTS))
echo ""
echo "Total IPs: $TOTAL_IPS"
echo "IPs per part: $IPS_PER_PART"
```

## Verification

After creating IP pools from split CIDRs, verify the configuration:

```bash
# List all IP pools
calicoctl get ippools -o wide

# Check that pools do not overlap
calicoctl get ippools -o yaml | grep cidr

# Verify IPAM can allocate from new pools
calicoctl ipam show
```

Deploy a test pod and verify it gets an IP from the expected pool:

```bash
kubectl run test-pod --image=busybox --command -- sleep 3600
kubectl get pod test-pod -o wide
```

## Troubleshooting

- **Overlapping CIDRs**: Ensure the split results do not overlap with existing IP pools. Use `calicoctl get ippools` to check before creating new pools.
- **Power of 2 requirement**: The number of parts must be a power of 2 (2, 4, 8, 16, etc.). If you need a non-power-of-2 number of pools, split into the next higher power of 2 and leave unused pools as reserved capacity.
- **Pods not getting IPs from expected pool**: Check node selectors on the IP pools and verify that nodes have the correct labels.
- **Existing allocations in the range**: Splitting is a planning tool. It does not migrate existing allocations. Drain workloads before restructuring pools.

## Conclusion

The `calicoctl ipam split` command is a planning tool that helps you divide IP address space for zone-based allocation, tenant isolation, or capacity optimization. By splitting pools and assigning them with node selectors, you gain precise control over which nodes and workloads use which IP ranges. Always plan splits before applying them and verify the resulting configuration with `calicoctl ipam show`.
