# How to Migrate a Ceph Cluster to New Hardware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Migration, Hardware, OSD

Description: Learn how to migrate a Ceph cluster to new hardware by incrementally replacing nodes and OSDs while keeping the cluster healthy and data available throughout.

---

Hardware refreshes are a normal part of cluster lifecycle. Migrating Ceph to new hardware requires adding new nodes, rebalancing data, and decommissioning old nodes - all while keeping the cluster operational.

## Pre-Migration Planning

Before starting, document your current state:

```bash
ceph -s
ceph osd tree
ceph df
ceph osd dump | grep -E "^pool"
```

Ensure the cluster is healthy and all PGs are active+clean before beginning migration.

## Step 1 - Add New Nodes to the Cluster

In Rook, add new nodes by updating the storage configuration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    nodes:
    - name: old-node-1
      devices:
      - name: sdb
    - name: old-node-2
      devices:
      - name: sdb
    - name: new-node-1      # New hardware
      devices:
      - name: nvme0n1
    - name: new-node-2      # New hardware
      devices:
      - name: nvme0n1
```

Wait for new OSDs to come up:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
ceph osd tree | grep -E "new-node"
```

## Step 2 - Let Ceph Rebalance

Ceph automatically rebalances data onto new OSDs. Monitor progress:

```bash
watch ceph -s
ceph pg stat
```

Wait for all PGs to return to active+clean before proceeding.

## Step 3 - Migrate Monitors

Add a new mon on the new hardware:

```bash
# Rook handles mon placement via CephCluster spec
# Update the mon placement to prefer new nodes
```

In cephadm:

```bash
ceph orch daemon add mon new-node-1
ceph mon remove old-mon-a
```

## Step 4 - Remove Old Nodes

Mark each old OSD as out and let data migrate away:

```bash
# Mark old OSDs out
ceph osd out osd.0 osd.1 osd.2

# Monitor rebalance
watch ceph -s
```

Once all PGs are active+clean with old OSDs out:

```bash
# Remove OSDs permanently
for osd in 0 1 2; do
  ceph osd purge $osd --yes-i-really-mean-it
done
```

## Step 5 - Remove Old Nodes from CRUSH

```bash
ceph osd crush remove old-node-1
ceph osd crush remove old-node-2
```

## Step 6 - Migrate in Rook

Remove old nodes from the CephCluster storage spec and delete the OSD pods:

```bash
kubectl -n rook-ceph delete deployment -l app=rook-ceph-osd,topology-location-host=old-node-1
```

## Verifying Migration Complete

```bash
ceph -s
ceph osd tree
ceph df
```

All data should now reside on new hardware with full redundancy.

## Summary

Migrating a Ceph cluster to new hardware is an incremental process: add new nodes, wait for rebalancing, then decommission old nodes one at a time. Following the mark-out, verify, purge sequence ensures data is never at risk during the migration. Rook simplifies this by handling OSD provisioning and removal through the CephCluster spec.
