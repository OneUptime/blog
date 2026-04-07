# How to Use Telemetry Data for Capacity Planning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Telemetry, Capacity Planning, Storage

Description: Learn how to use local Ceph telemetry data and cluster metrics for capacity planning, forecasting storage growth, and identifying expansion thresholds.

---

## Telemetry Data for Local Planning

While Ceph telemetry is primarily designed to share data with the community, the data it collects locally provides a rich snapshot of cluster state useful for internal capacity planning. You can access this data without opting in to external sharing.

Enable the telemetry module (no opt-in required for local access):

```bash
ceph mgr module enable telemetry
```

## Extracting Cluster Capacity Data

View current cluster usage and capacity:

```bash
ceph df
ceph df detail
```

Get a structured JSON snapshot:

```bash
ceph df --format json | python3 -c "
import sys, json
d = json.load(sys.stdin)
stats = d.get('stats', {})
total = stats.get('total_bytes', 0)
used = stats.get('total_used_raw_bytes', 0)
avail = stats.get('total_avail_bytes', 0)
pct = (used / total * 100) if total > 0 else 0
print(f'Total: {total/1024**4:.2f} TiB')
print(f'Used: {used/1024**4:.2f} TiB ({pct:.1f}%)')
print(f'Available: {avail/1024**4:.2f} TiB')
"
```

## Per-Pool Capacity Analysis

Analyze capacity at the pool level:

```bash
ceph df detail --format json | python3 -c "
import sys, json
d = json.load(sys.stdin)
for pool in d.get('pools', []):
    name = pool.get('name')
    used = pool.get('stats', {}).get('stored', 0)
    max_avail = pool.get('stats', {}).get('max_avail', 0)
    print(f'{name}: {used/1024**3:.1f} GiB used, {max_avail/1024**3:.1f} GiB available')
"
```

## OSD-Level Capacity Distribution

Identify uneven capacity distribution:

```bash
ceph osd df tree
ceph osd df --format json | python3 -c "
import sys, json
d = json.load(sys.stdin)
nodes = d.get('nodes', [])
for n in sorted(nodes, key=lambda x: x.get('utilization', 0), reverse=True)[:10]:
    print(f'OSD {n[\"id\"]}: {n.get(\"utilization\", 0):.1f}% full ({n.get(\"kb_used\", 0)/1024/1024:.1f} GiB)')
"
```

## Growth Rate Calculation

Track cluster growth by comparing snapshots over time. Store periodic snapshots:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
ceph df --format json > /var/log/ceph/capacity-${DATE}.json
echo "Saved capacity snapshot for $DATE"
```

Compare two snapshots to calculate growth rate:

```bash
python3 -c "
import json

with open('/var/log/ceph/capacity-2026-03-01.json') as f:
    old = json.load(f)
with open('/var/log/ceph/capacity-2026-03-31.json') as f:
    new = json.load(f)

old_used = old['stats']['total_used_raw_bytes']
new_used = new['stats']['total_used_raw_bytes']
growth_gb = (new_used - old_used) / 1024**3
days = 30
print(f'Growth: {growth_gb:.1f} GiB in {days} days')
print(f'Monthly growth rate: {growth_gb:.1f} GiB/month')
print(f'Days until 80% full: TBD based on remaining capacity')
"
```

## Forecasting Capacity Exhaustion

Estimate when the cluster will reach critical thresholds:

```bash
python3 -c "
total_tb = 180.0
used_tb = 90.0
growth_tb_per_month = 8.0
threshold = 0.80

remaining_until_threshold = (total_tb * threshold) - used_tb
months_to_threshold = remaining_until_threshold / growth_tb_per_month
print(f'Months until {int(threshold*100)}% full: {months_to_threshold:.1f}')
"
```

## Automating Capacity Reports with Prometheus

Use Prometheus queries for ongoing capacity tracking:

```text
# Current utilization percentage
(ceph_cluster_total_used_bytes / ceph_cluster_total_bytes) * 100

# Predicted utilization ratio in 30 days (linear projection)
predict_linear(ceph_cluster_total_used_bytes[7d], 30 * 24 * 3600) / ceph_cluster_total_bytes

# Days until full (linear projection)
(ceph_cluster_total_bytes - ceph_cluster_total_used_bytes) / deriv(ceph_cluster_total_used_bytes[7d]) / 86400
```

## Summary

Ceph telemetry data combined with cluster metrics provides a foundation for capacity planning. By capturing periodic snapshots of `ceph df` output and calculating growth rates, you can forecast when expansion is needed. Prometheus metrics enable continuous monitoring and alerting before critical thresholds are reached. In Rook environments, the toolbox pod and Prometheus operator integration provide all the tools needed for data-driven capacity management.
