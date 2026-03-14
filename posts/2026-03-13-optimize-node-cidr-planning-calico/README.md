# How to Optimize Node CIDR Planning in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, CIDR, Node Planning, Networking, Optimization

Description: Learn how to plan and optimize node CIDR allocation in Calico to support cluster growth, prevent IP exhaustion, and align with your organization's IP address management policies.

---

## Introduction

Node CIDR planning is a foundational step in Kubernetes cluster design that determines how many nodes can join the cluster, how many pods each node can run, and how the cluster fits into your organization's IP addressing scheme. Poor CIDR planning leads to IP exhaustion, difficult-to-change configurations, and complex subnet calculations as the cluster grows.

Calico's IPAM model, which uses per-node IP blocks rather than pre-assigned per-node CIDRs like many other CNIs, provides more flexibility-but still requires careful upfront planning of the overall pool CIDR and block sizes. This guide covers best practices for node CIDR planning in Calico deployments.

## Prerequisites

- Calico v3.20+ with Calico IPAM
- Knowledge of your organization's IP address management policies
- Expected cluster size (node count, pods per node)
- `calicoctl` CLI installed

## Step 1: Calculate Required IP Space

Use a capacity planning formula to determine the required pool size.

```bash
#!/bin/bash
# cidr-planning.sh
# Calculate required IP pool size for Calico cluster

MAX_NODES=200             # Expected maximum number of nodes
MAX_PODS_PER_NODE=110     # Kubernetes default max pods
GROWTH_FACTOR=2           # 2x headroom for growth
BLOCK_SIZE_PREFIX=26      # /26 = 64 IPs per block

BLOCK_SIZE=$(( 1 << (32 - BLOCK_SIZE_PREFIX) ))
BLOCKS_PER_NODE=$(( (MAX_PODS_PER_NODE + BLOCK_SIZE - 1) / BLOCK_SIZE ))
TOTAL_BLOCKS=$(( MAX_NODES * BLOCKS_PER_NODE * GROWTH_FACTOR ))
TOTAL_IPS=$(( TOTAL_BLOCKS * BLOCK_SIZE ))

# Find the smallest CIDR that fits
for prefix in 20 19 18 17 16 15 14; do
  cidr_size=$(( 1 << (32 - prefix) ))
  if [[ $cidr_size -ge $TOTAL_IPS ]]; then
    echo "Recommended pool: /${prefix} (${cidr_size} IPs, need ${TOTAL_IPS})"
    break
  fi
done
```

## Step 2: Choose Non-Overlapping CIDRs

Select IP ranges that don't overlap with your existing infrastructure.

```bash
# Check for conflicting routes before deciding on pod CIDR
# Review routes on a cluster node
ip route show | grep -v default

# Check what's in use in your organization's IPAM
# Common RFC 1918 usage patterns:
# 10.0.0.0/8     - Often used for datacenter infrastructure
# 172.16.0.0/12  - Often used for management networks
# 192.168.0.0/16 - Often used for office/small networks

# Recommended pod CIDR choices for large clusters:
# 10.244.0.0/16 (65,536 IPs) - Common default
# 10.0.0.0/14  (262,144 IPs) - For large clusters
# 100.64.0.0/10 (4M IPs)    - CGNAT space, avoids RFC 1918 conflicts
```

## Step 3: Configure the IPPool with Planned CIDR

Create the IPPool with your calculated and verified CIDR.

```yaml
# ippool-planned-cidr.yaml
# IPPool with carefully planned CIDR for 200-node cluster with growth headroom
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: cluster-pod-pool
spec:
  cidr: 10.244.0.0/15           # /15 = 131,072 IPs (supports 200 nodes at 256 IPs/node with 2x growth)
  blockSize: 24                  # /24 = 256 IPs per block - good for 110 pods/node
  ipipMode: Never
  natOutgoing: true
  disabled: false
```

## Step 4: Plan for Multi-Cluster CIDR Isolation

If running multiple clusters, ensure each has a non-overlapping CIDR.

```bash
# Multi-cluster CIDR planning example
cat << 'EOF'
Cluster         CIDR              Notes
cluster-prod    10.244.0.0/16     Production workloads
cluster-stage   10.245.0.0/16     Staging environment
cluster-dev     10.246.0.0/16     Development environment
cluster-infra   10.247.0.0/16     Infrastructure tools
EOF

# Verify no overlap between cluster CIDRs
# Each uses a different /16 in the 10.244.0.0/13 supernet
```

## Step 5: Validate CIDR Planning with calicoctl

After deploying the cluster, validate that CIDR planning is working correctly.

```bash
# Check current IPAM utilization
calicoctl ipam show

# Verify pool covers enough IPs for current + growth
calicoctl ipam show | grep "Available"

# Check block allocation patterns
calicoctl ipam show --show-blocks | head -20

# Estimate time to exhaustion based on growth rate
USED=$(calicoctl ipam show | grep "In use" | awk '{print $3}')
TOTAL=$(calicoctl ipam show | grep "Total" | awk '{print $2}')
echo "Utilization: ${USED}/${TOTAL} ($(( USED * 100 / TOTAL ))%)"
```

## CIDR Planning Decision Tree

```mermaid
flowchart TD
    Start[Cluster Size?] --> S100{Under 100 nodes?}
    S100 -->|Yes| Small[/16 pool = 65536 IPs]
    S100 -->|No| S500{100-500 nodes?}
    S500 -->|Yes| Medium[/14 pool = 262144 IPs]
    S500 -->|No| Large{500+ nodes?}
    Large -->|Yes| XLarge[/12 or larger pool]
    Small --> BlockS[blockSize: 26]
    Medium --> BlockM[blockSize: 24]
    XLarge --> BlockL[blockSize: 23 or 22]
```

## Best Practices

- Choose CIDRs from 100.64.0.0/10 (CGNAT space) to avoid RFC 1918 conflicts in complex networks
- Plan for 3-5 years of growth, not just current needs
- Document your CIDR allocation rationale in infrastructure documentation
- Reserve supernet blocks for cluster expansion (e.g., use /16 from a /14 now, expand later)
- Validate planned CIDRs against your organization's IPAM database before deployment

## Conclusion

Optimizing node CIDR planning in Calico requires upfront calculation of IP requirements, careful selection of non-overlapping ranges, and building in growth headroom. By sizing pools for 2-3x current needs, choosing non-conflicting CIDRs, and aligning with organizational IP management policies, you avoid the expensive and disruptive process of CIDR migration later. Good CIDR planning is an investment that pays dividends throughout the cluster's operational lifetime.
