# How to Create Custom Grafana Dashboards for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Dashboard, Monitoring, Prometheus, Kubernetes, Custom

Description: Build custom Grafana dashboards for Rook-Ceph using PromQL queries, template variables, and visualization panels tailored to your specific monitoring needs.

---

## Overview

While community dashboards (2842, 5336, 5342) cover standard use cases, custom Grafana dashboards let you create views tailored to your team's workflows, SLAs, and specific cluster topology. This guide walks through building a custom Ceph dashboard from scratch.

## Planning Your Dashboard

Before building, define the dashboard's purpose:
- Who will use it? (operators, on-call, management)
- What decisions will it support?
- What time range is most useful?

A good operational dashboard has three sections:
1. Status overview (health and availability)
2. Capacity and usage
3. Performance (latency, throughput, IOPS)

## Step 1: Create a New Dashboard

In Grafana:
1. Click + (Create) - Dashboard
2. Click Add visualization
3. Select your Prometheus data source

Or provision via ConfigMap for GitOps:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ceph-custom-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  ceph-custom.json: |
    {
      "title": "Ceph Operations",
      "uid": "ceph-ops-custom",
      ...
    }
```

## Step 2: Add Template Variables

Make the dashboard reusable with variables:

```json
{
  "templating": {
    "list": [
      {
        "name": "cluster",
        "type": "query",
        "query": "label_values(ceph_health_status, cluster)",
        "label": "Cluster"
      },
      {
        "name": "pool",
        "type": "query",
        "query": "label_values(ceph_pool_metadata, name)",
        "label": "Pool",
        "multi": true,
        "includeAll": true
      }
    ]
  }
}
```

## Step 3: Build Core Health Panels

Cluster status panel (Stat type):

```promql
# Health Status
ceph_health_status

# Map values: 0=OK(green), 1=WARN(yellow), 2=ERROR(red)
```

OSD availability panel:

```promql
# OSD Availability %
sum(ceph_osd_up) / count(ceph_osd_up) * 100
```

## Step 4: Create a Capacity Row

Add a row "Capacity" and include:

```promql
# Cluster used %
(ceph_cluster_total_used_bytes / ceph_cluster_total_bytes) * 100

# Per pool usage (filtered by $pool variable via label join)
(ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail))
  * on(pool_id) group_left(name) ceph_pool_metadata{name=~"$pool"} * 100
```

Use a Time series panel with threshold lines at 75% and 85%.

## Step 5: Add Performance Panels

```promql
# Client Write IOPS
sum(rate(ceph_osd_op_w[5m]))

# Client Read IOPS
sum(rate(ceph_osd_op_r[5m]))

# Average OSD Apply Latency (ms)
avg(ceph_osd_apply_latency_ms)
```

Panel settings for latency (metric is already in milliseconds):
- Unit: milliseconds (ms)
- Thresholds: 0-20 green, 20-100 yellow, 100+ red

## Step 6: Add an Annotation for Ceph Events

Track Ceph health state changes on the time series:

```javascript
// Annotations query
metric: changes(ceph_health_status[1m]) > 0
display: "Health Changed"
```

## Step 7: Configure Dashboard Settings

Set sensible defaults:

```json
{
  "time": {"from": "now-3h", "to": "now"},
  "refresh": "30s",
  "timezone": "browser",
  "graphTooltip": 1
}
```

## Exporting for Version Control

```bash
# Export dashboard JSON
curl -s http://admin:admin@localhost:3000/api/dashboards/uid/ceph-ops-custom \
  | jq '.dashboard | del(.id, .version)' \
  > ceph-custom-dashboard.json

# Commit to git
git add ceph-custom-dashboard.json
git commit -m "Add custom Ceph operations dashboard"
```

## Provisioning in Kubernetes

Store dashboard JSON in a ConfigMap and use Grafana's provisioning:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-ceph-dashboards
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  ceph-custom.json: |-
    # paste dashboard JSON here
```

## Summary

Custom Grafana dashboards for Ceph should include template variables for cluster and pool selection, a health status row with stat panels, a capacity row with threshold-colored time series, and a performance row with IOPS and latency panels. Export and version control dashboard JSON to maintain consistency across environments and enable GitOps-based dashboard provisioning.
