# Avoid Mistakes with Calico Block Affinity Behavior

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Block-affinity, Kubernetes, Networking, Ip-management

Description: Understand how Calico block affinity works and avoid common mistakes in configuration and troubleshooting that arise from misunderstanding how IP blocks are assigned and retained per node.

---

## Introduction

Calico IPAM allocates IP addresses by assigning fixed-size "blocks" of IP space to nodes. Each block has an "affinity" to a node, meaning that node has priority to allocate IPs from that block. Understanding block affinity - including when blocks are created, retained, and released - is essential for diagnosing IP exhaustion issues and unexpected IP allocation behavior.

Common mistakes arise when operators expect blocks to be returned to the pool when nodes scale down (they are not, by default), when they do not account for borrowed blocks, or when they misinterpret `calicoctl ipam show` output. This post clarifies the block affinity model and shows how to manage it correctly.

## Prerequisites

- Calico CNI v3.x installed
- `calicoctl` CLI configured
- `kubectl` with cluster access
- A running cluster with pods scheduled across multiple nodes

## Step 1: Understand Block Affinity Fundamentals

A block is a CIDR range (e.g., `/26` = 64 IPs) with an "affinity" to a specific node. Calico assigns a new block to a node the first time that node needs more IPs than its current blocks can provide.

```bash
# View all current block allocations and their affinity
calicoctl ipam show --show-blocks

# Example output interpretation:
# Block          Node       Allocations  Handles  Borrowed
# 10.0.1.0/26    node-01    45           45       0
# 10.0.1.64/26   node-02    32           32       0
# 10.0.1.128/26  node-03    12           12       0

# "Borrowed" indicates IPs from another node's block are being used
# This happens when a node's own blocks are full
```

## Step 2: Mistake - Expecting Blocks to Be Released on Node Deletion

A common mistake is expecting that when a node is deleted, its IP blocks are immediately returned to the pool. They are not - Calico marks blocks as having "no affinity" but does not automatically release them.

```bash
# Check for orphaned blocks (blocks with no live node affinity)
calicoctl ipam show --show-blocks | grep -v "^$" | awk '{print $2}' > active-nodes.txt
kubectl get nodes -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | sort > k8s-nodes.txt
# Blocks in active-nodes.txt but not in k8s-nodes.txt are orphaned

# Manually release orphaned blocks after node deletion
# First, verify no pods are using IPs from the block
calicoctl ipam release --ip=10.0.1.0 --block

# Run IPAM garbage collection to release all unused blocks
calicoctl ipam check --remove-extra-nodes
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
  ipipMode: Never
  vxlanMode: CrossSubnet
  natOutgoing: true
```

```bash
# Check for nodes that are currently borrowing IPs
calicoctl ipam show --show-blocks | grep -v "0$"

# If borrowing is frequent, your blockSize is too small for max-pods-per-node
# Check kubelet max-pods setting
kubectl get node <node-name> -o jsonpath='{.status.capacity.pods}'
```

## Step 4: Mistake - Multiple Blocks per Node Without Understanding Why

A node can have multiple affine blocks. This happens when the first block fills up and Calico allocates a second one. Some operators are surprised by this and mistakenly try to consolidate.

```bash
# Inspect all blocks for a specific node
calicoctl ipam show --show-blocks | grep "node-01"

# Multiple blocks on one node is normal and expected behavior
# Do NOT attempt to manually consolidate blocks - this can cause pod IP loss

# The number of blocks a node holds = ceil(max_pods / block_size)
# For max_pods=110 and blockSize=/26 (64 IPs): ceil(110/64) = 2 blocks
```

## Step 5: Clean Up Stale Block Affinities

After scaling events, clean up stale block affinities to reclaim IP space.

```bash
# List all block affinities (including stale ones from deleted nodes)
calicoctl get blockaffinity -o wide

# Delete stale block affinity for a specific deleted node
# Only do this after confirming the node no longer exists in Kubernetes
calicoctl delete blockaffinity node=deleted-node-01

# Run the IPAM consistency checker to identify and clean up all inconsistencies
calicoctl ipam check

# After cleanup, verify the IP pool utilization improved
calicoctl ipam show
```

## Best Practices

- Run `calicoctl ipam check` after every node scaling event to catch orphaned blocks early.
- Set `blockSize` based on your `max-pods-per-node` kubelet setting: use `blockSize = ceil(log2(max_pods + buffer))`.
- Monitor borrowed IP counts in your metrics system - consistent borrowing indicates blockSize needs to increase.
- Never manually delete block affinities without first verifying no pods are using IPs from that block.
- When decommissioning nodes, always drain and delete them properly through Kubernetes to trigger Calico's cleanup process.

## Conclusion

Calico block affinity is an efficient IP allocation mechanism, but it requires understanding the lifecycle of blocks - particularly that they persist after node deletion and that borrowing across blocks is normal. By monitoring block utilization, running regular IPAM checks, and sizing blocks correctly for your max-pods setting, you avoid the most common block affinity-related issues.
