# How to Fix PG_BACKFILL_FULL Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Placement Group, Health Check, Backfill

Description: Learn how to resolve PG_BACKFILL_FULL in Ceph, which pauses backfill operations when OSDs are projected to exceed the backfillfull_ratio threshold.

---

## What Is PG_BACKFILL_FULL?

`PG_BACKFILL_FULL` is a Ceph health warning that occurs when one or more OSDs are projected to exceed the `backfillfull_ratio` if a backfill operation were to complete. Ceph pauses backfill to avoid pushing OSDs into a full state, which would block all writes.

Backfill is the process Ceph uses to copy data to a new OSD or restore replicas after an OSD failure. `PG_BACKFILL_FULL` differs from `PG_RECOVERY_FULL` in that it specifically applies to backfill operations rather than recovery from PG degradation.

## Diagnosing the Issue

Check health detail:

```bash
ceph health detail
ceph df
ceph osd df
```

Example output:

```text
[WRN] PG_BACKFILL_FULL: Low space hindering backfill (add storage if this doesn't resolve itself): 3 pgs backfill_toofull
    pg 10.46c is active+remapped+backfill_toofull, acting [77,607,96]
    pg 10.8ad is active+remapped+backfill_toofull, acting [577,152,77]
```

Check which OSDs are near full:

```bash
ceph osd df tree | grep -E "WEIGHT|VAR"
```

Identify the backfillfull threshold:

```bash
ceph osd dump | grep backfillfull
```

## Root Causes

- Cluster capacity is nearly exhausted
- Uneven data distribution - some OSDs are much fuller than others
- Pool replication factor is too high for available capacity
- Large objects or RBD images being backfilled

## Fix Steps

### Step 1 - Rebalance the CRUSH Map

If data is unevenly distributed, check OSD weights:

```bash
ceph osd tree
```

Adjust OSD weights to encourage rebalancing away from full OSDs:

```bash
ceph osd reweight osd.5 0.8
```

The `reweight-by-utilization` command automatically adjusts weights based on disk usage. The numeric argument is the overload threshold - OSDs with utilization above this percentage of the average will be reweighted down. The default is 120 (20% above average). Lower it to be more aggressive:

```bash
ceph osd reweight-by-utilization 110
```

### Step 2 - Raise the Backfillfull Ratio Temporarily

```bash
ceph osd set-backfillfull-ratio 0.92
```

### Step 3 - Free Up Space

Delete unused RBD images, snapshots, or stale objects:

```bash
rbd ls <pool-name>
rbd rm <pool-name>/<unused-image>
rados -p <pool-name> ls | xargs -I{} rados -p <pool-name> stat {}
```

### Step 4 - Expand Cluster Capacity

Add new OSDs via Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  storage:
    nodes:
    - name: "new-node-01"
      devices:
      - name: "sdb"
```

After new OSDs are added, backfill resumes automatically once OSDs drop below the `backfillfull_ratio`. If you had previously set the `nobackfill` flag manually, unset it:

```bash
ceph osd unset nobackfill
```

## Monitoring Backfill Progress

```bash
ceph -s | grep backfill
ceph pg dump | grep backfill
watch "ceph -s | grep -E 'pgs|backfill'"
```

## Summary

`PG_BACKFILL_FULL` pauses backfill operations to prevent OSDs from exceeding capacity limits. Fix it by rebalancing OSD weights with `reweight-by-utilization`, freeing unused data, temporarily raising the backfillfull ratio, or expanding the cluster with new OSDs. Once sufficient space is available, backfill resumes and the warning clears.
