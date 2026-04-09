# How to Monitor Rebalancing Progress in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Rebalancing, Operation, Storage

Description: Monitor Ceph data rebalancing progress using ceph status, pg stat, progress module, and Prometheus metrics to track completion estimates and identify stuck operations.

---

## Understanding Ceph Rebalancing States

When Ceph rebalances data (after OSD addition, removal, or CRUSH changes), PGs transition through several states:

- **active+clean**: Normal state, fully replicated
- **active+remapped**: PG is being moved to new OSDs
- **active+backfilling**: Actively migrating data to new OSD location
- **active+backfill_wait**: Waiting for backfill resources
- **active+recovering**: Restoring degraded replicas

## Basic Progress Monitoring

The simplest way to check progress:

```bash
# Overall cluster status with rebalancing info
ceph status
ceph -s

# Detailed PG state breakdown
ceph pg stat

# Active progress tracker
ceph progress
ceph progress json 2>/dev/null | python3 -m json.tool
```

Sample `ceph status` output during rebalancing:

```text
cluster:
  id:     abc123
  health: HEALTH_WARN
          Degraded data redundancy: 1234/56789 objects degraded (2.17%)
          1 pg backfilling
          1 pg recovering

services:
  mon: 3 daemons, quorum mon0,mon1,mon2
  mgr: mgr0(active)
  osd: 12 osds: 12 up, 12 in

pgmap:
  16384 pgs: 16382 active+clean, 1 active+backfilling, 1 active+recovering
  1.28 TiB used, 10.72 TiB / 12.00 TiB avail
  1234/56789 objects degraded (2.17%)
  1.23 MiB/s, 0 B/s rd, 56.78 MiB/s wr
  13.56 MiB/s recovering, 156/s
```

## Detailed Rebalancing Metrics

Get per-OSD movement statistics:

```bash
# Show data movement per OSD
ceph osd df | sort -k7 -n

# Check misplaced vs degraded objects
ceph -s --format json | python3 -c "
import json, sys
status = json.load(sys.stdin)
pgmap = status.get('pgmap', {})
print(f\"Degraded objects: {pgmap.get('degraded_objects', 0)}\")
print(f\"Misplaced objects: {pgmap.get('misplaced_objects', 0)}\")
print(f\"Recovery rate: {pgmap.get('recovering_bytes_per_sec', 0) / 1e6:.1f} MB/s\")
"
```

## Estimating Time to Completion

Calculate ETA based on current recovery rate:

```bash
#!/bin/bash
# estimate-rebalance-eta.sh

STATUS=$(ceph -s --format json 2>/dev/null)

REMAINING_BYTES=$(echo "$STATUS" | python3 -c "
import json,sys
s = json.load(sys.stdin)
pg = s.get('pgmap', {})
misplaced = pg.get('misplaced_objects', 0)
degraded = pg.get('degraded_objects', 0)
total_objects = max(pg.get('num_objects', 1), 1)
data_bytes = pg.get('data_bytes', 0)
print(int((misplaced + degraded) / total_objects * data_bytes))
" 2>/dev/null || echo 0)

RATE_BPS=$(echo "$STATUS" | python3 -c "
import json,sys
s = json.load(sys.stdin)
pg = s.get('pgmap', {})
print(int(pg.get('recovering_bytes_per_sec', 0)))
" 2>/dev/null || echo 1)

if [ "$RATE_BPS" -gt 0 ] 2>/dev/null; then
  ETA_SECONDS=$((REMAINING_BYTES / RATE_BPS))
  REMAINING_GB=$((REMAINING_BYTES / 1073741824))
  RATE_MBS=$((RATE_BPS / 1048576))
  echo "Remaining: ${REMAINING_GB} GB"
  echo "Recovery rate: ${RATE_MBS} MB/s"
  echo "ETA: $(date -d "+${ETA_SECONDS} seconds" '+%H:%M on %b %d')"
else
  echo "No active recovery detected"
fi
```

## Watching PG State Changes

Monitor PG states as they transition during rebalancing:

```bash
# Watch PG state counts
watch -n 10 'ceph pg stat'

# Show PGs still in non-clean states
watch -n 30 'ceph pg ls remapped | wc -l; ceph pg ls backfilling | wc -l'

# Alert when rebalancing completes
while ! ceph -s | grep -q "HEALTH_OK"; do
  sleep 60
  echo -n "."
done
echo "Rebalancing complete!"
```

## Prometheus Metrics for Rebalancing

Enable the Prometheus mgr module and use these key metrics:

```bash
ceph mgr module enable prometheus
# Metrics endpoint: http://mgr-ip:9283/metrics
```

Key Prometheus metrics:

```promql
# Misplaced PGs
ceph_pg_remapped

# Recovery throughput
rate(ceph_osd_recovery_bytes[5m])

# Degraded objects
ceph_pg_degraded

# OSD fill levels during rebalancing
ceph_osd_stat_bytes_used / ceph_osd_stat_bytes
```

Sample Grafana alert rule:

```yaml
- alert: CephRebalancingStuck
  expr: ceph_pg_remapped > 0 and rate(ceph_osd_recovery_bytes[30m]) == 0
  for: 60m
  labels:
    severity: warning
  annotations:
    summary: "Ceph rebalancing appears stuck"
    description: "{{ $value }} PGs are remapped but no recovery traffic in 30m"
```

## Summary

Ceph rebalancing progress is best monitored through `ceph status` for real-time overview, `ceph progress` for structured ETA estimates, and Prometheus metrics for dashboards and alerting. Calculating ETA by dividing remaining bytes by recovery rate gives an accurate completion estimate. Prometheus alerts detecting stalled recovery (remapped PGs with zero recovery rate) automatically flag stuck rebalancing that requires operator investigation.
