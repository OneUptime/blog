# Test BlockAffinity Behavior in Calico IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, BlockAffinity, Kubernetes, Networking, Testing

Description: Understand and test Calico's BlockAffinity mechanism that assigns IP address blocks to nodes, and learn how to verify correct block allocation and release behavior in your cluster.

---

## Introduction

Calico's IPAM system allocates IP addresses from pools using a block-based approach. Each node is assigned one or more IP address blocks (by default /26 subnets), and pods on that node receive IPs from the node's assigned blocks. The `BlockAffinity` resource represents the affiliation between a node and an IP address block.

Understanding BlockAffinity behavior is essential for troubleshooting IP exhaustion issues, debugging pod scheduling failures caused by IPAM errors, and planning IP pool sizing. When blocks are not released after nodes are removed, or when block allocation does not follow expected topology constraints, your cluster can run out of IP addresses even when the total pool appears to have capacity.

This guide walks through querying BlockAffinity resources, testing allocation and release behavior, and identifying common BlockAffinity issues before they cause production problems.

## Prerequisites

- Kubernetes cluster with Calico v3.20+ using Calico IPAM
- `calicoctl` CLI installed and configured
- Cluster admin permissions
- Test nodes or node groups available for allocation testing

## Step 1: Inspect Current BlockAffinity Allocations

Query existing BlockAffinity resources to understand the current allocation state.

```bash
# List all BlockAffinity resources across the cluster
# Each entry shows a node-to-block affiliation
calicoctl get blockaffinity -o yaml

# View BlockAffinity in a more readable format
calicoctl get blockaffinity -o wide

# Count blocks per node to identify uneven distribution
calicoctl get blockaffinity -o json | \
  jq -r '.items[] | .spec.node' | \
  sort | uniq -c | sort -rn
```

```yaml
# Expected BlockAffinity resource structure
# apiVersion: projectcalico.org/v3
# kind: BlockAffinity
# metadata:
#   name: node-worker-1-192-168-10-0-26
# spec:
#   cidr: 192.168.10.0/26
#   deleted: "false"
#   node: worker-1
#   state: confirmed
#   # state can be: confirmed, pending, pendingDeletion
```

## Step 2: Test Block Allocation on New Nodes

Verify that new nodes receive IP blocks correctly when they join the cluster.

```bash
# Before adding a new node, record the current block state
calicoctl get blockaffinity -o yaml > before-node-add.yaml

# Add a new node to the cluster (method depends on your cluster provisioner)
# For kubeadm clusters:
# kubeadm join <control-plane-host>:<port> --token <token> ...

# After the node joins and calico-node pod starts, check for new block allocation
# The new node should receive at least one /26 block from the IP pool
calicoctl get blockaffinity -o yaml > after-node-add.yaml

# Diff the two states to see the newly allocated blocks
diff before-node-add.yaml after-node-add.yaml

# Verify the new node has an affiliated block
calicoctl get blockaffinity -o json | \
  jq -r '.items[] | select(.spec.node == "new-worker-node") | .spec.cidr'
```

## Step 3: Test Block Release After Node Removal

Verify that blocks are properly released when nodes are removed from the cluster.

```bash
# Record blocks affiliated with the node to be removed
NODE_NAME="worker-to-remove"
calicoctl get blockaffinity -o json | \
  jq -r --arg node "$NODE_NAME" '.items[] | select(.spec.node == $node) | .spec.cidr'

# Cordon and drain the node
kubectl cordon $NODE_NAME
kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data

# Delete the node from Kubernetes
kubectl delete node $NODE_NAME

# Check if Calico releases the block affiliations
# Blocks should transition to pendingDeletion then disappear
calicoctl get blockaffinity -o json | \
  jq -r --arg node "$NODE_NAME" '.items[] | select(.spec.node == $node)'

# If blocks are stuck in pendingDeletion, manually release them
calicoctl delete blockaffinity <affinity-name>
```

## Step 4: Test Block Borrowing Behavior

When a node exhausts its affiliated blocks, it borrows from other nodes. Test that this works correctly.

```bash
# Get the current block size (default is /26 = 64 IPs)
calicoctl get ippool default-ipv4-ippool -o yaml | grep blockSize

# Deploy a large number of pods on a single node to exhaust its block
# This forces Calico to allocate additional blocks or borrow from other nodes
kubectl create deployment block-exhaustion \
  --image=nginx \
  --replicas=100 \
  -n test

# Pin the deployment to a single node
kubectl patch deployment block-exhaustion -n test \
  -p '{"spec":{"template":{"spec":{"nodeName":"target-node"}}}}'

# Watch for additional block allocations on the target node
watch 'calicoctl get blockaffinity -o json | jq -r ".items[] | select(.spec.node == \"target-node\") | .spec.cidr"'

# Clean up test deployment
kubectl delete deployment block-exhaustion -n test
```

## Best Practices

- Monitor total BlockAffinity count relative to available /26 blocks in your IP pool to predict IP exhaustion
- Set up alerts when more than 80% of IP pool blocks are allocated to nodes
- Use `calicoctl ipam check` regularly to identify orphaned blocks from deleted nodes
- Increase `blockSize` in the IP pool (e.g., from /26 to /24) for large nodes with many pods; smaller block sizes reduce waste on small nodes
- Test block release behavior in staging by simulating node failure and verifying cleanup
- Run `calicoctl ipam show --show-blocks` to visualize the complete allocation state

## Conclusion

Testing BlockAffinity behavior before production deployment ensures that your Calico IPAM correctly allocates and releases IP blocks as nodes join and leave the cluster. Understanding block allocation patterns helps you right-size IP pools and block sizes to prevent IP exhaustion in growing clusters.
