# Troubleshoot Node CIDR Planning in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, CIDR, Node, Networking, IPAM, Planning

Description: A guide to diagnosing and resolving node CIDR allocation issues in Calico, covering block size planning, per-node IP limits, and CIDR exhaustion scenarios.

---

## Introduction

Calico's IPAM system allocates IP addresses to pods using a block-based model. Each node is assigned one or more IP blocks (default /26 blocks, providing 64 IPs per block), and pod IPs are allocated from within these node-local blocks. The node CIDR planning decisions made during cluster setup have long-term consequences — too-small blocks lead to IPAM exhaustion as pod density increases, while too-large blocks waste IP space.

Node CIDR planning issues become visible as clusters grow: new pods fail to start because a node's allocated blocks are exhausted, nodes cannot acquire additional blocks because the IP pool is exhausted, or CIDR sizes chosen for initial pod density don't accommodate later scale requirements.

This guide covers how to diagnose CIDR planning issues and adjust Calico's block configuration to match your cluster's growth requirements.

## Prerequisites

- `calicoctl` CLI installed
- `kubectl` access to the cluster
- Understanding of current and projected pod density per node

## Step 1: Assess Current IP Block Utilization

Understanding the current state of IP block allocation is the first step in identifying planning gaps.

Inspect block allocation and utilization:

```bash
# Show all IP blocks allocated per node
calicoctl ipam show --show-blocks

# Get a summary of utilization across all IP pools
calicoctl ipam show

# Check which nodes are approaching block exhaustion
calicoctl ipam show --show-blocks | awk '/Node/{node=$0} /In use/{if($3+0 > 50) print node, $0}'

# Show the current pool CIDR and block size
calicoctl get ippool -o yaml | grep -E "cidr|blockSize"
```

## Step 2: Understand Calico's Block Size Configuration

The block size determines how many IPs each node can allocate before requesting additional blocks. A larger block size gives more IPs per node but reduces the total number of nodes the pool can serve.

Calculate optimal block size for your workload:

```bash
# Current block size is set in the IP pool spec
calicoctl get ippool <pool-name> -o yaml | grep blockSize
```

Block size planning reference:

```yaml
# ippool-sized.yaml — IP pool with block size tuned for high-density nodes
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: high-density-pool
spec:
  cidr: 10.244.0.0/16
  # blockSize 24 = 256 IPs per block, suitable for nodes running 100+ pods
  # blockSize 26 (default) = 64 IPs per block, suitable for up to ~60 pods per node
  # blockSize 28 = 16 IPs per block, for very small nodes
  blockSize: 24
  ipipMode: Never
  vxlanMode: CrossSubnet
  natOutgoing: true
  disabled: false
```

```bash
# IMPORTANT: blockSize cannot be changed after the pool has allocated blocks
# Create a new pool with the correct blockSize and migrate if needed
calicoctl apply -f ippool-sized.yaml
```

## Step 3: Diagnose Node-Level IPAM Exhaustion

When a node's allocated blocks are exhausted and no more blocks are available in the pool, new pods on that node fail with IPAM errors.

Identify and address IPAM exhaustion:

```bash
# Check pod events for IPAM failure messages
kubectl get events -A --field-selector reason=FailedCreatePodSandBox | grep -i "ipam\|ip"

# Show the utilization per pool to identify near-exhaustion pools
calicoctl ipam show | grep -E "(Pool|Capacity|Available)"

# Check if any nodes have more blocks than the max allowed (5 blocks per node by default)
calicoctl ipam show --show-blocks | grep -E "Node" | wc -l

# Release IP blocks from deleted nodes that still have orphaned allocations
calicoctl ipam check
```

## Step 4: Expand IP Pool Capacity

If the pool is exhausted or approaching exhaustion, expand by adding a new pool or resizing the existing CIDR.

Add supplemental IP pool capacity:

```yaml
# supplemental-pool.yaml — Additional IP pool to expand cluster IP capacity
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: supplemental-pool
spec:
  # Non-overlapping CIDR extending the cluster's IP space
  cidr: 10.245.0.0/16
  blockSize: 26
  ipipMode: Never
  vxlanMode: CrossSubnet
  natOutgoing: true
  disabled: false
```

```bash
# Apply the supplemental pool
calicoctl apply -f supplemental-pool.yaml

# Verify the new pool is available
calicoctl get ippool -o wide

# Confirm new pods can get IPs from the supplemental pool
kubectl get pods -A -o json | jq -r '.items[].status.podIP' | grep "^10\.245\." | head -5
```

## Best Practices

- Plan IP pools with 3x the required capacity to account for pod density growth and burst scheduling
- Use `/26` block size (default 64 IPs) for nodes with up to 50 pods; use `/24` for nodes with 100+ pods
- Monitor IPAM pool utilization with `calicoctl ipam show` regularly and alert at 70% utilization
- Run `calicoctl ipam check` after every node deletion to release orphaned block affinity records
- Create supplemental IP pools proactively rather than reactively to avoid pod scheduling failures

## Conclusion

Node CIDR planning in Calico requires balancing block size (IPs per node) against total pool capacity (total pods across the cluster). When IPAM exhaustion occurs, the immediate fix is adding a supplemental pool; the long-term fix is right-sizing blocks and monitoring utilization. Understanding how Calico allocates blocks per node enables you to plan IP pools that accommodate your cluster's growth trajectory without requiring emergency changes.
