# Migrate BlockAffinity Behavior in Calico Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, ipam, blockaffinity, kubernetes, migration, networking, ip-management

Description: Learn how to safely migrate and manage Calico's BlockAffinity behavior when changing IPAM configurations or migrating between Calico versions.

---

## Introduction

Calico's IPAM system allocates IP addresses to pods using blocks—subnets carved from IP pools and assigned to specific nodes. The BlockAffinity resource represents the relationship between a node and its assigned IP blocks. When migrating IPAM configurations, changing block sizes, or moving between IP pools, understanding and correctly managing BlockAffinity is essential to prevent IP address conflicts and routing failures.

Misconfigured or stale BlockAffinity resources can cause pods to receive duplicate IPs, routes to be advertised incorrectly, or IPAM to run out of allocatable addresses prematurely. A systematic migration approach ensures block affinities are consistent with actual allocations.

This guide covers auditing existing BlockAffinity resources, safely migrating block assignments when changing IPAM configuration, and validating consistency after migration.

## Prerequisites

- Kubernetes cluster with Calico v3.x installed
- `calicoctl` CLI configured with datastore access
- Cluster admin permissions
- Understanding of your current IP pool CIDR and block size

## Step 1: Audit Current BlockAffinity Resources

Before making any changes, capture the current state of all BlockAffinity resources and correlate them with actual pod IP allocations.

```bash
# List all BlockAffinity resources showing node-to-block assignments
calicoctl get blockaffinity -o yaml

# List all IP allocations to cross-reference with block affinities
calicoctl ipam show --show-blocks

# Show detailed IPAM utilization per block
calicoctl ipam show --show-blocks --ip=10.244.0.0/16
```

## Step 2: Identify Stale or Orphaned Block Affinities

Stale BlockAffinity resources from deleted nodes waste IP space and can cause routing issues.

```bash
# List BlockAffinity resources and compare with current nodes
calicoctl get blockaffinity -o jsonpath='{range .items[*]}{.spec.node}{"\n"}{end}' | sort > /tmp/blocks-nodes.txt
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | sort > /tmp/current-nodes.txt

# Find BlockAffinity resources for nodes that no longer exist
comm -23 /tmp/blocks-nodes.txt /tmp/current-nodes.txt

# Release blocks for deleted nodes - replace NODE_NAME with the stale node name
calicoctl ipam release-leaked-ips --dry-run  # Preview what would be released
```

## Step 3: Configure a New IP Pool Before Migration

When migrating to a new block size or IP range, create the new IP pool before deprecating the old one to allow a gradual transition.

```yaml
# calico-ipam/new-ip-pool.yaml - New IP pool with updated block size for migration
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: new-pool-26
spec:
  cidr: 10.245.0.0/16
  # Use /26 blocks (64 IPs per node) for more efficient allocation in large clusters
  blockSize: 26
  ipipMode: CrossSubnet
  natOutgoing: true
  # Enable the new pool for new allocations
  disabled: false
---
# Disable the old pool to prevent new allocations while keeping existing ones alive
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: old-pool-24
spec:
  cidr: 10.244.0.0/16
  blockSize: 24
  # Disabling prevents new pods from getting IPs from this pool
  disabled: true
```

## Step 4: Migrate Workloads to the New Block

Roll pods over to the new pool by node, allowing Calico to allocate new blocks from the updated IP pool.

```bash
# Drain a node to trigger pod rescheduling on new IP pool blocks
kubectl drain NODE_NAME --ignore-daemonsets --delete-emptydir-data

# Verify the node receives a new block from the new IP pool after uncordoning
kubectl uncordon NODE_NAME

# Check that new pods get IPs from the new pool
kubectl get pods -o wide -n default | grep NODE_NAME

# Verify new BlockAffinity for the migrated node
calicoctl get blockaffinity | grep NODE_NAME
```

## Step 5: Clean Up Old Block Affinities

After all workloads have migrated, release the old IP blocks and remove stale BlockAffinity resources.

```bash
# Show blocks still allocated from old pool
calicoctl ipam show --show-blocks | grep "10.244"

# After all pods have migrated, check for unreleased IPs in old pool
calicoctl ipam check

# Release any leaked IPs from the old pool
calicoctl ipam release-leaked-ips

# Delete the old pool once all blocks are released
calicoctl delete ippool old-pool-24
```

## Best Practices

- Always take a snapshot of BlockAffinity resources before making IPAM changes (`calicoctl get blockaffinity -o yaml > backup.yaml`)
- Use `--dry-run` with any release commands before executing them in production
- Migrate nodes one at a time rather than draining all nodes simultaneously
- Keep both old and new IP pools active during migration to avoid pod scheduling failures
- Run `calicoctl ipam check` after migration to verify consistency between IPAM records and actual allocations
- Monitor Calico IPAM metrics for signs of allocation failures during migration

## Conclusion

Safely migrating BlockAffinity behavior in Calico requires understanding the relationship between IP pools, blocks, and node assignments. By auditing existing affinities, creating new pools before disabling old ones, and migrating nodes incrementally, you can transition to new IPAM configurations without disrupting workload connectivity.
