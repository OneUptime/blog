# How to Track Ceph CPU Usage Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, CPU, Performance, Kubernetes

Description: Learn how to track CPU usage patterns across Ceph daemons to identify CPU-bound bottlenecks, size resources correctly, and optimize Ceph performance for your workloads.

---

## CPU Consumers in a Ceph Cluster

Different Ceph daemons use CPU in distinct ways:

- **OSDs**: CPU for checksumming, compression, erasure coding, and BlueStore operations
- **MONs**: CPU for map updates and Paxos consensus
- **MGR**: CPU for Prometheus metrics collection, dashboard rendering, and module execution
- **MDS**: CPU for metadata operations on CephFS
- **RGW**: CPU for HTTP request handling, S3/Swift API parsing, and encryption

## Monitor CPU via kubectl top

Get a quick view of CPU usage per pod:

```bash
# All rook-ceph pods sorted by CPU
kubectl -n rook-ceph top pods --sort-by=cpu

# OSD pods
kubectl -n rook-ceph top pods -l app=rook-ceph-osd

# MGR pods
kubectl -n rook-ceph top pods -l app=rook-ceph-mgr
```

## Prometheus CPU Metrics for Ceph

Use container-level CPU metrics from cAdvisor (built into the kubelet and scraped by Prometheus):

```bash
# CPU usage rate per rook-ceph container (cores)
rate(container_cpu_usage_seconds_total{namespace="rook-ceph"}[5m])

# Top 5 containers by CPU
topk(5, rate(container_cpu_usage_seconds_total{namespace="rook-ceph"}[5m]))

# CPU throttle ratio (indicates limits are too low)
rate(container_cpu_cfs_throttled_periods_total{namespace="rook-ceph"}[5m])
  / rate(container_cpu_cfs_periods_total{namespace="rook-ceph"}[5m])
```

## Check OSD CPU via Admin Socket

Inspect what a specific OSD is spending CPU time on:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # List OSD performance counters
  ceph tell osd.0 perf dump | jq '.osd'
"
```

Look for `op_latency_ms` values that correlate with CPU spikes.

## Set CPU Requests and Limits in Rook

Avoid CPU throttling by setting appropriate resource requests and limits:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  resources:
    osd:
      requests:
        cpu: "500m"
      limits:
        cpu: "2"
    mgr:
      requests:
        cpu: "250m"
      limits:
        cpu: "1"
    mon:
      requests:
        cpu: "250m"
      limits:
        cpu: "500m"
```

## Identify CPU Spikes During Recovery

Recovery operations are CPU-intensive. Correlate recovery events with CPU spikes:

```bash
# PromQL: Overlay OSD CPU with recovery activity
rate(container_cpu_usage_seconds_total{namespace="rook-ceph",container="osd"}[5m])
# and
rate(ceph_osd_recovery_bytes[5m])
```

If CPU spikes consistently during recovery, reduce the number of concurrent recovery operations:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph config set osd osd_max_backfills 1
  ceph config set osd osd_recovery_max_active 1
"
```

## Alert on Sustained CPU Throttling

High CPU throttle rates indicate limits are too restrictive:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-cpu-alerts
  namespace: rook-ceph
spec:
  groups:
    - name: ceph-cpu
      rules:
        - alert: CephOSDCPUThrottled
          expr: |
            rate(container_cpu_cfs_throttled_periods_total{namespace="rook-ceph",container="osd"}[5m])
            / rate(container_cpu_cfs_periods_total{namespace="rook-ceph",container="osd"}[5m]) > 0.25
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Ceph OSD CPU throttled >25% - increase CPU limits"
```

## Summary

Tracking Ceph CPU usage patterns combines `kubectl top` for quick pod-level visibility, Prometheus container CPU metrics for trend analysis, and Ceph admin socket perf dumps for daemon-specific profiling. Setting appropriate CPU requests and limits prevents throttling, and correlating CPU usage with recovery operations helps tune recovery concurrency to protect client workload performance.
