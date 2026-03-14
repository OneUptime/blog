# Troubleshoot BlockAffinity Behavior in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, BlockAffinity, Kubernetes, Troubleshooting, Networking

Description: A guide to diagnosing and resolving unexpected BlockAffinity behavior in Calico IPAM, covering block allocation, deallocation, and cross-node borrowing issues.

---

## Introduction

Calico IPAM organizes IP addresses into blocks (typically /26 subnets by default) and assigns these blocks to nodes. The BlockAffinity resource represents the relationship between a block and a node-which node "owns" or has "affinity" for a given IP block.

Issues with BlockAffinity can cause pods to fail IP allocation, result in unexpected IP assignments from remote blocks, or leave stale block allocations after node removal. Understanding how Calico manages block affinity is essential for diagnosing these IPAM-level problems.

This guide covers common BlockAffinity issues and how to diagnose them using calicoctl and kubectl.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` installed and configured
- `kubectl` with cluster admin access
- Understanding of Calico IPAM block allocation

## Step 1: Inspect Current BlockAffinity State

Get a comprehensive view of block affinity assignments across the cluster.

```bash
# List all BlockAffinity resources
calicoctl get blockaffinity -o wide

# Show detailed block information including allocations
calicoctl ipam show --show-blocks

# Check block allocations for a specific node
calicoctl ipam show --show-blocks | grep <node-name>
```

## Step 2: Identify Stale BlockAffinity Entries

Stale entries from deleted nodes can prevent IP allocation for new nodes.

```bash
# List all nodes in the cluster
kubectl get nodes

# Compare node names against BlockAffinity node references
calicoctl get blockaffinity -o yaml | grep "node:"

# Find BlockAffinity entries for nodes that no longer exist
# Any node in calicoctl but not in kubectl get nodes is stale
calicoctl get node | grep -v $(kubectl get nodes -o name | sed 's|node/||' | tr '\n' '|' | sed 's/|$//')
```

## Step 3: Clean Up Stale Block Affiliations

Remove BlockAffinity and related IPAM resources for deleted nodes.

```bash
# Check the IPAM state for the stale node
calicoctl ipam show --show-blocks | grep <stale-node-name>

# Remove the stale node from Calico's datastore
calicoctl delete node <stale-node-name>

# Verify the BlockAffinity is removed
calicoctl get blockaffinity | grep <stale-node-name>

# Optionally, release any IP addresses still allocated on the stale node
calicoctl ipam release --ip=<leaked-ip>
```

## Step 4: Diagnose Cross-Block IP Borrowing

Investigate situations where nodes are allocating IPs from non-affine blocks.

```bash
# Check if any nodes are using IPs from non-affine blocks
calicoctl ipam show --show-blocks

# A pod on node-A having an IP from a block with affinity to node-B indicates borrowing
# Check current pod IPs against their hosting nodes
kubectl get pods --all-namespaces -o wide | awk '{print $8, $7}' | sort

# Compare against block affinity assignments
calicoctl get blockaffinity -o yaml
```

## Step 5: Validate IP Block Configuration

Ensure the block size is appropriate for your node pod density.

```bash
# Check the current block size configuration
calicoctl get ippool default-ipv4-ippool -o yaml | grep blockSize

# Calculate if block size is sufficient for max pods per node
# Default /26 = 64 IPs. For 110 pods per node, use /25 = 128 IPs

# Update block size if needed (requires IPAM draining first)
calicoctl patch ippool default-ipv4-ippool --type merge \
  --patch '{"spec":{"blockSize": 25}}'
```

## Best Practices

- Clean up Calico node resources promptly when removing nodes from the cluster
- Monitor IPAM utilization to detect block exhaustion before it affects pod scheduling
- Size blocks to accommodate your maximum pods-per-node setting with headroom
- Use `calicoctl ipam check` regularly to detect IPAM inconsistencies
- Document your block size rationale and review it when scaling the cluster

## Conclusion

BlockAffinity issues in Calico IPAM often arise from node lifecycle events-nodes being removed without proper cleanup, or blocks being borrowed across nodes when local blocks are exhausted. By regularly inspecting BlockAffinity state, cleaning up stale entries, and ensuring appropriate block sizing, you can maintain a healthy IPAM configuration for your cluster.
