# How to Handle PGs Stuck in backfill_toofull+peered State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Troubleshooting, Storage

Description: Diagnose and resolve Ceph placement groups stuck in the backfill_toofull+peered state caused by insufficient OSD capacity during backfill.

---

## Understanding backfill_toofull+peered

A Ceph placement group (PG) enters the `backfill_toofull+peered` state when it needs to backfill data to an OSD but that OSD is too full to accept new data. Ceph pauses the backfill rather than allow OSDs to exceed their `backfillfull_ratio` threshold, which defaults to 90% of capacity.

This state is distinct from `full` - the cluster can still serve reads and writes to other PGs, but the stuck PG cannot complete data migration.

## Identifying the Problem

```bash
# Check overall cluster health
ceph -s

# Find PGs in backfill_toofull state
ceph pg dump pgs | grep backfill_toofull

# Get detailed info about the stuck PG
ceph pg 2.3a query | python3 -m json.tool

# Check OSD utilization
ceph osd df tree
```

Example health warning:

```text
HEALTH_WARN 3 pgs backfill_toofull
pg 2.3a is active+backfill_toofull+peered
```

## Root Causes

- Target OSD is above `backfillfull_ratio` (default 90%)
- Cluster is globally near-full
- Data is unevenly distributed across OSDs
- CRUSH weights are misconfigured

## Resolution Strategy 1 - Free Up Space

The cleanest fix is to reduce data volume on the target OSD:

```bash
# Check which OSD is full
ceph pg 2.3a query | grep "backfill_targets"

# Check usage for that OSD
ceph osd df | grep "osd.X"

# Reweight an overfull OSD to redistribute data
ceph osd reweight osd.X 0.85
```

## Resolution Strategy 2 - Adjust Thresholds Temporarily

If you need to unblock the PG immediately and have some headroom:

```bash
# Temporarily raise the backfillfull threshold
ceph osd set-backfillfull-ratio 0.95

# Monitor the PG as it resumes backfill
watch -n 5 "ceph pg dump pgs | grep backfill"

# Restore the original threshold after backfill completes
ceph osd set-backfillfull-ratio 0.90
```

## Resolution Strategy 3 - Add Capacity

If the cluster is genuinely near-full, add OSDs:

```yaml
# In Rook CephCluster spec, expand the storage section
spec:
  storage:
    storageClassDeviceSets:
      - name: set1
        count: 4  # increase from previous count
        portable: true
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              resources:
                requests:
                  storage: 2Ti
              storageClassName: local-storage
              volumeMode: Block
              accessModes:
                - ReadWriteOnce
```

## Resolution Strategy 4 - Fix CRUSH Weights

If specific OSDs are overloaded due to imbalanced weights:

```bash
# Run the balancer to equalize distribution
ceph balancer on
ceph balancer mode upmap
ceph balancer status

# Or manually set CRUSH weight to match actual OSD size (in TB)
ceph osd crush reweight osd.X 2.0
```

## Verifying Recovery

After applying a fix, confirm the PG state transitions:

```bash
# Watch PG state changes
watch -n 3 "ceph pg dump pgs | awk '{print \$1, \$13}' | grep -v active+clean"

# Confirm no more backfill_toofull PGs
ceph health detail | grep toofull
```

## Summary

PGs stuck in `backfill_toofull+peered` indicate that target OSDs lack space for data migration. Resolve this by reweighting OSDs to redistribute data, temporarily raising `osd_backfillfull_ratio`, adding new OSD capacity, or running the balancer module. Always address the underlying capacity issue rather than repeatedly raising thresholds.
