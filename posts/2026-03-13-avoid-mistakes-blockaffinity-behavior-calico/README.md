# Avoid Mistakes with Calico Block Affinity Behavior

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Block-affinity, Kubernetes, Networking, Ip-management

Description: Understand how Calico block affinity works and avoid common mistakes in configuration and troubleshooting that arise from misunderstanding how IP blocks are assigned and retained per node.

---

## Introduction

Calico IPAM allocates IP addresses by assigning fixed-size "blocks" of IP space to nodes. Each block has an "affinity" to a node, meaning that node has priority to allocate IPs from that block. Understanding block affinity - including when blocks are created, retained, and released - is essential for diagnosing IP exhaustion issues and unexpected IP allocation behavior.

Common mistakes arise when operators expect every stale allocation to be cleaned up without checking the Calico node and IPAM state, when they do not account for borrowed blocks, or when they misinterpret `calicoctl ipam show` output. This post clarifies the block affinity model and shows how to manage it correctly.

## Prerequisites

- Calico CNI v3.x installed
- `calicoctl` CLI configured
- `kubectl` with cluster access
- A running cluster with pods scheduled across multiple nodes

## Step 1: Understand Block Affinity Fundamentals

A block is a CIDR range (e.g., `/26` = 64 IPs) with an "affinity" to a specific node. Calico assigns a new block to a node the first time that node needs more IPs than its current blocks can provide.

```bash
# View all current block allocations and utilization

calicoctl ipam show --show-blocks

# Example output interpretation:
# GROUPING  CIDR           IPS TOTAL  IPS IN USE  IPS FREE
# IP Pool   10.0.0.0/16    65536      89 (0%)     65447 (100%)
# Block     10.0.1.0/26    64         45 (70%)    19 (30%)
# Block     10.0.1.64/26   64         32 (50%)    32 (50%)
# Block     10.0.1.128/26  64         12 (19%)    52 (81%)

# Use --show-borrowed when you need to see IPs from another node's block
```

## Step 2: Mistake - Expecting Blocks to Be Released on Node Deletion

A common mistake is expecting that deleting a Kubernetes node always removes every related Calico IPAM record immediately. In normal Kubernetes deployments the Calico node controller cleans up configuration for nodes that no longer exist, but in other configurations you may need to decommission the Calico node resource and check IPAM consistency.

```bash
# Compare Calico node resources with Kubernetes nodes
calicoctl get node -o wide
kubectl get nodes -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | sort > k8s-nodes.txt

# If the host is gone and the Calico node resource remains, decommission it
calicoctl delete node deleted-node-01

# Check IPAM consistency and write a report
calicoctl ipam check -o report.json

# Release leaked addresses identified in the report
calicoctl ipam release --from-report=report.json
```

## Step 3: Mistake - Ignoring Borrowed Blocks

When a node's affine blocks are full, it "borrows" IPs from other nodes' blocks. Borrowed IPs can cause routing inefficiencies and confuse monitoring.

```yaml
# ippool-tuning.yaml
# Increase block size to reduce borrowing for high-pod-count nodes
# If nodes regularly borrow, the block size is too small
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  # Increase blockSize from /26 (64 IPs) to /25 (128 IPs) to reduce borrowing
  # IMPORTANT: blockSize cannot be changed on an existing pool - create a new pool
  blockSize: 25
  vxlanMode: CrossSubnet
  natOutgoing: true
```

```bash
# Check for nodes that are currently borrowing IPs
calicoctl ipam show --show-borrowed

# If borrowing is frequent, your blockSize is too small for max-pods-per-node
# Check kubelet max-pods setting
kubectl get node <node-name> -o jsonpath='{.status.capacity.pods}'
```

## Step 4: Mistake - Multiple Blocks per Node Without Understanding Why

A node can have multiple affine blocks. This happens when the first block fills up and Calico allocates a second one. Some operators are surprised by this and mistakenly try to consolidate.

```bash
# Inspect block affinities for a specific node
calicoctl get blockaffinity -o yaml | grep -A 5 "node: node-01"

# Multiple blocks on one node is normal and expected behavior
# Do NOT attempt to manually consolidate blocks - this can cause pod IP loss

# The number of blocks a node holds = ceil(max_pods / block_size)
# For max_pods=110 and blockSize=/26 (64 IPs): ceil(110/64) = 2 blocks
```

## Step 5: Clean Up Stale Block Affinities

After scaling events, check for stale Calico node resources and leaked IPAM allocations to reclaim IP space.

```bash
# List all block affinities. These are managed by Calico IPAM.
calicoctl get blockaffinity -o yaml

# Delete a stale Calico node resource only after confirming the host is no longer in service
calicoctl delete node deleted-node-01

# Run the IPAM consistency checker to identify leaked allocations
calicoctl ipam check -o report.json

# Release leaked addresses identified in the report
calicoctl ipam release --from-report=report.json

# After cleanup, verify the IP pool utilization improved
calicoctl ipam show
```

## Best Practices

- Run `calicoctl ipam check -o report.json` after unusual node scaling or decommissioning events to catch leaked allocations early.
- Set `blockSize` based on your `max-pods-per-node` kubelet setting. For IPv4, choose a CIDR prefix with enough addresses, such as `blockSize = 32 - ceil(log2(max_pods + buffer))`.
- Monitor borrowed IP counts in your metrics system - consistent borrowing indicates blockSize needs to increase.
- Do not manually edit or delete block affinity resources; they are managed by Calico IPAM.
- When decommissioning nodes, drain and delete them properly through Kubernetes, and remove the Calico node resource when your deployment requires manual decommissioning.

## Conclusion

Calico block affinity is an efficient IP allocation mechanism, but it requires understanding the lifecycle of blocks - particularly how node cleanup, leaked allocations, and borrowing across blocks work. By monitoring block utilization, running targeted IPAM checks, and sizing blocks correctly for your max-pods setting, you avoid the most common block affinity-related issues.
