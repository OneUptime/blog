# How to Plan for Data Growth in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Growth, Capacity, Planning, Storage, Forecasting

Description: Develop a data growth plan for Ceph clusters by measuring historical growth rates, accounting for seasonal patterns, and creating an expansion roadmap with procurement lead times.

---

## Overview

Data growth planning ensures your Ceph cluster has capacity before it's needed. Without planning, you face emergency hardware purchases, rushed deployments, and potential data service interruptions. This guide covers building a systematic growth plan.

## Step 1 - Measure Historical Growth

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Check current usage
ceph df --format json | jq -r '.stats | {
  total_tb: (.total_bytes / 1099511627776),
  used_tb: (.total_used_raw_bytes / 1099511627776),
  avail_tb: (.total_avail_bytes / 1099511627776),
  used_pct: (.total_used_raw_ratio * 100)
}'
```

For historical data, use Prometheus:

```promql
# Growth over last 90 days
increase(ceph_cluster_total_used_bytes[90d])
```

## Step 2 - Segment Growth by Workload

Different workloads grow at different rates. Track per-pool:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph df detail --format json | jq -r '.pools[] | {
    name: .name,
    used_gb: (.stats.stored / 1073741824),
    used_pct: .stats.percent_used
  }'
```

Prometheus per-pool growth:

```promql
# Growth rate per pool over 7 days
rate(ceph_pool_stored[7d]) * 86400 * 7
```

## Step 3 - Build a Growth Forecast Model

```bash
#!/bin/bash
# Simple linear growth forecast
current_used_tb=150
monthly_growth_tb=15
months=12

echo "Month | Used (TB) | Free (TB) | Utilization"
echo "------|-----------|-----------|------------"

TOTAL=450  # total raw, 150 TB usable with 3x replication

for m in $(seq 1 $months); do
  USED=$(echo "$current_used_tb + ($monthly_growth_tb * $m)" | bc)
  RAW_USED=$(echo "$USED * 3" | bc)
  FREE=$(echo "$TOTAL - $RAW_USED" | bc)
  PCT=$(echo "scale=1; $RAW_USED / $TOTAL * 100" | bc)
  echo "Month $m | $USED TB | $(echo "scale=0; $FREE/3" | bc) TB | ${PCT}%"
done
```

## Step 4 - Account for Seasonal Patterns

Many workloads have seasonal spikes:

```bash
# Example: e-commerce with Q4 spike
declare -A MONTHLY_MULTIPLIERS
MONTHLY_MULTIPLIERS=(
  [1]=0.8  [2]=0.8  [3]=0.9
  [4]=1.0  [5]=1.0  [6]=0.9
  [7]=0.9  [8]=0.9  [9]=1.0
  [10]=1.1 [11]=1.5 [12]=1.8
)

BASE_MONTHLY_GROWTH=15  # TB

for month in $(seq 1 12); do
  MULT=${MONTHLY_MULTIPLIERS[$month]}
  GROWTH=$(echo "scale=1; $BASE_MONTHLY_GROWTH * $MULT" | bc)
  echo "Month $month: ${GROWTH} TB growth"
done
```

## Step 5 - Hardware Procurement Timeline

Plan purchases well before you need them:

```yaml
procurement_timeline:
  order_hardware: "90 days before needed"
  hardware_arrives: "30-45 days lead time"
  rack_and_cable: "1-2 weeks"
  os_install_configure: "1 week"
  add_to_cluster: "1-3 days (online)"
  rebalancing_complete: "1-2 weeks"

  total_lead_time: "120-150 days from order to available capacity"
```

## Step 6 - Trigger Points for Expansion

```bash
#!/bin/bash
# Determine expansion triggers
CURRENT_USABLE_TB=150
NEARFULL_THRESHOLD=0.75
FULL_THRESHOLD=0.85
EXPANSION_TRIGGER=0.65  # Start procurement at 65% to allow lead time

NEARFULL_AT=$(echo "scale=0; $CURRENT_USABLE_TB * $NEARFULL_THRESHOLD" | bc)
FULL_AT=$(echo "scale=0; $CURRENT_USABLE_TB * $FULL_THRESHOLD" | bc)
PROCURE_AT=$(echo "scale=0; $CURRENT_USABLE_TB * $EXPANSION_TRIGGER" | bc)

echo "Start procurement at: ${PROCURE_AT} TB used"
echo "Near-full warning at: ${NEARFULL_AT} TB used"
echo "Full/blocked at: ${FULL_AT} TB used"
```

## Step 7 - Capacity Roadmap Template

```yaml
capacity_roadmap:
  current_state:
    date: "2026-03-31"
    usable_tb: 150
    used_tb: 97  # 65%

  expansion_1:
    trigger: "when used exceeds 97 TB"
    estimated_date: "2026-06"
    add_nodes: 3
    add_usable_tb: 100
    new_total_tb: 250

  expansion_2:
    trigger: "when used exceeds 160 TB"
    estimated_date: "2026-10"
    add_nodes: 3
    add_usable_tb: 100
    new_total_tb: 350

  notes:
    - "Review forecast quarterly"
    - "Order hardware when trigger approaches"
    - "Allow 4-5 months procurement lead time"
```

## Summary

Data growth planning in Ceph requires measuring actual historical growth rates, segmenting by workload type, and accounting for seasonal variations. Building a growth roadmap with concrete trigger points tied to procurement lead times prevents emergency capacity situations. Review and update your growth model quarterly to account for new workloads, data deletion, and changing patterns.
