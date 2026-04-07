# How to View Performance Metrics in the Ceph Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Performance, Metric, Monitoring

Description: Navigate and interpret Ceph Dashboard performance metrics including OSD latency histograms, pool throughput, client I/O graphs, and PG recovery statistics.

---

## Overview

The Ceph Dashboard provides several performance metric views across different sections. This guide covers where to find key performance indicators and how to correlate dashboard metrics with CLI commands for deeper investigation.

## Main Dashboard Performance Widgets

The main Dashboard page shows:
- **Cluster Read/Write Throughput** - aggregate MB/s read and write over time
- **Client Read/Write IOPS** - operations per second across all pools
- **Recovery throughput** - data migration rate during rebalancing

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
# Navigate to: https://localhost:8443/#/dashboard
```

CLI equivalents for real-time stats:

```bash
# Real-time I/O stats
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph iostat 2

# Detailed cluster performance counters
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph perf dump
```

## OSD Performance Metrics

Navigate to Cluster > OSDs and click on an individual OSD for:
- **Latency histogram** - distribution of operation latencies
- **Read/write commit latency** - apply and commit timings
- **IOPS history** - per-OSD operations per second graph

CLI equivalent:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd perf
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph tell osd.0 perf dump | python3 -m json.tool
```

## Pool Performance Metrics

Navigate to Pools and click a pool name for:
- Read/write throughput graph
- Client IOPS graph
- Objects and PG count

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd pool stats
```

## Client I/O Breakdown

The Clients section (accessible from Dashboard > Clients) shows:
- Active client count
- Per-client read/write IOPS
- Slow operations list

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph tell mds.myfs-a perf dump | grep -i client
```

## Prometheus Integration for Historical Metrics

The Ceph MGR Prometheus module exports metrics for long-term storage:

```bash
# Verify Prometheus module is enabled
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph mgr module ls | grep prometheus

# Access metrics endpoint
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr 9283:9283
curl http://localhost:9283/metrics | grep -E "ceph_pool_(rd|wr)_bytes"
```

Key Prometheus metrics to graph:

```promql
# Pool write throughput (bytes/s)
rate(ceph_pool_wr_bytes[5m])

# OSD apply latency p99 (across all OSDs)
quantile(0.99, ceph_osd_apply_latency_ms)

# Client IOPS
rate(ceph_pool_rd[5m]) + rate(ceph_pool_wr[5m])
```

## Grafana Dashboard for Rich Visualizations

Import the Rook-Ceph Grafana dashboards:

```bash
kubectl -n rook-ceph port-forward svc/grafana 3000:3000
# Import dashboard ID 2842 - Ceph - OSD (Single)
# Import dashboard ID 5336 - Ceph - Pools
# Import dashboard ID 7845 - Ceph - Cluster
```

## Summary

Ceph Dashboard performance metrics span the main overview (aggregate throughput/IOPS), per-OSD latency histograms, and per-pool throughput graphs. For historical analysis and custom alerting, pair the Dashboard with Prometheus and Grafana using the MGR Prometheus module endpoint. CLI commands like `ceph iostat` and `ceph osd perf` provide real-time equivalents for quick checks.
