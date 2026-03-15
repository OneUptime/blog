# How to Create the Calico BlockAffinity Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BlockAffinity, IPAM, Kubernetes, Networking, IP Address Management, DevOps

Description: Understand the Calico BlockAffinity resource, how it is created during IPAM operations, and how to manage block-to-node assignments for IP address allocation.

---

## Introduction

The BlockAffinity resource in Calico maps IP address blocks to specific nodes. When a pod is scheduled on a node, Calico's IPAM system allocates an IP from a block that has affinity to that node. If no suitable block exists, a new block is carved from the configured IP pool and a BlockAffinity resource is created to record the assignment. This mechanism ensures that each node draws pod IPs from predictable, contiguous CIDR ranges.

Understanding BlockAffinity is important for troubleshooting IPAM issues, capacity planning, and managing IP address exhaustion. While BlockAffinity resources are typically created automatically by Calico's IPAM controller, there are situations where you may need to inspect, manage, or clean up stale affinities manually.

This guide covers how BlockAffinity resources work, how they are created, and how to manage them for common operational scenarios.

## Prerequisites

- Kubernetes cluster with Calico CNI and Calico IPAM enabled
- `calicoctl` and `kubectl` with cluster-admin access
- Basic understanding of CIDR notation and IP address management
- Familiarity with Calico IPPool resources

## Understanding the BlockAffinity Schema

The BlockAffinity resource uses the `projectcalico.org/v3` API. Here is the structure:

```yaml
apiVersion: projectcalico.org/v3
kind: BlockAffinity
metadata:
  name: worker-1-10-244-0-0-24
spec:
  cidr: 10.244.0.0/24
  node: worker-1
  state: confirmed
```

Key fields:

- `cidr`: The IP block assigned to the node, carved from an IPPool
- `node`: The Kubernetes node that owns this block
- `state`: The affinity state, typically `confirmed` or `pendingDeletion`

## How BlockAffinities Are Created

BlockAffinity resources are created automatically when Calico IPAM needs to allocate IPs on a node. The process works as follows:

1. A pod is scheduled on a node
2. The Calico CNI plugin requests an IP from the IPAM controller
3. The controller checks for existing blocks with affinity to that node
4. If no block has available IPs, a new block is carved from the IPPool
5. A BlockAffinity resource is created to record the assignment

You can observe this by checking the existing affinities:

```bash
calicoctl get blockaffinity -o wide
```

## Configuring IPPools to Control Block Size

The block size within an IPPool determines how large each affinity block will be. This indirectly controls BlockAffinity creation:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-pool
spec:
  cidr: 10.244.0.0/16
  blockSize: 26
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: true
  nodeSelector: all()
```

The default `blockSize` is 26 (64 IPs per block). A smaller block size means more BlockAffinity resources but less IP waste per node. A larger block size means fewer resources but potentially more wasted IPs on nodes with few pods.

```bash
calicoctl apply -f ippool.yaml
```

## Viewing BlockAffinity Resources

List all block affinities to understand IP distribution across nodes:

```bash
calicoctl get blockaffinity -o wide
```

Check affinities for a specific node:

```bash
calicoctl get blockaffinity -o yaml | grep -A 3 "node: worker-1"
```

Get detailed information about a specific block:

```bash
calicoctl get blockaffinity worker-1-10-244-0-0-26 -o yaml
```

## Managing Block Affinities for Node Removal

When a node is removed from the cluster, its BlockAffinity resources may become orphaned. Clean them up to free the IP blocks:

```bash
# Check for affinities pointing to nodes that no longer exist
calicoctl get blockaffinity -o yaml | grep "node:"
kubectl get nodes -o name

# Release orphaned blocks
calicoctl ipam release --from-node=<removed-node-name>
```

## Managing IP Exhaustion

If a node runs out of IPs, check its current block affinities:

```bash
# View all blocks for a node
calicoctl get blockaffinity -o yaml | grep -B 5 "node: worker-1"

# Check IP utilization per block
calicoctl ipam show --show-blocks
```

If the IPPool is exhausted and no new blocks can be allocated, you have these options:

```bash
# Add a new IPPool
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: extended-pool
spec:
  cidr: 10.245.0.0/16
  blockSize: 26
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Handling Stale Block Affinities

Over time, blocks may become mostly empty but still hold affinity to a node. Use the IPAM garbage collection to clean up:

```bash
# Show current IPAM state
calicoctl ipam show

# Check for blocks with low utilization
calicoctl ipam show --show-blocks

# Release specific blocks if they have no active allocations
calicoctl ipam release --from-node=worker-1
```

## Verification

After managing BlockAffinity resources, verify the IPAM state:

```bash
# List all block affinities
calicoctl get blockaffinity -o wide

# Verify IPAM allocation status
calicoctl ipam show

# Check that pods can still get IPs
kubectl run test --image=busybox --rm -it --restart=Never -- ip addr show

# Verify no orphaned blocks remain
calicoctl ipam check
```

## Troubleshooting

Common BlockAffinity issues:

- Pod stuck in ContainerCreating with IPAM error: The node may have no blocks with available IPs. Check `calicoctl ipam show --show-blocks` and verify the IPPool has available space
- Orphaned blocks after node deletion: Run `calicoctl ipam release --from-node=<old-node>` to free blocks assigned to removed nodes
- Uneven IP distribution: Nodes that have been running longer tend to accumulate more blocks. This is normal behavior. Consider using smaller block sizes for more even distribution
- BlockAffinity in pendingDeletion state: The IPAM controller is waiting for all IPs in the block to be released before removing the affinity. Check for lingering pods or leaked IPs
- IP pool exhaustion: Check `calicoctl ipam show` for utilization. Add new IPPools if the existing ones are full

## Conclusion

BlockAffinity resources are the mechanism Calico uses to distribute IP address blocks across nodes. While they are created and managed automatically, understanding how they work is essential for troubleshooting IPAM issues and planning IP capacity. Monitor block utilization with `calicoctl ipam show`, clean up orphaned blocks when nodes are removed, and configure appropriate block sizes in your IPPools to balance IP efficiency against resource count.
