# How to Remove Nodes from a Rook-Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Node Management, Decommissioning, Kubernetes, Storage

Description: Learn how to safely remove nodes from a Rook-Ceph cluster - covering OSD evacuation, CRUSH map updates, PG rebalancing, and clean node decommissioning.

---

## Overview

Removing a node from a Rook-Ceph cluster requires careful sequencing to avoid data loss. Data must be fully migrated off the node before it is removed from the CRUSH map. Never delete a node abruptly without following this process.

## Step 1: Identify OSDs on the Target Node

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
# Note all OSD IDs on the target node, e.g., worker-2: osd.3, osd.4
```

## Step 2: Mark OSDs Out

Marking OSDs `out` triggers data migration to other OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd out osd.3
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd out osd.4
```

Wait for recovery to complete. This is the most important step:

```bash
watch kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status
# Wait until: "recovery io 0 B/s" and "all PGs active+clean"
```

## Step 3: Stop OSD Processes

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd down osd.3
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd down osd.4
```

Delete the OSD deployments:

```bash
kubectl -n rook-ceph delete deployment rook-ceph-osd-3
kubectl -n rook-ceph delete deployment rook-ceph-osd-4
```

## Step 4: Remove OSDs from CRUSH Map

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush remove osd.3
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush remove osd.4

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth del osd.3
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth del osd.4

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd rm osd.3
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd rm osd.4
```

Remove the node bucket from CRUSH:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush remove worker-2
```

## Step 5: Update the CephCluster Specification

Remove the node from the explicit node list:

```yaml
spec:
  storage:
    nodes:
    - name: "worker-1"
      devices:
      - name: "sdb"
    # worker-2 removed
    - name: "worker-3"
      devices:
      - name: "sdb"
```

```bash
kubectl -n rook-ceph apply -f ceph-cluster.yaml
```

## Step 6: Clean Up Kubernetes Resources

```bash
# Remove any remaining OSD-related ConfigMaps
kubectl -n rook-ceph get configmaps | grep worker-2
kubectl -n rook-ceph delete configmap rook-ceph-osd-3-status

# Drain and remove the node from Kubernetes
kubectl drain worker-2 --ignore-daemonsets --delete-emptydir-data
kubectl delete node worker-2
```

## Step 7: Verify Cluster Health

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

## Summary

Safe node removal from Rook-Ceph requires marking OSDs out and waiting for full data evacuation before removing them from the CRUSH map. Skipping the wait step risks data loss if the remaining OSDs cannot meet the replication requirements.
