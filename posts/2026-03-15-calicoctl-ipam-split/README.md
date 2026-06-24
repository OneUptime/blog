# How to Use calicoctl ipam split with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Kubernetes, Networking, IP Address Management, Scaling

Description: Learn how to use calicoctl ipam split to divide IP pools into smaller blocks for better distribution across cluster nodes.

---

## Introduction

As Kubernetes clusters grow, efficient distribution of IP address pools across nodes becomes critical. The `calicoctl ipam split` command allows you to divide an existing IP pool into smaller, more granular pools that can be distributed more evenly across nodes.

By splitting IP pools, you gain finer control over IP allocation density per node and can optimize address utilization in clusters where some nodes handle more pods than others. This is particularly useful when migrating from a small cluster to a larger one or when you need to rebalance IP allocations.

This guide demonstrates how to use `calicoctl ipam split` to manage IP pool segmentation and plan your IPAM architecture.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` configured with datastore access
- Understanding of CIDR notation and subnetting
- Current IPAM state reviewed with `calicoctl ipam show`
- Ability to lock and unlock the Calico datastore during the split

## Understanding IP Pool Block Sizes

Calico divides IP pools into blocks (default /26 for IPv4 and /122 for IPv6, providing 64 IPs per block). The `ipam split` command operates on an existing IPPool and creates smaller IPPools; the per-node allocation block size remains controlled by the IPPool `blockSize`. Before splitting, understand your current layout:

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

Split an existing IP pool into a specified number of smaller IP pools. The Calico datastore must be locked while the split runs:

```bash
calicoctl datastore migrate lock
calicoctl ipam split 4 --cidr=10.244.0.0/16
calicoctl datastore migrate unlock
```

If the original pool is named `default-ipv4-ippool`, this creates IPPools with CIDRs like:

```text
Created split-default-ipv4-ippool-0 with CIDR 10.244.0.0/18.
Created split-default-ipv4-ippool-1 with CIDR 10.244.64.0/18.
Created split-default-ipv4-ippool-2 with CIDR 10.244.128.0/18.
Created split-default-ipv4-ippool-3 with CIDR 10.244.192.0/18.
```

Each resulting pool covers 16384 IP addresses. Note that the number of parts must be a power of 2.

## Planning Splits for Multi-Zone Clusters

When running across multiple availability zones, split IP pools to assign ranges per zone:

```bash
# Split the main pool into 4 parts (must be a power of 2), then use 3 for 3 availability zones

calicoctl datastore migrate lock
calicoctl ipam split 4 --cidr=10.244.0.0/16
```

Example created pools:

```text
split-default-ipv4-ippool-0  10.244.0.0/18
split-default-ipv4-ippool-1  10.244.64.0/18
split-default-ipv4-ippool-2  10.244.128.0/18
split-default-ipv4-ippool-3  10.244.192.0/18
```

Use the first three resulting pools for your three zones (the fourth can be reserved for future use) by patching their node selectors before unlocking the datastore:

```bash
calicoctl patch ippool split-default-ipv4-ippool-0 -p '{"spec":{"nodeSelector":"topology.kubernetes.io/zone == \"us-east-1a\""}}'
calicoctl patch ippool split-default-ipv4-ippool-1 -p '{"spec":{"nodeSelector":"topology.kubernetes.io/zone == \"us-east-1b\""}}'
calicoctl patch ippool split-default-ipv4-ippool-2 -p '{"spec":{"nodeSelector":"topology.kubernetes.io/zone == \"us-east-1c\""}}'
calicoctl patch ippool split-default-ipv4-ippool-3 -p '{"spec":{"disabled":true}}'
calicoctl datastore migrate unlock
```

## Splitting for Tenant Isolation

In multi-tenant clusters, split IP pools to assign dedicated ranges per tenant:

```bash
# Split into 8 equal ranges for 8 tenants
calicoctl datastore migrate lock
calicoctl ipam split 8 --cidr=10.244.0.0/16
```

Example created pools:

```text
split-default-ipv4-ippool-0  10.244.0.0/19
split-default-ipv4-ippool-1  10.244.32.0/19
split-default-ipv4-ippool-2  10.244.64.0/19
split-default-ipv4-ippool-3  10.244.96.0/19
split-default-ipv4-ippool-4  10.244.128.0/19
split-default-ipv4-ippool-5  10.244.160.0/19
split-default-ipv4-ippool-6  10.244.192.0/19
split-default-ipv4-ippool-7  10.244.224.0/19
```

Each tenant gets 8192 IP addresses. Mark the split pools as manual-only before unlocking the datastore, then annotate each tenant namespace with the IPPool it should use:

```bash
for pool in split-default-ipv4-ippool-{0..7}; do
  calicoctl patch ippool "$pool" -p '{"spec":{"assignmentMode":"Manual"}}'
done
calicoctl datastore migrate unlock

kubectl annotate namespace tenant-alpha cni.projectcalico.org/ipv4pools='["split-default-ipv4-ippool-0"]'
```

## Calculating Split Results

Use a helper script to calculate the same IPv4 split results before applying them:

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

python3 - "$CIDR" "$PARTS" <<'PY'
import ipaddress
import math
import sys

network = ipaddress.ip_network(sys.argv[1], strict=False)
parts = int(sys.argv[2])

if parts < 2 or parts & (parts - 1):
    raise SystemExit("number-of-parts must be a power of 2 greater than 1")

new_prefix = network.prefixlen + int(math.log2(parts))
if new_prefix > network.max_prefixlen:
    raise SystemExit("CIDR is too small for the requested split")

subnets = list(network.subnets(new_prefix=new_prefix))
for subnet in subnets:
    print(subnet)

print("")
print(f"Total IPs: {network.num_addresses}")
print(f"IPs per part: {subnets[0].num_addresses}")
PY
```

## Verification

After creating IP pools from split CIDRs, verify the configuration:

```bash
# List all IP pools
calicoctl get ippools -o wide

# Check that pools do not overlap
calicoctl get ippools -o yaml | grep cidr

# Verify IPAM state for the new pools
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
- **Existing allocations in the range**: Splitting updates IPPool resources around existing IPAM allocation records. It does not restart pods or move workloads between nodes.

## Conclusion

The `calicoctl ipam split` command helps you divide IP address space for zone-based allocation, tenant isolation, or capacity optimization. By splitting pools and assigning them with node selectors or namespace annotations, you gain precise control over which nodes and workloads use which IP ranges. Always plan splits before applying them and verify the resulting configuration with `calicoctl ipam show`.
