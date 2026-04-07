# How to Speed Up Ceph Rebalancing Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Rebalancing, Performance, Operation, Storage

Description: Accelerate Ceph data rebalancing after adding or removing OSDs by tuning backfill concurrency, recovery bandwidth, and CRUSH weight adjustments for controlled migration.

---

## When Rebalancing Occurs

Ceph rebalances data when:
- New OSDs are added to expand capacity
- OSDs are removed or replaced
- CRUSH map is modified to change failure domains
- OSD weights are changed

During rebalancing, Ceph moves PGs (and their data) between OSDs to achieve the target distribution. This can take hours or days depending on cluster size and configuration.

## Assessing Current Rebalancing Status

```bash
# Check overall rebalancing progress
ceph status
ceph -s | grep -E "misplaced|moving|rebalancing"

# Detailed PG state breakdown
ceph pg stat
ceph pg dump_stuck | head -30

# Estimate time to completion
ceph progress
ceph progress json | python3 -m json.tool | grep -E "progress|time"
```

## Incremental Weight Changes with CRUSH

Instead of adding an OSD at full weight (causing immediate large rebalance), increase weight gradually:

```bash
# Add OSD at 0 weight first
ceph osd crush add osd.12 0 root=default host=node3

# Gradually increase weight to distribute load slowly
for weight in 0.2 0.4 0.6 0.8 1.0; do
  ceph osd crush reweight osd.12 $weight
  echo "Weight set to $weight - waiting for rebalance to settle..."
  sleep 300
  ceph -s | grep misplaced
done
```

## Tuning Backfill for Faster Rebalancing

Increase backfill concurrency during a maintenance window:

```bash
# Aggressive rebalancing (maintenance window)
ceph config set osd osd_max_backfills 4
ceph config set osd osd_recovery_max_active_hdd 8
ceph config set osd osd_recovery_max_active_ssd 20
ceph config set osd osd_recovery_sleep_hdd 0
ceph config set osd osd_recovery_sleep_ssd 0
ceph config set osd osd_backfill_scan_max 512

# Verify rebalancing is proceeding faster
watch -n 30 'ceph progress; ceph -s | grep -E "misplaced|rebalancing"'
```

Restore normal settings after completion:

```bash
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_max_active_hdd 3
ceph config set osd osd_recovery_max_active_ssd 10
ceph config set osd osd_recovery_sleep_hdd 0.1
ceph config set osd osd_recovery_sleep_ssd 0
ceph config set osd osd_backfill_scan_max 512
```

## Using upmap for Precise Rebalancing

The `upmap` feature allows fine-grained control over PG placement:

```bash
# Enable upmap balancer
ceph mgr module enable balancer
ceph balancer on
ceph balancer mode upmap

# Check current balance score (lower is more balanced)
ceph balancer status

# Run optimization step
ceph balancer optimize my-plan
ceph balancer show my-plan
ceph balancer execute my-plan
```

## Pausing and Resuming Rebalancing

Temporarily halt rebalancing during peak hours:

```bash
# Pause all rebalancing
ceph osd set noout
ceph osd set norebalance
ceph osd set norecover
ceph osd set nobackfill

# Check that flags are set
ceph osd dump | grep flags

# Resume rebalancing
ceph osd unset noout
ceph osd unset norebalance
ceph osd unset norecover
ceph osd unset nobackfill
```

## Monitoring Rebalancing with Prometheus

If Prometheus is enabled, monitor rebalancing via metrics:

```bash
# Enable Prometheus module
ceph mgr module enable prometheus

# Key metrics to watch
# ceph_pg_remapped - PGs being moved
# ceph_osd_backfill_toofull - OSDs too full for backfill
# ceph_pg_active - Active PGs (rebalancing reduces this temporarily)
```

Sample Prometheus query to calculate rebalancing ETA:

```promql
# Remaining misplaced bytes / recovery bytes/sec = seconds remaining
ceph_cluster_total_bytes_misplaced
  / on() ceph_osd_recovery_bytes > 0
```

## Estimating Rebalancing Time

```bash
# Current misplaced data
MISPLACED_GB=$(ceph -s --format json | python3 -c "
import json,sys
s = json.load(sys.stdin)
pg = s.get('pgmap', {})
print(round(pg.get('misplaced_bytes', 0) / 1e9, 1))
")

# Current recovery rate (MB/s) from ceph status
RATE_MBS=$(ceph -s --format json | python3 -c "
import json,sys
s = json.load(sys.stdin)
pg = s.get('pgmap', {})
# recovering_bytes_per_sec is reported in pgmap during active recovery
print(round(pg.get('recovering_bytes_per_sec', 0) / 1e6, 1))
")

echo "Misplaced: ${MISPLACED_GB} GB at ${RATE_MBS} MB/s"
```

## Summary

Ceph rebalancing speed is controlled by `osd_max_backfills` and `osd_recovery_max_active`. Gradual CRUSH weight increases minimize the initial rebalancing burst when adding OSDs. The `upmap` balancer provides precise PG-level control for perfectly even distributions. Use `noout` and `norebalance` flags to pause rebalancing during peak hours and resume during maintenance windows for minimal production impact.
