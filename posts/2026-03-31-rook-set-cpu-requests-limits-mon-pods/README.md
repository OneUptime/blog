# How to Set CPU Requests and Limits for Rook-Ceph Mon Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Monitor, CPU, Resource, Pod

Description: Configure CPU requests and limits for Rook-Ceph MON (monitor) pods in Kubernetes to ensure stable cluster quorum and prevent resource contention with other workloads.

---

## Overview

Ceph monitors (MONs) are the foundation of cluster quorum. If MON pods are starved of CPU, the cluster can lose quorum and become unavailable. Setting appropriate CPU requests ensures MON pods are scheduled on nodes with sufficient capacity, while limits protect against runaway CPU usage.

## Understanding MON CPU Requirements

MON pods are generally CPU-light under normal operations but can spike during:
- Leader elections (when a MON restarts or a node fails)
- Large CRUSH map updates
- Many simultaneous OSD state changes

Recommended starting values:
- Request: 500m (0.5 CPU)
- Limit: 1000m (1 CPU) - set loosely to handle election spikes

## Configuring MON Resources in CephCluster

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 3
    allowMultiplePerNode: false
  resources:
    mon:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1000m"
        memory: "2Gi"
```

Apply the configuration:

```bash
kubectl apply -f cephcluster.yaml

# Watch MON pods restart with new resources
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -w
```

## Verifying Resource Configuration

```bash
# Check the resource settings on a MON pod
kubectl -n rook-ceph describe pod rook-ceph-mon-a-<hash> | grep -A10 "Limits:"

# View all MON pod resource usage
kubectl -n rook-ceph top pods -l app=rook-ceph-mon

# Verify MON quorum is maintained after restart
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph mon stat
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph quorum_status
```

## CPU Throttling Alerts

Monitor for CPU throttling that indicates limits are too low:

```bash
# Check for throttling in the cgroup
kubectl -n rook-ceph exec rook-ceph-mon-a-<hash> -- \
    cat /sys/fs/cgroup/cpu/cpu.stat | grep throttled

# Or use Prometheus query
# container_cpu_cfs_throttled_periods_total{pod=~"rook-ceph-mon.*"}
```

## Production Sizing Guide

| Cluster Size | MON CPU Request | MON CPU Limit |
|---|---|---|
| < 10 OSDs | 250m | 500m |
| 10-50 OSDs | 500m | 1000m |
| 50-200 OSDs | 1000m | 2000m |
| > 200 OSDs | 2000m | 4000m |

## Setting Node Affinity for MON Pods

Pair resource settings with node affinity to ensure MONs land on appropriate nodes:

```yaml
spec:
  placement:
    mon:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: node-role.kubernetes.io/ceph-mon
              operator: Exists
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: rook-ceph-mon
          topologyKey: kubernetes.io/hostname
```

## Summary

MON CPU resources should be set conservatively for requests (ensuring scheduling on appropriate nodes) but generously for limits (allowing CPU bursts during elections). A quorum loss due to CPU throttling is more damaging than allowing a MON to briefly use extra CPU. Monitor CPU throttling via Prometheus and increase limits if throttling occurs during normal cluster operations.
