# How to Prioritize Recovery of Specific Pools in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Pool, Operation, Storage

Description: Learn how to prioritize Ceph recovery for specific pools by adjusting recovery priority weights, using pool-level flags, and directing recovery resources to critical data first.

---

## Why Prioritize Pool Recovery?

When multiple pools are degraded simultaneously, Ceph recovers them in parallel by default. For organizations with tiered data importance - production databases vs. backup archives - it makes sense to recover critical pools first and delay less important ones until capacity allows.

## Understanding Recovery Priority

Ceph does not have a direct "pool priority" recovery setting, but you can achieve prioritization through indirect mechanisms:

1. Pausing recovery on low-priority pools using `norecover` flags
2. Using CRUSH rules to direct critical pools to fast-recovery OSDs
3. Adjusting OSD weights to influence where recovery work concentrates
4. Using the `ceph tell` interface to adjust per-OSD recovery parameters

## Controlling Recovery for Specific Pools

Free resources for critical pools by reducing I/O load from non-critical pools:

```bash
# List all pools
ceph osd pool ls

# Disable deep scrubbing on non-critical pools to free I/O resources
ceph osd pool set backup-pool nodeep-scrub 1

# Remove any forced recovery priority from low-priority pool PGs
POOL_ID=$(ceph osd dump | grep "pool.*backup-pool" | awk '{print $2}')
ceph pg ls $POOL_ID | awk '{print $1}' | while read pg; do
  ceph pg cancel-force-recovery $pg
done
```

Force recovery for critical pool PGs:

```bash
# Force all PGs in a critical pool to recover first
CRITICAL_POOL_ID=$(ceph osd dump | grep "pool.*prod-db" | awk '{print $2}')
ceph pg ls-by-pool prod-db | awk 'NR>1 {print $1}' | while read pg; do
  ceph pg force-recovery $pg
done
```

## Directing Recovery to Specific OSDs

Use separate CRUSH rules per pool to isolate recovery on different OSD sets:

```bash
# Create separate CRUSH rules for different pools
ceph osd crush rule create-replicated fast-nvme-rule default host nvme
ceph osd crush rule create-replicated slow-hdd-rule default host hdd

# Assign fast OSDs to critical pools
ceph osd pool set prod-db crush_rule fast-nvme-rule

# Assign slow OSDs to archive pools
ceph osd pool set archive crush_rule slow-hdd-rule
```

This ensures critical pool recovery happens only on NVMe OSDs while archive pool recovery runs separately on HDDs without competing.

## Using OSD Recovery Priority

Set OSD-level recovery priority through config:

```bash
# Increase recovery priority on OSDs serving critical pools
# This is done per-OSD through individual OSD config
ceph config set osd.0 osd_recovery_max_active_ssd 20
ceph config set osd.0 osd_recovery_sleep_ssd 0

# Reduce recovery resources on OSDs serving low-priority pools
ceph config set osd.10 osd_recovery_max_active_hdd 1
ceph config set osd.10 osd_recovery_sleep_hdd 0.5
```

## Monitoring Per-Pool Recovery Progress

Track which pools are recovering and their progress:

```bash
# Show degraded objects per pool
ceph pg dump | awk 'NR>1 && $1~/^[0-9]/ {split($1,a,"."); print a[1], $21}' | \
    sort -k1,1n | awk '{pool[$1]+=$2} END {for(p in pool) print p, pool[p]}' | \
    sort -k1,1n | while read id count; do
      name=$(ceph osd dump | awk "/pool $id / {print \$3}" | tr -d "'")
      echo "Pool $id ($name): $count degraded objects"
    done
```

## Creating a Recovery Priority Script

```bash
#!/bin/bash
# Prioritize recovery of specified pool

TARGET_POOL=${1:-"prod-db"}
PAUSE_POOL=${2:-"backup-pool"}

echo "Prioritizing recovery for pool: $TARGET_POOL"
echo "Pausing recovery for pool: $PAUSE_POOL"

# Force recovery for all degraded PGs in target pool
ceph pg ls-by-pool $TARGET_POOL degraded 2>/dev/null | \
    awk 'NR>1 {print $1}' | while read pg; do
  ceph pg force-recovery $pg 2>/dev/null
  echo "Forced recovery: $pg"
done

# Cancel forced recovery for low-priority pool
ceph pg ls-by-pool $PAUSE_POOL degraded 2>/dev/null | \
    awk 'NR>1 {print $1}' | while read pg; do
  ceph pg cancel-force-recovery $pg 2>/dev/null
done

echo "Recovery prioritization applied."
ceph -s | grep -E "recovery|degraded"
```

## Summary

Ceph pool-level recovery prioritization uses a combination of `force-recovery` for critical PGs, separate CRUSH rules that isolate critical and non-critical pools to different OSD groups, and per-OSD recovery parameter tuning. By directing critical pools to fast NVMe OSDs and pausing or slowing recovery on archive pools, operators can ensure production databases recover first while less critical data follows at whatever pace available resources allow.
