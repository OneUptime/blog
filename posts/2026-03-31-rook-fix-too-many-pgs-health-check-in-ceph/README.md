# How to Fix TOO_MANY_PGS Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Placement Group, Health Check, Performance

Description: Learn how to resolve TOO_MANY_PGS in Ceph, a warning that the total PG count across all pools exceeds the recommended limit per OSD, causing memory and CPU overhead.

---

## What Is TOO_MANY_PGS?

`TOO_MANY_PGS` is a Ceph health warning that fires when the total number of Placement Groups across all pools divided by the number of OSDs exceeds the configured `mon_max_pg_per_osd` threshold (default: 250). Each PG consumes memory on every OSD that hosts it, so too many PGs lead to excessive RAM usage and slower OSD operations.

This is the opposite problem from `TOO_FEW_PGS` and is commonly seen after clusters have been running for a long time with many pools, or when PG counts were set too high during initial configuration.

## Diagnosing the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] TOO_MANY_PGS: Too many PGs per OSD (310 > max 250)
    consider decreasing pool pg_num or add more OSDs
```

Check current total PG count and per-OSD ratio:

```bash
ceph pg stat
ceph osd stat
echo "Total PGs / OSD count = PGs per OSD"
```

List all pools and their PG counts to find the largest:

```bash
ceph osd pool ls detail | sort -k7 -n -r
```

## Fix Options

### Option 1 - Enable the PG Autoscaler

The autoscaler will reduce PG counts in pools that have too many:

```bash
ceph mgr module enable pg_autoscaler
ceph config set global osd_pool_default_pg_autoscale_mode on
```

Set mode to `on` for existing pools:

```bash
for pool in $(ceph osd pool ls); do
  ceph osd pool set $pool pg_autoscale_mode on
done
```

### Option 2 - Manually Reduce PG Count for Oversharded Pools

Identify pools with excessive PGs relative to their data:

```bash
ceph osd pool autoscale-status
```

Look for pools where current `PG_NUM` is much higher than `NEW_PG_NUM`. Reduce them:

```bash
ceph osd pool set large-pool pg_num 128
```

Note: PG merging (reducing `pg_num`) was added in Ceph Nautilus. Monitor progress:

```bash
watch ceph -s
```

Then reduce `pgp_num`:

```bash
ceph osd pool set large-pool pgp_num 128
```

### Option 3 - Delete Unused Pools

Remove pools that are no longer needed:

```bash
ceph osd pool ls
ceph osd pool rm <unused-pool> <unused-pool> --yes-i-really-really-mean-it
```

### Option 4 - Increase the mon_max_pg_per_osd Limit

As a temporary workaround, raise the threshold:

```bash
ceph config set global mon_max_pg_per_osd 300
```

### Option 5 - Add More OSDs

Adding OSDs distributes PGs across more devices, reducing the per-OSD count. First add new disks or nodes, then update the CephCluster resource to include the new storage:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
```

After saving the updated spec, the Rook operator will detect the change and create new OSD pods. Monitor progress:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -w
```

## Memory Impact

Each PG consumes roughly 10 MB of OSD memory. With 300 PGs per OSD, that is 3 GB of memory per OSD just for PG overhead. Calculate your OSD memory requirements:

```bash
ceph tell osd.* heap stats
```

## Summary

`TOO_MANY_PGS` warns that PG overhead per OSD is too high, increasing memory usage and slowing operations. Fix it by enabling the PG autoscaler to automatically right-size PG counts, manually reducing oversharded pools, removing unused pools, or adding more OSDs to distribute the load. Target 100-200 PGs per OSD for optimal performance.
