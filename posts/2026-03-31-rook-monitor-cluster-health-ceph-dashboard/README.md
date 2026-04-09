# How to Monitor Cluster Health from the Ceph Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Health, Monitoring

Description: Use the Ceph Dashboard to monitor real-time cluster health, track HEALTH_WARN conditions, and interpret capacity, IOPS, and throughput metrics.

---

## Overview

The Ceph Dashboard main page provides a real-time health overview of your cluster. Understanding how to interpret the health indicators, warning messages, and performance graphs helps you proactively identify and resolve issues.

## Accessing the Health Overview

The Dashboard main page shows:
- Overall cluster status badge (HEALTH_OK in green, HEALTH_WARN in yellow, HEALTH_ERR in red)
- Count of OSDs (up/down), MONs, MGRs
- Total capacity, used capacity, and available capacity
- Read/write throughput graphs (last 5 minutes)
- IOPS graphs

Access it:

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
# Navigate to: https://localhost:8443/#/dashboard
```

## Interpreting Health Warnings

When health shows HEALTH_WARN, the dashboard lists the specific conditions. Common warnings and CLI equivalents:

```bash
# Get full health detail (equivalent to dashboard warnings list)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph health detail

# Check specific warning sources
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status
```

Dashboard warning icons and their meanings:

| Warning | Meaning | Action |
|---|---|---|
| OSD_NEARFULL | OSD approaching full ratio | Add OSDs or expand |
| POOL_NO_REDUNDANCY | Pool has size=1 | Increase replica count |
| AUTH_INSECURE_GLOBAL_ID_RECLAIM | Security config needed | Set auth_allow_insecure_global_id_reclaim |
| SLOW_OPS | OSD operations taking >30s | Check OSD performance |

## Reading the Capacity Widget

The capacity donut chart shows:
- Total raw capacity
- Used (includes replication overhead)
- Available for new data

Calculate usable capacity:

```bash
# Get accurate usable capacity
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph df

# Per-pool usage
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph df detail
```

## Monitoring PG Status

The dashboard shows PG state counts. Ideal state is all PGs in `active+clean`:

```bash
# PG states from CLI to correlate with dashboard
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph pg stat
```

Key PG states to watch in the dashboard:
- `degraded` - missing replicas, recovery in progress
- `undersized` - fewer replicas than pool target
- `stale` - PG has no active OSD, critical
- `remapped` - PG is moving between OSDs

## Setting Up Dashboard Alerts

The dashboard integrates with Prometheus Alertmanager. Configure alert routing:

```yaml
# In your Alertmanager config
route:
  receiver: 'ceph-team'
  routes:
    - match:
        alertname: CephHealthError
      receiver: 'ceph-pagerduty'
    - match:
        alertname: CephOSDNearFull
      receiver: 'ceph-slack'
```

## Create a Custom Dashboard View

Use the Grafana integration for custom health dashboards:

```bash
# Port-forward Grafana if deployed with Rook monitoring stack
kubectl -n rook-ceph port-forward svc/grafana 3000:3000

# Import Ceph Cluster dashboard (ID: 2842) from grafana.com
```

## Summary

The Ceph Dashboard health overview provides real-time cluster status including OSD counts, capacity utilization, I/O performance, and health warning details. Reading HEALTH_WARN conditions, monitoring PG states, and tracking capacity trends enables proactive cluster management. Pairing the dashboard with Prometheus alerts ensures you are notified of degraded conditions before they impact workloads.
