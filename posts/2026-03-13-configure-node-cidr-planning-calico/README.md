# Configure Node CIDR Planning with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, ipam, cidr, networking, kubernetes, planning

Description: Learn how to plan and configure per-node CIDR block sizing in Calico to optimize IP address utilization and avoid address exhaustion in large clusters.

---

## Introduction

Node CIDR planning is a foundational exercise for any Kubernetes cluster that expects to scale. Calico allocates IP addresses to pods using per-node blocks from your IP pool. If you configure block sizes that are too small, nodes run out of local IPs and require cross-node allocations. If blocks are too large, you waste address space and may hit pool exhaustion.

Calico's IPAM system uses a block-based allocation model where each node is assigned one or more blocks of contiguous IP addresses. The default block size is `/26` (64 addresses), but this can be tuned based on how many pods you plan to run per node and how large your overall IP pool is.

This guide covers how to calculate the optimal block size for your cluster, configure it in Calico, and monitor IP utilization over time to prevent exhaustion.

## Prerequisites

- Kubernetes cluster with Calico v3.20+ installed
- `calicoctl` CLI configured
- Knowledge of expected pod density per node
- IP pool CIDR already defined

## Step 1: Calculate Required Block Size

Determine the correct block size based on your node's expected pod density.

```bash
# Calculate block sizes:
# /26 = 64 addresses  (default, suitable for up to ~50 pods/node)
# /25 = 128 addresses (suitable for up to ~110 pods/node)
# /24 = 256 addresses (suitable for up to ~230 pods/node)

# Example: If your nodes run up to 100 pods, use /25
# Formula: block_size >= max_pods_per_node + overhead (3-5 reserved addresses)

# Check current max pods setting in kubelet
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.allocatable.pods}{"\n"}{end}'
```

## Step 2: Configure IP Pool with Desired Block Size

Set the block size on the Calico IP pool when creating or updating it.

```yaml
# ippool-with-blocksize.yaml - IP pool with custom block size for node CIDR planning
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  # Large enough pool to accommodate all nodes * block size
  # Example: 500 nodes * 128 addresses (/25 block) = 64,000 addresses minimum
  cidr: 10.244.0.0/14
  # Block size /25 = 128 addresses per node block
  # This accommodates clusters running up to 110 pods per node
  blockSize: 25
  ipipMode: CrossSubnet
  natOutgoing: true
  nodeSelector: all()
```

```bash
# Apply the IP pool configuration (must be done before pods are scheduled)
calicoctl apply -f ippool-with-blocksize.yaml

# Verify the pool is created with the correct block size
calicoctl get ippool default-ipv4-ippool -o yaml | grep blockSize
```

## Step 3: Plan Pool Size for Cluster Scale

Calculate the total pool size needed to accommodate your full cluster.

```bash
# Planning formula:
# Total IPs needed = num_nodes * (2^(32 - block_size))
# Plus 20% headroom for rolling updates and node replacements

# Example calculation:
NODES=200
BLOCK_SIZE=25  # /25 = 128 addresses
IPS_PER_BLOCK=$((2 ** (32 - BLOCK_SIZE)))
TOTAL_IPS=$((NODES * IPS_PER_BLOCK))
HEADROOM=$((TOTAL_IPS * 20 / 100))
echo "Minimum pool size: $((TOTAL_IPS + HEADROOM)) addresses"
echo "Recommended CIDR: Use a /${32 - $(python3 -c "import math; print(math.ceil(math.log2($((TOTAL_IPS + HEADROOM)))))")} or larger"
```

## Step 4: Monitor IPAM Utilization

Regularly check IPAM utilization to detect exhaustion risk early.

```bash
# Show overall IPAM utilization
calicoctl ipam show

# Show per-node block allocation details
calicoctl ipam show --show-blocks

# Check for nodes that have been allocated multiple blocks (indicates high pod density)
calicoctl ipam show --show-blocks | grep -E "^Block" | awk '{print $2}' | sort | uniq -c | sort -rn | head -10

# Show IP usage statistics
calicoctl ipam show --show-borrowed
```

## Best Practices

- Plan your IP pool to be at least 3x the current cluster size to accommodate growth
- Use `/25` block size as a default for general-purpose clusters; use `/24` for GPU or high-density nodes
- Never change the block size on an existing, active IP pool without a full cluster migration plan
- Set up Prometheus alerts when IPAM utilization exceeds 70% to give time for expansion
- Use separate IP pools with different block sizes for different node groups if pod densities vary significantly

## Conclusion

Proper node CIDR planning with Calico requires thinking ahead about cluster scale, pod density, and IP address utilization. By selecting the appropriate block size and pool CIDR during cluster design, you avoid the operational pain of IP exhaustion and cross-node allocation overhead. Regular monitoring with `calicoctl ipam show` ensures you catch utilization trends before they become emergencies.
