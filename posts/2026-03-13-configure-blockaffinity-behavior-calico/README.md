# Configure BlockAffinity Behavior in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, BlockAffinity, Networking, Ip-management

Description: Understand and configure Calico's BlockAffinity resource, which controls how IP address blocks are assigned to nodes and affects IPAM efficiency and BGP route advertisement.

---

## Introduction

Calico's IPAM system assigns IP addresses to pods by dividing the IP pool into fixed-size blocks and assigning those blocks to nodes. The `BlockAffinity` resource represents the relationship between a node and a specific IP block - it tracks which blocks have affinity to a node. Borrowed IP addresses are reported by Calico IPAM, not stored as separate borrowed state on the BlockAffinity resource.

Understanding BlockAffinity is essential for diagnosing IPAM issues, optimizing IP utilization, and understanding why certain routes are advertised via BGP. Misconfigured or stale BlockAffinity entries can cause IP address exhaustion, routing issues, and pod scheduling failures.

This guide explains how BlockAffinity works, how to inspect it, and how to configure IPAM settings that influence block allocation behavior.

## Prerequisites

- Calico installed with its built-in IPAM (not host-local)
- `calicoctl` CLI installed and configured
- `kubectl` access to the cluster

## Step 1: Inspect Current BlockAffinity State

View the current block-to-node assignments in your cluster.

```bash
# List all BlockAffinity resources across the cluster

calicoctl get blockaffinities -o wide

# Check which blocks are assigned to a specific node
calicoctl get blockaffinities \
  --output yaml | grep -A5 "node: my-node-name"

# Count the number of blocks per node
calicoctl get blockaffinities -o json | \
  python3 -c "import sys, json; data=json.load(sys.stdin); \
  [print(b['spec']['node'], b['spec']['cidr']) for b in data['items']]"
```

## Step 2: Understand Block Allocation Configuration

Configure the block size that determines how many IPs are in each block assigned to a node.

```yaml
# ippool-block-size.yaml
# IPPool with a /26 block size - each block contains 64 addresses
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: custom-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  # Block size determines the number of IPs allocated per node
  # /26 = 64 addresses per block
  blockSize: 26
  ipipMode: Never
  natOutgoing: true
  nodeSelector: all()
```

```bash
# Create the IPPool with the required block size
# The blockSize field can only be set when the pool is created
calicoctl create -f ippool-block-size.yaml

# Verify the block size is set correctly
calicoctl get ippool custom-ipv4-ippool -o yaml | grep blockSize
```

## Step 3: Diagnose Stale BlockAffinity Entries

Stale BlockAffinity entries from deleted nodes can exhaust IP space.

```bash
# List BlockAffinity entries for nodes that no longer exist
# First, get all current node names
CURRENT_NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')

# Then list all block affinities and compare
calicoctl get blockaffinities -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
current_nodes = set(sys.argv[1].split())
nodes_with_blocks = set(b['spec']['node'] for b in data['items'])
print('Nodes with blocks:', sorted(nodes_with_blocks))
print('Stale nodes:', sorted(nodes_with_blocks - current_nodes))
" "$CURRENT_NODES"

# Remove the stale Calico node resource after confirming the host is gone
calicoctl delete node <stale-node-name>
```

## Step 4: Observe BGP Route Advertisement from Block Affinity

In BGP mode, with BGP export enabled for the IP pool, affine IPAM blocks are advertised as aggregated routes from the owning node. Borrowed addresses are advertised as more specific routes.

```bash
# Check BGP peering status
calicoctl node status

# Confirm that block CIDRs appear in the local routing table
# On a node with BGP, list the routes in the routing table
ip route show | grep "10.244"

# Verify that route counts match expected BlockAffinity and borrowed-address behavior
```

## Step 5: Configure Node-Specific IP Pool Assignment

Assign specific IP pools to specific nodes using node selectors.

```yaml
# ippool-zone-a.yaml
# IP pool reserved for nodes in zone A
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-a-pool
spec:
  cidr: 10.244.0.0/17
  blockSize: 26
  ipipMode: Never
  natOutgoing: true
  # Only nodes labeled topology.kubernetes.io/zone=zone-a get this pool
  nodeSelector: topology.kubernetes.io/zone == "zone-a"
---
# ippool-zone-b.yaml
# IP pool reserved for nodes in zone B
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-b-pool
spec:
  cidr: 10.244.128.0/17
  blockSize: 26
  ipipMode: Never
  natOutgoing: true
  nodeSelector: topology.kubernetes.io/zone == "zone-b"
```

```bash
# Apply the zone-specific IP pools
calicoctl apply -f ippool-zone-a.yaml
calicoctl apply -f ippool-zone-b.yaml

# Verify the pools and node labels used for assignment
calicoctl get ippool -o wide
kubectl get nodes --show-labels | grep "topology.kubernetes.io/zone"
```

## Best Practices

- Choose block size based on your average pod density - too large wastes IPs, too small causes frequent borrowing
- Monitor the `ipam_blocks` Prometheus metric, or `ipam_blocks_per_node` for legacy integrations, to detect imbalanced allocations
- Clean up stale BlockAffinity entries from deleted nodes to reclaim IP space
- Use node selectors on IP pools to align addressing with your network topology
- Avoid changing block size on live pools - migrate to a new pool instead

## Conclusion

Calico's BlockAffinity mechanism provides an efficient and scalable approach to pod IP address management, but it requires understanding to operate correctly at scale. By monitoring block allocations, cleaning stale entries, and sizing blocks appropriately for your workload, you ensure that your cluster never runs out of pod IPs and that BGP route tables remain manageable.
