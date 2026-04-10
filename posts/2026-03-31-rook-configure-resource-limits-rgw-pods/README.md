# How to Configure Resource Limits for Rook-Ceph RGW Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, RGW, Object Storage, Resource, Pod

Description: Configure CPU and memory resource limits for Rook-Ceph RGW (RADOS Gateway) pods to handle object storage workloads, support large thread pools, and prevent resource contention.

---

## Overview

RADOS Gateway (RGW) pods serve all S3 and Swift API requests. Resource requirements depend heavily on request concurrency, object sizes, and whether features like D3N caching or server-side encryption are enabled. Proper resource configuration ensures consistent latency under load.

## Understanding RGW Resource Consumption

RGW consumes resources based on:
- **Thread pool size** - each worker thread consumes ~4-8 MB memory
- **Request queue depth** - buffered request data in memory
- **D3N cache I/O** - libaio threads and buffer memory
- **SSL/TLS overhead** - encryption CPU cost
- **Multipart upload state** - in-memory buffer for active uploads

## Basic RGW Resource Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "2000m"
        memory: "4Gi"
```

## Thread Pool and Memory Relationship

The thread pool size directly impacts memory requirements:

```bash
# Check current thread pool size
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph config get client.rgw rgw_thread_pool_size

# A typical formula:
# Memory needed = (thread_count * 8MB) + 512MB base
# For 512 threads: 512 * 8MB + 512MB = ~4.5GB
```

Align memory limits with thread pool size:

```bash
# Set thread pool size
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph config set client.rgw rgw_thread_pool_size 256
```

## RGW Resource Sizing Guide

| Workload | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| Development | 250m | 500m | 512Mi | 1Gi |
| Small production | 500m | 1000m | 1Gi | 2Gi |
| Medium production | 1000m | 2000m | 2Gi | 4Gi |
| High-throughput | 2000m | 4000m | 4Gi | 8Gi |
| D3N + high thread | 2000m | 4000m | 4Gi | 12Gi |

## Monitoring RGW Resource Usage

```bash
# Real-time CPU and memory
kubectl -n rook-ceph top pods -l app=rook-ceph-rgw

# Check for OOM kills
kubectl -n rook-ceph get events | grep -i "oom\|OOMKilled" | grep rgw

# Monitor request queue depth via perf counters
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph tell rgw.my-store.a perf dump | python3 -m json.tool | grep "qlen\|qactive"
```

## Tuning for SSL/TLS Workloads

SSL termination adds significant CPU overhead:

```yaml
spec:
  gateway:
    resources:
      requests:
        cpu: "1000m"    # Increase for SSL
        memory: "2Gi"
      limits:
        cpu: "4000m"    # Allow bursting for TLS handshake spikes
        memory: "4Gi"
```

## Handling Traffic Spikes with HPA

For variable workloads, combine resource limits with Horizontal Pod Autoscaling:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rook-ceph-rgw
  namespace: rook-ceph
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rook-ceph-rgw-my-store-a
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Summary

RGW pod memory requirements are primarily driven by thread pool size and D3N cache buffers. Start with 1Gi memory request and 4Gi limit for production, then tune based on observed usage. Increase CPU limits generously for SSL/TLS workloads where encryption overhead causes CPU spikes. Monitor queue depth via perf counters to detect when RGW is overloaded and needs more instances or larger resource limits.
