# How to Configure mon_target_pg_per_osd Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Configuration, Placement Group, Storage

Description: Learn how to configure Ceph's mon_target_pg_per_osd parameter to guide the PG autoscaler in achieving optimal placement group distribution across OSDs.

---

## What is mon_target_pg_per_osd

The `mon_target_pg_per_osd` parameter tells the Ceph PG autoscaler how many placement groups (PGs) it should aim to have per OSD. This is a target, not a hard limit - the autoscaler uses it to calculate the ideal number of PGs for each pool given the current OSD count.

The default value is 100. This means with 10 OSDs and a replication factor of 3, the autoscaler would target roughly `(10 * 100) / 3 = 333` total PGs spread across pools.

## Checking Current Configuration

```bash
# View current mon_target_pg_per_osd value
ceph config get global mon_target_pg_per_osd

# Check autoscaler recommendations
ceph osd pool autoscale-status

# View current PG distribution
ceph osd pool stats
ceph osd df
```

Example autoscale-status output:

```text
POOL                  SIZE  TARGET SIZE  RATE  RAW CAPACITY  RATIO  TARGET RATIO  EFFECTIVE RATIO  BIAS  PG_NUM  NEW PG_NUM  AUTOSCALE
.mgr                  0        0B       3.0    0B            0.0     0.0           0.0             1.0     1       1          on
ceph-blockpool        1.2T     0B       3.0    10.8T         0.11    0.0           0.11            1.0    128     256         on
```

## Changing mon_target_pg_per_osd

```bash
# Set to a lower value for smaller clusters or pools
ceph config set global mon_target_pg_per_osd 50

# Set to a higher value for large, I/O-intensive clusters
ceph config set global mon_target_pg_per_osd 150

# Verify the change took effect
ceph config get global mon_target_pg_per_osd
```

## Guidelines for Choosing the Right Value

| Cluster Size | Recommended Value |
|---|---|
| 1-10 OSDs | 50-100 |
| 10-50 OSDs | 100 |
| 50-200 OSDs | 100-150 |
| 200+ OSDs | 150-200 |

Too few PGs per OSD reduces parallelism and leaves performance on the table. Too many PGs increases memory consumption on OSDs (approximately 10 MB per PG) and slows operations.

## Interplay with Pool Autoscaling

The autoscaler uses `mon_target_pg_per_osd` when pools are set to `on` or `warn` mode:

```bash
# Enable autoscaling on a specific pool
ceph osd pool set mypool pg_autoscale_mode on

# Set a target ratio hint to guide autoscaling alongside the global target
ceph osd pool set mypool target_size_ratio 0.2

# Check what PG count the autoscaler recommends
ceph osd pool autoscale-status | grep mypool
```

## Setting Per-Pool pg_num Overrides

If you want to override the autoscaler for a specific pool:

```bash
# Disable autoscaling on a pool and set PGs manually
ceph osd pool set mypool pg_autoscale_mode off
ceph osd pool set mypool pg_num 64
ceph osd pool set mypool pgp_num 64
```

## Memory Impact

Each PG uses approximately 10 MB of OSD memory. Calculate your OSD memory requirement:

```bash
# Formula: PGs per OSD * 10MB
# With 100 PGs/OSD target: ~1GB per OSD recommended

# Check current OSD memory usage
ceph config get osd osd_memory_target
```

## Summary

`mon_target_pg_per_osd` is the primary knob for guiding Ceph's PG autoscaler. A value of 100 is appropriate for most clusters. Increase it slightly for large, high-throughput deployments and decrease it for small clusters or OSDs with limited RAM. Always check `ceph osd pool autoscale-status` after changing this value to verify the autoscaler is recommending sensible PG counts.
