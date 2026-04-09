# How to Fix POOL_TOO_FEW_PGS Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Pool, Placement Group, Health Check

Description: Learn how to resolve POOL_TOO_FEW_PGS in Ceph, a per-pool warning indicating insufficient PGs for the pool's data volume relative to cluster capacity.

---

## What Is POOL_TOO_FEW_PGS?

`POOL_TOO_FEW_PGS` is a Ceph health warning that is similar to `TOO_FEW_PGS` but is specific to an individual pool. It fires when the autoscaler or Ceph's health checks determine that a particular pool needs more PGs based on the amount of data it contains relative to the overall cluster capacity.

This is distinct from `TOO_FEW_PGS` (which is based on OSD count) - `POOL_TOO_FEW_PGS` is triggered when a pool holds a disproportionately large amount of data with too few PGs to distribute it efficiently.

## Diagnosing the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] POOL_TOO_FEW_PGS: Too few PGs in pool 'volumes'
    pool 'volumes' has 64 PGs but should have 256
```

Check the autoscaler's recommendation:

```bash
ceph osd pool autoscale-status
```

Look at the `NEW PG_NUM` column to see what the autoscaler recommends:

```text
POOL    SIZE     TARGET SIZE  RATE  RAW CAPACITY   RATIO  TARGET RATIO  EFFECTIVE RATIO  BIAS  PG_NUM  NEW PG_NUM  AUTOSCALE  BULK
volumes 1.2 TiB              3.0   6.0 TiB        0.2                                   1.0   64      256         warn       False
```

## Fix Steps

### Option 1 - Let the Autoscaler Handle It

If autoscale mode is set to `on`, the autoscaler will adjust PG counts automatically:

```bash
ceph osd pool set volumes pg_autoscale_mode on
```

Verify the mode is active:

```bash
ceph osd pool get volumes pg_autoscale_mode
```

### Option 2 - Manually Set PG Count

Calculate the recommended PG count using the autoscaler output and manually set it:

```bash
ceph osd pool set volumes pg_num 256
```

Wait for PG splitting to complete:

```bash
watch ceph -s
```

> **Note:** In Ceph Nautilus (14.x) and later, `pgp_num` is automatically adjusted to match `pg_num`, so the following step is only needed for older releases.

```bash
ceph osd pool set volumes pgp_num 256
```

### Option 3 - Set Target Size for Better Autoscaling

Tell Ceph how large you expect this pool to grow so it can proactively scale PGs:

```bash
ceph osd pool set volumes target_size_bytes 2199023255552
```

Or as a ratio of total cluster capacity:

```bash
ceph osd pool set volumes target_size_ratio 0.3
```

## Monitoring PG Distribution

After adjusting PG counts, verify data is evenly distributed:

```bash
ceph osd df
ceph pg stat
```

PG variance should be close to 1.0 across OSDs.

## Summary

`POOL_TOO_FEW_PGS` indicates a specific pool has insufficient PGs for the data it currently holds. The easiest fix is enabling the PG autoscaler, which handles PG count management automatically. For manual control, use the autoscaler's `NEW PG_NUM` recommendation to set the target PG count, and optionally configure `target_size_bytes` or `target_size_ratio` to allow proactive scaling.
