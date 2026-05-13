# Migrate BlockAffinity Behavior in Calico Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, BlockAffinity, Kubernetes, Migration, Networking, Ip-management

Description: Learn how to safely migrate and manage Calico's BlockAffinity behavior when changing IPAM configurations or migrating between Calico versions.

---

## Introduction

Calico's IPAM system allocates IP addresses to pods using blocks-subnets carved from IP pools and assigned to specific nodes. The BlockAffinity resource represents the affinity for an IPAM block. When migrating IPAM configurations, changing block sizes, or moving between IP pools, understanding BlockAffinity is essential to prevent wasted address space and routing failures.

Misconfigured or stale BlockAffinity resources can waste IP space, cause routes to be advertised incorrectly, or make IPAM run out of allocatable addresses prematurely. A systematic migration approach ensures block affinities are consistent with actual allocations.

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

# Check whether a specific IP address is assigned
calicoctl ipam show --ip=10.244.0.10
```

## Step 2: Identify Stale or Orphaned Block Affinities

Stale BlockAffinity resources from deleted nodes waste IP space and can cause routing issues.

```bash
# List BlockAffinity resources and compare with current nodes
calicoctl get blockaffinity -o jsonpath='{range .items[*]}{.spec.node}{"\n"}{end}' | sort > /tmp/blocks-nodes.txt
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | sort > /tmp/current-nodes.txt

# Find BlockAffinity resources for nodes that no longer exist
comm -23 /tmp/blocks-nodes.txt /tmp/current-nodes.txt

# Generate a report of leaked IPAM allocations before releasing anything
calicoctl ipam check --show-problem-ips -o /tmp/ipam-report.json
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
```

After applying and verifying the new pool, disable the old pool to prevent new allocations while keeping existing workloads alive:

```bash
calicoctl apply -f calico-ipam/new-ip-pool.yaml
calicoctl patch ippool old-pool-24 -p '{"spec": {"disabled": true}}'
```

## Step 4: Migrate Workloads to the New Block

Roll pods over to the new pool by node, allowing Calico to allocate new blocks from the updated IP pool.

```bash
# Drain a node to trigger pod rescheduling on new IP pool blocks
kubectl drain NODE_NAME --ignore-daemonsets --delete-emptydir-data

# Allow workloads to be scheduled on the node again
kubectl uncordon NODE_NAME

# Check that new pods scheduled on the node get IPs from the new pool
kubectl get pods -o wide -n default | grep NODE_NAME

# Verify new BlockAffinity for the migrated node
calicoctl get blockaffinity | grep NODE_NAME
```

## Step 5: Clean Up Old Block Affinities

After all workloads have migrated, verify there are no leaked allocations from the old pool and let Calico clean up unused block affinities.

```bash
# Show blocks still allocated from old pool
calicoctl ipam show --show-blocks | grep "10.244"

# After all pods have migrated, generate a report of leaked IPs
calicoctl ipam check --show-problem-ips -o /tmp/ipam-report.json

# Release leaked IPs from the reviewed report, if any
calicoctl ipam release --from-report=/tmp/ipam-report.json

# Delete the old pool once all blocks are released
calicoctl delete ippool old-pool-24
```

## Best Practices

- Always take a snapshot of BlockAffinity resources before making IPAM changes (`calicoctl get blockaffinity -o yaml > backup.yaml`)
- Review the `calicoctl ipam check` report before releasing leaked IPs in production
- Migrate nodes one at a time rather than draining all nodes simultaneously
- Keep the old pool present until all existing pods have migrated, but disable it after the new pool is verified so new allocations use the new pool
- Run `calicoctl ipam check` after migration to verify consistency between IPAM records and actual allocations
- Monitor Calico IPAM metrics for signs of allocation failures during migration

## Conclusion

Safely migrating BlockAffinity behavior in Calico requires understanding the relationship between IP pools, blocks, and node assignments. By auditing existing affinities, creating new pools before disabling old ones, and migrating nodes incrementally, you can transition to new IPAM configurations without disrupting workload connectivity.
