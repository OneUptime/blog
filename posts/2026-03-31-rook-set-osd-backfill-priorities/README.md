# How to Set OSD Backfill Priorities in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Backfill, Performance

Description: Learn how to configure OSD backfill priorities in Ceph to control data rebalancing speed and protect production workload performance.

---

## Backfill vs Recovery in Ceph

Ceph uses two related but distinct processes for healing data. Recovery applies to PGs that are currently undersized or degraded - data must be replicated immediately to restore redundancy. Backfill applies when data needs to be moved to new or reweighted OSDs to rebalance the cluster. Backfill is lower priority than recovery by default, but it can still significantly impact I/O if left unconstrained.

## Key Backfill Parameters

The main parameters controlling backfill are:

- `osd_max_backfills` - maximum number of concurrent backfill operations per OSD (default: 1)
- `osd_backfill_scan_min` - minimum number of objects scanned per backfill step
- `osd_backfill_scan_max` - maximum number of objects scanned per backfill step
- `osd_backfill_full_ratio` - fraction of full at which backfill is refused

## Checking Current Backfill Activity

Use the Rook toolbox to see active backfill operations:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

PGs in `active+backfilling` state are currently undergoing backfill. Count them with:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep backfilling | wc -l
```

## Reducing Backfill Concurrency

To limit backfill impact on production clients:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_max_backfills 1

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_backfill_scan_min 4

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_backfill_scan_max 32
```

## Pausing and Resuming Backfill

You can pause all backfill operations temporarily without changing configuration:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd set nobackfill
```

Resume backfill when ready:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd unset nobackfill
```

## Persisting Backfill Settings with a ConfigMap

Persist backfill settings across Rook operator restarts using the `rook-config-override` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    osd_max_backfills = 1
    osd_backfill_scan_min = 8
    osd_backfill_scan_max = 64
```

After applying the ConfigMap, restart the OSD pods to pick up the changes.

## Monitoring Backfill Progress

Track backfill completion with the `watch` command:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 10 "ceph status | grep -E 'backfill|misplaced'"
```

The `misplaced` object count decreases as backfill completes. When it reaches zero, all data is optimally placed.

## Summary

Backfill in Ceph rebalances data after OSD weight changes or additions. Setting `osd_max_backfills` to 1 and reducing scan limits protects production I/O. The `nobackfill` flag lets operators pause rebalancing during critical windows without permanently changing configuration. Persisting settings in the `rook-config-override` ConfigMap ensures consistent behavior across cluster lifecycle events.
