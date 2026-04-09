# How to Monitor MDS Performance Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, CephFS, Monitoring, Prometheus, Kubernetes

Description: Learn how to monitor CephFS MDS performance metrics including cache hit rates, latency, and operation throughput using Prometheus and built-in Ceph tools.

---

## Key MDS Performance Indicators

The MDS handles all metadata operations for CephFS. Key metrics to monitor include:
- Metadata operation latency (lookup, create, rename, unlink)
- Cache hit rate (high hit rates mean fewer disk reads)
- Journal write throughput
- Active client count
- Subtree distribution (for multi-MDS setups)

## Using Ceph Built-in Commands

Check current MDS performance at a glance:

```bash
# Overall filesystem status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs

# MDS daemon status (active/standby)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mds stat
```

Get detailed per-operation counters from the MDS daemon directly:

```bash
# Get MDS daemon name
MDS_NAME=$(kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs | grep "up:active" | awk '{print $1}')

# Dump all performance counters
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.$MDS_NAME perf dump
```

## Cache Performance Metrics

Check cache counters and current usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a perf dump mds_mem
```

Key fields to watch:
- `ino` - number of inodes in cache
- `cap` - number of capabilities in cache
- `dn` - number of dentries in cache
- `rss` - resident memory usage of the MDS daemon

## Prometheus Metrics for MDS

The Ceph MGR exports MDS metrics via Prometheus. Enable monitoring in the CephCluster:

```yaml
spec:
  monitoring:
    enabled: true
```

Key MDS Prometheus metrics:

| Metric | Description |
|---|---|
| `ceph_mds_server_handle_client_request` | client requests/sec |
| `ceph_mds_server_handle_peer_request` | peer (replicated) requests/sec |
| `ceph_mds_mem_ino` | inodes in MDS cache |
| `ceph_mds_mem_cap` | capabilities in cache |
| `ceph_mds_mem_dn` | dentries in MDS cache |

## Sample Prometheus Queries

Track average metadata lookup latency:

```promql
rate(ceph_mds_server_req_lookup_latency_sum[5m]) / rate(ceph_mds_server_req_lookup_latency_count[5m])
```

Monitor client request rate:

```promql
rate(ceph_mds_server_handle_client_request[1m])
```

Alert on high metadata latency:

```yaml
- alert: CephMDSHighLatency
  expr: |
    (rate(ceph_mds_server_req_lookup_latency_sum[5m]) / rate(ceph_mds_server_req_lookup_latency_count[5m])) > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "MDS lookup latency exceeds 100ms"
```

## Monitoring via the Ceph Dashboard

The Ceph dashboard provides MDS performance graphs under the "Filesystems" section. Access the dashboard and navigate to your filesystem to see real-time charts for:
- Client I/O rates
- Metadata operation counts
- MDS CPU and memory usage

## Identifying Performance Bottlenecks

```bash
# Check which operations are most frequent
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a perf dump | python3 -c \
  "import json,sys; d=json.load(sys.stdin); [print(k,v) for k,v in d.get('mds_server',{}).items() if 'latency' in k.lower()]"
```

## Summary

Monitoring MDS performance requires tracking both operational metrics (request rates and latency per operation type) and resource metrics (cache usage and CPU/memory consumption). Use Ceph's built-in `ceph daemon perf dump` for immediate diagnostics, Prometheus metrics for trend analysis, and set up alerts for latency thresholds to catch degradation before it impacts users. Cache hit rate is the most important single indicator of MDS health.
