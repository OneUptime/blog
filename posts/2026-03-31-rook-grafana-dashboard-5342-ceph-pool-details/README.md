# How to Set Up Grafana Dashboard 5342 for Ceph Pool Details

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Dashboard, Pool, Monitoring, Prometheus

Description: Import and configure Grafana dashboard 5342 to monitor Ceph pool-level metrics including usage, IOPS, throughput, and PG states for Rook-Ceph deployments.

---

## Overview

Grafana dashboard 5342 (Ceph - Pools) provides detailed metrics at the storage pool level. This dashboard is essential for multi-tenant environments where different applications use different pools, allowing you to track per-pool consumption, performance, and health independently.

## Prerequisites

Verify pool metrics are available in Prometheus:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  curl -s http://rook-ceph-mgr.rook-ceph.svc.cluster.local:9283/metrics | \
  grep "ceph_pool_" | sort -u | head -20
```

Check available pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool ls detail
```

## Step 1: Import Dashboard 5342

In Grafana:
1. Navigate to Dashboards - Import
2. Enter ID `5342` and click Load
3. Select your Prometheus data source
4. Click Import

Via curl:

```bash
curl -s https://grafana.com/api/dashboards/5342/revisions/latest/download \
  -o dashboard-5342.json

curl -X POST \
  -H "Content-Type: application/json" \
  -d "{\"dashboard\": $(cat dashboard-5342.json), \"overwrite\": true}" \
  http://admin:admin@localhost:3000/api/dashboards/import
```

## Step 2: Pool Selection Variable

The dashboard uses a pool variable populated from:

```promql
label_values(ceph_pool_metadata, name)
```

This creates a dropdown listing all Ceph pools. You can switch between pools using this variable to view pool-specific metrics.

## Key Panels in Dashboard 5342

```text
Row 1: Pool Name | Pool ID | PG Count | Object Count | Used Bytes
Row 2: Pool Utilization % | Available Space
Row 3: Client IOPS (Read/Write) | Client Throughput (Read/Write)
Row 4: Recovery IOPS | Recovery Throughput
Row 5: PG States Distribution
```

## Adding Pool Quota Visualization

Extend the dashboard with quota tracking:

```promql
# Pool quota utilization
ceph_pool_bytes_used /
  ceph_pool_quota_max_bytes * 100
```

Create a gauge panel:
- Panel type: Gauge
- Query: above expression filtered by pool name variable
- Thresholds: 0-75 green, 75-90 yellow, 90+ red

## Step 3: Create a Multi-Pool Comparison

Add an overlay panel comparing all pools:

```promql
# All pool utilization %
(ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail)) * 100
* on(pool_id) group_left(name) ceph_pool_metadata
```

Panel type: Bar chart, sorted by utilization descending.

## Monitoring PG States Per Pool

Track PG health per pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg ls-by-pool replicapool | head -20
```

In Prometheus:

```promql
# PGs per pool that are not clean
ceph_pg_total - ceph_pg_clean
```

## Setting Up Pool-Level Alerts

Create a PrometheusRule linked to the dashboard:

```yaml
- alert: CephPoolHighUsage
  expr: |
    (ceph_pool_bytes_used /
     (ceph_pool_bytes_used + ceph_pool_max_avail))
    * on(pool_id) group_left(name) ceph_pool_metadata > 0.80
  labels:
    severity: warning
  annotations:
    dashboard: "Grafana dashboard 5342"
    summary: "Pool {{ $labels.name }} is over 80% full"
```

## Sharing the Dashboard

Export the customized dashboard for team sharing:

1. Open dashboard settings (gear icon)
2. Click JSON Model
3. Copy and save to version control

Or export via API:

```bash
curl -s http://admin:admin@localhost:3000/api/dashboards/db/ceph-pools \
  | jq '.dashboard' > ceph-pools-dashboard.json
```

## Summary

Grafana dashboard 5342 provides essential per-pool visibility for Rook-Ceph environments with multiple storage pools serving different workloads. Import by ID 5342, use the pool selection dropdown for individual pool analysis, extend with quota panels for governance, and create comparison views across all pools for capacity management.
