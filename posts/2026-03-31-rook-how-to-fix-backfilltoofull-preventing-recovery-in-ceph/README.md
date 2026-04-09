# How to Fix 'backfill_toofull' Preventing Recovery in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Backfill, Recovery, Troubleshooting

Description: Resolve the backfill_toofull condition in Ceph that blocks PG recovery by freeing OSD space, reweighting OSDs, or raising the backfillfull ratio.

---

## What backfill_toofull Means

When Ceph is recovering degraded placement groups, it uses a process called "backfill" to copy data to OSDs. The `backfill_toofull` condition occurs when the target OSD for backfill is at or above the `backfillfull_ratio` threshold (default: 90%). Ceph stops backfill to that OSD to prevent it from becoming completely full.

This creates a catch-22: recovery is needed but the destination OSD is too full to accept new data.

## Step 1 - Identify the Condition

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Output:

```text
HEALTH_WARN 2 pgs backfill_toofull; 1 near full osd
2 pgs not deep-scrubbed in time
pg 3.5 is backfill_toofull
pg 3.7 is backfill_toofull
1 nearfull osd(s)
OSD 2 is near full at 89.5%
```

## Step 2 - Check OSD Utilization

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

Identify which OSDs are nearly full:

```text
ID  CLASS  WEIGHT    USE%  VAR   STATUS
 0    hdd  1.00000  65.00  0.93   up
 1    hdd  1.00000  72.00  1.03   up
 2    hdd  1.00000  89.50  1.28   up  <-- Near backfillfull
 3    hdd  1.00000  60.00  0.86   up
```

## Step 3 - Rebalance Data Distribution

If some OSDs are fuller than others, use Ceph's balancer to redistribute data:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph balancer on
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph balancer mode upmap
```

Or manually reweight OSDs:

```bash
# Reduce the weight of the full OSD to migrate data away
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd reweight osd.2 0.85
```

Monitor the rebalance:

```bash
watch "kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df"
```

## Step 4 - Temporarily Raise the backfillfull_ratio

As a short-term fix to allow backfill to proceed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set-backfillfull-ratio 0.95
```

**Important:** Return to the default after recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set-backfillfull-ratio 0.90
```

Check current ratios:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd dump | grep -E "full_ratio|backfillfull|nearfull"
```

## Step 5 - Delete Unnecessary Data

Identify and delete data consuming large amounts of space:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df detail
```

For RBD, delete old snapshots:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rbd snap ls <pool>/<image>
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rbd snap purge <pool>/<image>
```

For RGW:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- radosgw-admin bucket stats --bucket=<bucket>
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- radosgw-admin bucket rm --bucket=<bucket> --purge-objects
```

## Step 6 - Add OSDs to Increase Capacity

The permanent solution is to add more storage:

Update the `CephCluster` CR to include new nodes or devices:

```yaml
spec:
  storage:
    nodes:
      - name: "worker-4"
        devices:
          - name: "sdb"
```

Apply:

```bash
kubectl apply -f cephcluster.yaml
```

New OSDs will be created and data will rebalance automatically.

## Step 7 - Limit Recovery Speed While Resolving

While working on the fix, limit recovery I/O to avoid overwhelming OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs '--osd-max-backfills=1'
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs '--osd-recovery-max-active=1'
```

## Step 8 - Monitor Recovery Progress

After taking corrective action:

```bash
watch "kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status"
```

PGs should transition from `backfill_toofull` to `active+clean` as OSD utilization drops and recovery proceeds:

```text
pgs: 128 active+clean
     0 backfill_toofull
recovery: 50.0 MiB/s, 25 objects/s
```

## Summary

The `backfill_toofull` condition blocks Ceph PG recovery when target OSDs are near capacity. Resolve it by reweighting or rebalancing OSDs to distribute data more evenly, deleting unnecessary data to free space, temporarily raising the `backfillfull_ratio`, or adding new OSDs to increase overall cluster capacity. Always address the root cause - a cluster running near capacity will repeatedly encounter this condition.
