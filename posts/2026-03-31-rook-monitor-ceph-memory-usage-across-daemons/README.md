# How to Monitor Ceph Memory Usage Across Daemons

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Memory, Kubernetes

Description: Learn how to monitor memory usage across Ceph daemons including OSDs, MONs, and MGR using Prometheus metrics and Kubernetes resource tracking to prevent OOM kills.

---

## Why Memory Matters for Ceph Daemons

Ceph daemons - particularly BlueStore OSDs - can consume significant memory. Each OSD uses memory for BlueStore cache, which directly impacts read performance. Monitors and managers also have growing memory footprints as cluster size increases. Monitoring memory helps you:

- Prevent OOM kills that cause OSDs to restart and cluster health to degrade
- Right-size Kubernetes resource limits
- Tune BlueStore cache size for optimal performance

## Monitor Memory via Prometheus

Key Prometheus metrics for Ceph memory:

```bash
# Per-daemon memory usage (via cAdvisor)
container_memory_working_set_bytes{namespace="rook-ceph", container=~"osd|mon|mgr"}

# Memory limit per container (for calculating usage percentage)
container_spec_memory_limit_bytes{namespace="rook-ceph", container=~"osd|mon|mgr"}

# BlueStore cache memory per OSD (requires MGR Prometheus perf counters enabled)
ceph_bluestore_cache_bytes
```

## Check Memory via kubectl top

Quick per-pod memory view using kubectl:

```bash
# All rook-ceph pods
kubectl -n rook-ceph top pods --sort-by=memory

# OSD pods specifically
kubectl -n rook-ceph top pods -l app=rook-ceph-osd

# Monitor pods
kubectl -n rook-ceph top pods -l app=rook-ceph-mon
```

## Check Memory Inside the Ceph Tools Pod

Use the Ceph admin CLI to inspect daemon memory:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Check memory usage per daemon via admin socket
  ceph tell osd.* heap stats

  # MGR memory (replace 'a' with your active MGR name from 'ceph mgr stat')
  ceph tell mgr.a heap stats

  # MON memory
  ceph tell mon.* heap stats
"
```

## Set BlueStore Cache Memory Limits

Control how much memory OSDs use for BlueStore cache:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Check current target max bytes
  ceph config get osd bluestore_cache_size_hdd
  ceph config get osd bluestore_cache_size_ssd

  # Set cache limits (e.g., 2GB for SSD-backed OSDs)
  ceph config set osd bluestore_cache_size_ssd 2147483648
"
```

## Set Kubernetes Resource Limits in Rook

Define memory requests and limits for Ceph daemons in the CephCluster spec:

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
        memory: "2Gi"
      limits:
        memory: "4Gi"
    mon:
      requests:
        memory: "512Mi"
      limits:
        memory: "1Gi"
    mgr:
      requests:
        memory: "512Mi"
      limits:
        memory: "1Gi"
```

## Alert on High Memory Usage

Create alerts to catch daemons approaching OOM conditions:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-memory-alerts
  namespace: rook-ceph
spec:
  groups:
    - name: ceph-memory
      rules:
        - alert: CephOSDHighMemory
          expr: |
            container_memory_working_set_bytes{namespace="rook-ceph",container="osd"}
            / container_spec_memory_limit_bytes{namespace="rook-ceph",container="osd"} > 0.85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Ceph OSD pod using >85% of memory limit"
```

## Summary

Monitoring Ceph memory across daemons uses a combination of `kubectl top`, Prometheus container memory metrics, and Ceph `heap stats` commands. Setting appropriate BlueStore cache limits and Kubernetes resource requests and limits prevents OOM kills and ensures stable performance, particularly for OSD daemons where memory directly affects caching effectiveness.
