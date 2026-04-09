# How to Fix OSD_BACKFILLFULL Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Backfill, Capacity

Description: Learn how to resolve the OSD_BACKFILLFULL health warning in Ceph when OSDs approach the backfill threshold and Ceph stops routing recovery data to them.

---

## Understanding OSD_BACKFILLFULL

`OSD_BACKFILLFULL` fires when one or more OSDs exceed the `backfillfull_ratio` threshold (default 0.90 or 90% utilized). At this level, Ceph stops routing backfill operations to the affected OSDs. Unlike `OSD_FULL`, write I/O to existing data continues - but the OSD cannot receive data being migrated or recovered from other OSDs. This can stall recovery operations across the cluster.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 1 backfillfull osd(s)
[WRN] OSD_BACKFILLFULL: 1 osd(s) are backfill full
    osd.2 is backfill full (91.3% >= 90%)
```

## Identifying Affected OSDs

Check which OSDs are near or above the backfill threshold:

```bash
ceph osd df -f json-pretty | jq '.nodes[] | select(.utilization > 88) | {name: .name, utilization: .utilization}'
```

Check the current backfill ratio:

```bash
ceph osd dump | grep backfillfull_ratio
```

## Understanding the Impact

When an OSD is backfill-full, pending PG backfills are paused for that OSD:

```bash
ceph pg dump | grep backfill | head -20
```

Recovery stalls show up in:

```bash
ceph -w | grep "backfill_wait\|backfill_toofull"
```

## Option 1: Add Storage Capacity

The most sustainable fix is adding more OSD capacity. In Rook, increase the OSD count:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
```

Increase the `count` in the storage section or add new device sets:

```yaml
spec:
  storage:
    storageClassDeviceSets:
    - name: set1
      count: 5  # was 3, now 5
```

After new OSDs come up, rebalance:

```bash
ceph osd reweight-by-utilization
```

## Option 2: Reweight Full OSDs

Reduce the reweight value of the near-full OSD so less data maps to it. Note that `ceph osd reweight` adjusts a temporary override weight (0.0–1.0), which is different from the CRUSH weight changed by `ceph osd crush reweight`:

```bash
# Check current weight and reweight
ceph osd tree | grep osd.2

# Lower the reweight to shift data away
ceph osd reweight 2 0.8
```

Monitor data migration:

```bash
ceph -w
```

## Option 3: Raise the Backfill Threshold Temporarily

As a short-term measure:

```bash
ceph osd set-backfillfull-ratio 0.92
```

This allows backfill to proceed but should not be a permanent solution.

## Deleting Data to Free Space

If you can delete data from the overloaded pool:

```bash
# Check pool utilization
ceph df detail

# List and remove large objects (prepend size for sorting)
rados -p <pool-name> ls | xargs -I{} rados -p <pool-name> stat {} | awk '{print $NF, $0}' | sort -rn | head

rados -p <pool-name> rm <large-object>
```

## Configuring Rook Thresholds

Set appropriate thresholds in the CephCluster spec:

```yaml
spec:
  storage:
    fullRatio: 0.85
    backfillFullRatio: 0.80
    nearFullRatio: 0.75
```

These lower thresholds provide more buffer before hitting critical levels.

## Monitoring Backfill Progress

After applying fixes, watch recovery progress:

```bash
watch ceph status
```

Recovery is complete when PG states return to `active+clean`.

## Summary

`OSD_BACKFILLFULL` means OSDs are too full to accept backfill/recovery data. Fix by adding OSD capacity and triggering rebalancing, or by reweighting full OSDs to shift data away. Raise the backfill threshold temporarily as a stopgap if needed. Always provision capacity with 20-25% headroom above expected usage to avoid hitting backfill and full thresholds.
