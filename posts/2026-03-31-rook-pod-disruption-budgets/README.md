# How to Manage Pod Disruption Budgets in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, PodDisruptionBudget, Availability, Maintenance

Description: Understand and configure Pod Disruption Budgets for Rook-Ceph daemons to ensure Kubernetes voluntary disruptions never take down enough pods to break quorum or cause data loss.

---

## What Pod Disruption Budgets Do

A Pod Disruption Budget (PDB) tells the Kubernetes eviction API the minimum number of pods that must remain available during voluntary disruptions - node drains, cluster upgrades, or autoscaler scale-down.

Without PDBs, draining two nodes simultaneously could evict all three Ceph monitors, destroying quorum. With PDBs, the second drain blocks until the first monitor is back up and healthy.

## Rook-Managed PDBs

Rook automatically creates PDBs for most Ceph daemon types. You do not need to create them manually. Inspect what Rook has created:

```bash
kubectl -n rook-ceph get poddisruptionbudget
```

Sample output:

```text
NAME                         MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
rook-ceph-mgr                1               N/A               1                     7d
rook-ceph-mon-pdb             2               N/A               1                     7d
rook-ceph-osd-tree-mon-a      1               N/A               0                     7d
```

The monitor PDB requires at least 2 of 3 monitors to remain available, allowing only one to be down at any time.

## Enabling Managed PDB Blocking

Rook includes a more intelligent OSD disruption mode controlled by the `managePodBudgets` flag in the CephCluster custom resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  disruptionManagement:
    managePodBudgets: true
    osdMaintenanceTimeout: 30
```

When OSD disruption management is enabled, Rook dynamically adjusts OSD PDBs based on current cluster health. If backfilling is in progress, it blocks further disruptions until replication returns to the desired count.

## Viewing PDB Status During a Node Drain

During a `kubectl drain`, check whether PDBs are blocking and why:

```bash
kubectl get pdb -n rook-ceph -o wide
```

The `ALLOWED DISRUPTIONS` column shows `0` when no more pods can be evicted safely. The drain will wait (not fail) until the value rises above 0.

Describe a specific PDB to see which pods it covers:

```bash
kubectl -n rook-ceph describe pdb rook-ceph-mon-pdb
```

## Manual PDB for Custom Deployments

If you run additional Ceph-adjacent workloads in the rook-ceph namespace, create your own PDBs:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: custom-rook-mgr-pdb
  namespace: rook-ceph
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: rook-ceph-mgr
```

Avoid creating PDBs that conflict with Rook's auto-generated ones on the same label selector.

## Checking Disruption Budget Violations

If a drain appears stuck, check events for eviction failures:

```bash
kubectl -n rook-ceph get events --sort-by='.lastTimestamp' | grep -i disruption
```

This shows which PDBs are blocking eviction and which pods are covered.

## Summary

Rook automatically creates Pod Disruption Budgets that protect Ceph quorum during voluntary Kubernetes operations. Enabling OSD disruption management adds intelligent backfill-aware blocking that prevents node drains from triggering data recovery work. Understanding PDB behavior is essential for safely draining nodes, upgrading Kubernetes, or running cluster autoscaling alongside Rook-Ceph.
