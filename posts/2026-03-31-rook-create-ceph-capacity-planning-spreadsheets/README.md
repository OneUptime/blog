# How to Create Ceph Capacity Planning Spreadsheets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity Planning, Storage, Kubernetes

Description: Learn how to build Ceph capacity planning spreadsheets by gathering raw metrics from your cluster and calculating usable capacity with replication and erasure coding overhead.

---

## Why Capacity Planning Matters

Ceph clusters have a hard ceiling: when total raw capacity fills up, writes fail and OSDs can become unavailable. Proactive capacity planning allows you to order hardware before hitting critical thresholds rather than reacting during an outage.

## Gather Current Capacity Metrics

Start by collecting raw numbers from your cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  echo '=== Cluster Summary ==='
  ceph df
  echo '=== Per-Pool Breakdown ==='
  ceph df detail
  echo '=== OSD Tree ==='
  ceph osd df tree
"
```

Key numbers to record:
- Total raw capacity (TiB)
- Used raw capacity (TiB)
- Available raw capacity (TiB)
- Per-pool used and available bytes

## Calculate Usable Capacity

For replicated pools, usable capacity is:

```text
Usable = Raw / Replication Factor
```

For a 3-replica pool across 100 TiB raw:

```text
Usable = 100 TiB / 3 = ~33.3 TiB
```

For erasure-coded pools (e.g., k=4, m=2):

```text
Usable = Raw * (k / (k + m)) = Raw * (4 / 6) = ~66.7%
```

## Build the Spreadsheet Template

Create a spreadsheet with the following columns:

```text
Pool Name | Type | Raw TiB | Replication | Usable TiB | Used TiB | Used % | Projected Full Date
```

Populate it with data from `ceph df detail`. For the "Projected Full Date" column, use a growth rate formula:

```text
Days to Full = (Usable TiB - Used TiB) / Daily Growth TiB
Projected Full Date = Today + Days to Full
```

## Automate Data Collection

Export `ceph df` output to CSV for import into a spreadsheet:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail --format json | \
  jq -r '.pools[] | [.name, .stats.bytes_used, .stats.max_avail] | @csv' \
  > ceph-capacity-$(date +%Y-%m-%d).csv
```

## Track Growth Over Time

Run this collection script daily via a CronJob and append to a time series:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph df --format json | \
  jq -r --arg d "$DATE" '[$d, .stats.total_bytes, .stats.total_used_raw_bytes] | @csv' \
  >> /data/ceph-growth.csv
```

Plot this CSV in a spreadsheet application to visualize growth trends and forecast when you will reach 80% (warning) and 85% (critical) utilization thresholds.

## Include OSD-Level Data

Per-OSD capacity helps identify unbalanced distributions:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df --format json | \
  jq -r '.nodes[] | [.name, .kb, .kb_used, .utilization] | @csv' \
  > osd-capacity-$(date +%Y-%m-%d).csv
```

Flag any OSD with utilization above 80% for remediation.

## Summary

Building Ceph capacity planning spreadsheets requires collecting raw capacity metrics from `ceph df` and `ceph osd df`, calculating usable capacity based on replication or erasure coding factors, and tracking daily growth to project when the cluster will reach critical thresholds. Automating data collection into a CSV time series enables trend analysis and early hardware procurement decisions.
