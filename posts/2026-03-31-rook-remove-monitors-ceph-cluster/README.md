# How to Remove Monitors from a Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Quorum, Administration

Description: Learn how to safely remove Ceph monitors from a Rook cluster while maintaining quorum, covering both planned removal and failed monitor cleanup.

---

## When to Remove Monitors

You may need to remove monitors when: scaling down from 5 to 3 monitors to reduce resource usage, replacing a monitor running on a node you are decommissioning, or cleaning up a failed monitor that is no longer recoverable. The critical constraint is maintaining quorum - you must always have a majority of monitors operational after removal.

## Checking Monitor Status Before Removal

Confirm quorum status and identify which monitor you want to remove:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon dump

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph quorum_status --format json | python3 -m json.tool
```

Note the monitor names (e.g., `a`, `b`, `c`, `d`, `e`) and their addresses.

## Reducing Monitor Count via CephCluster CRD

The recommended way to remove monitors in Rook is by reducing the count in the `CephCluster` spec:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
```

Change the count:

```yaml
spec:
  mon:
    count: 3
```

The Rook operator will select which monitors to remove and clean them up gracefully. Monitor the operator:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator -f | grep -i "mon\|remov"
```

## Manually Removing a Specific Failed Monitor

If a specific monitor has failed and the operator cannot clean it up automatically, remove it manually:

```bash
# Identify the failed monitor name
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon dump

# Remove from the monitor map
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon remove <mon-name>
```

Delete the associated Kubernetes resources:

```bash
# Delete the MON pod and deployment
kubectl -n rook-ceph delete deploy rook-ceph-mon-<name>

# Delete the MON service
kubectl -n rook-ceph delete svc rook-ceph-mon-<name>

# Remove MON PVC if using PVC-backed monitors
kubectl -n rook-ceph delete pvc rook-ceph-mon-<name>
```

## Cleaning Up Monitor Configmap

Rook stores monitor endpoints in a ConfigMap. Remove stale entries:

```bash
kubectl -n rook-ceph get configmap rook-ceph-mon-endpoints -o yaml
kubectl -n rook-ceph edit configmap rook-ceph-mon-endpoints
```

Remove the entry for the deleted monitor from the `data.mapping` and `data.data` fields.

## Verifying Quorum After Removal

After removing a monitor, confirm the remaining monitors form quorum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph quorum_status

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status
```

The cluster should return to `HEALTH_OK`.

## Summary

Removing monitors in Rook is best done declaratively by reducing `mon.count` in the `CephCluster` spec. For failed monitors that need immediate removal, use `ceph mon remove` from the toolbox followed by manual cleanup of Kubernetes resources and the monitor endpoints ConfigMap. Always verify quorum after removal.
