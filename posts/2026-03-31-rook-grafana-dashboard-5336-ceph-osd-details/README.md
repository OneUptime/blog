# How to Set Up Grafana Dashboard 5336 for Ceph OSD Details

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Dashboard, OSD, Monitoring, Prometheus

Description: Import and configure Grafana dashboard 5336 to monitor per-OSD performance metrics including latency, throughput, and device utilization in Rook-Ceph clusters.

---

## Overview

Grafana dashboard 5336 (Ceph - OSD) provides detailed per-OSD performance metrics. Unlike the cluster overview dashboard (2842), this dashboard drills into individual OSD performance, helping identify specific disks that are slow, overloaded, or failing.

## Prerequisites

Ensure Ceph Prometheus metrics include OSD-level metrics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  curl -s http://rook-ceph-mgr.rook-ceph.svc.cluster.local:9283/metrics | \
  grep "ceph_osd_op_" | head -10
```

Verify OSD metadata is exposed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  curl -s http://rook-ceph-mgr.rook-ceph.svc.cluster.local:9283/metrics | \
  grep "ceph_osd_metadata" | head -5
```

## Step 1: Import Dashboard 5336

Via Grafana UI:
1. Go to Dashboards - Import
2. Enter ID `5336`
3. Select Prometheus data source
4. Click Import

Via API:

```bash
GRAFANA_URL="http://admin:admin@localhost:3000"

DASHBOARD_JSON=$(curl -s "https://grafana.com/api/dashboards/5336/revisions/latest/download")

curl -X POST \
  -H "Content-Type: application/json" \
  -d "{\"dashboard\": ${DASHBOARD_JSON}, \"overwrite\": true, \"inputs\": [], \"folderId\": 0}" \
  "${GRAFANA_URL}/api/dashboards/import"
```

## Step 2: Configure OSD Selection Variable

Dashboard 5336 includes a variable to select specific OSDs. The variable uses:

```promql
label_values(ceph_osd_up, ceph_daemon)
```

This populates a dropdown with all OSD daemon names (e.g., `osd.0`, `osd.1`).

## Key Panels in Dashboard 5336

Panel overview:

```text
Row 1: OSD Status | Capacity Used | Apply Latency | Commit Latency
Row 2: IOPS Over Time | Throughput Over Time
Row 3: Op Queue Depth | Journal Write Ops
Row 4: OSD Scrub Activity | Recovery Operations
```

## Customizing OSD Device Class View

Add a device class filter variable:

```javascript
// Variable: device_class
// Query: label_values(ceph_osd_metadata, device_class)
// Multi-value: true

// Panel filter modification
ceph_osd_apply_latency_ms * on(ceph_daemon) group_left(device_class)
  ceph_osd_metadata{device_class=~"$device_class"}
```

## Step 3: Add OSD Tree Topology Panel

Extend the dashboard with a topology view:

```javascript
// Table panel showing OSD tree
Query:
  topk(100, ceph_osd_apply_latency_ms) * on(ceph_daemon)
  group_left(hostname, device_class) ceph_osd_metadata

Columns:
  - ceph_daemon: "OSD"
  - hostname: "Host"
  - device_class: "Class"
  - Value: "Apply Latency (ms)"
```

## Identifying Performance Outliers

Use the dashboard to spot slow OSDs:

```promql
# Find OSDs with latency 2x above average
ceph_osd_commit_latency_ms >
  2 * avg(ceph_osd_commit_latency_ms)
```

Add this as a new panel with threshold coloring.

## Setting Dashboard Refresh

For live monitoring during incidents:

1. Open the dashboard
2. Click the refresh interval dropdown (top right)
3. Set to `30s` or `1m`
4. Save dashboard settings

## OSD IOPS Breakdown

Track read vs write IOPS per OSD:

```promql
# Read IOPS
rate(ceph_osd_op_r[5m])

# Write IOPS
rate(ceph_osd_op_w[5m])
```

## Summary

Grafana dashboard 5336 provides per-OSD visibility into Ceph performance that the cluster overview dashboard cannot offer. Import it by ID, use the OSD dropdown to investigate specific disks, add device class filtering for tiered storage environments, and create custom outlier detection panels to quickly identify slow or failing OSDs.
