# How to Set CPU Requests and Limits for Rook-Ceph OSD Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, OSD, CPU, Resource, Pod

Description: Configure CPU requests and limits for Rook-Ceph OSD pods in Kubernetes to balance cluster performance, prevent CPU starvation during recovery, and control resource contention.

---

## Overview

OSD pods are the most CPU-intensive Ceph daemons, performing encoding, compression, checksum calculations, and network I/O for all object data. Setting appropriate CPU resources for OSD pods ensures they get enough CPU for client I/O while preventing them from starving other cluster workloads.

## OSD CPU Consumption Patterns

OSD pods consume CPU heavily during:
- BlueStore checksumming and compression (all reads/writes)
- Recovery and backfill operations (major CPU spike)
- Scrubbing (background integrity checks)
- Erasure coding encode/decode (EC pools only)

## Configuring OSD Resources in CephCluster

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
        cpu: "1000m"
        memory: "4Gi"
      limits:
        cpu: "2000m"
        memory: "8Gi"
```

Apply and verify:

```bash
kubectl apply -f cephcluster.yaml

# Watch OSD pods roll
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -w

# After restart, check resource settings
kubectl -n rook-ceph describe pod rook-ceph-osd-0-<hash> | grep -A10 "Limits:"
```

## Verifying OSD CPU Usage

```bash
# Check real-time CPU usage
kubectl -n rook-ceph top pods -l app=rook-ceph-osd

# Check for CPU throttling
for pod in $(kubectl -n rook-ceph get pods -l app=rook-ceph-osd -o name); do
    echo "=== $pod ==="
    kubectl -n rook-ceph exec $pod -- \
        cat /sys/fs/cgroup/cpu/cpu.stat 2>/dev/null | grep nr_throttled
done
```

## Tuning Recovery CPU Impact

OSD recovery is the main cause of CPU spikes. Limit recovery CPU impact:

```bash
# Reduce recovery thread count (reduces CPU during recovery)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph config set osd osd_recovery_threads 1

# Limit concurrent recovery operations
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph config set osd osd_recovery_max_active_hdd 3
```

## OSD CPU Sizing by Storage Type

| OSD Device | CPU Request | CPU Limit | Notes |
|---|---|---|---|
| HDD | 500m | 1000m | Lower IOPS, less CPU |
| SSD/NVMe | 1000m | 2000m | Higher IOPS, more CPU |
| Erasure coded NVMe | 2000m | 4000m | EC encoding is CPU-intensive |
| Compressed NVMe | 1500m | 3000m | Compression adds CPU load |

## Separating OSD Resources from Prepare Jobs

Rook runs OSD prepare jobs separately from OSD pods:

```yaml
spec:
  resources:
    osd:
      requests:
        cpu: "1000m"
        memory: "4Gi"
      limits:
        cpu: "2000m"
        memory: "8Gi"
    prepareosd:
      requests:
        cpu: "500m"
        memory: "50Mi"
      limits:
        cpu: "1000m"
        memory: "200Mi"
```

## Prometheus Query for OSD CPU

```promql
# OSD CPU usage rate
rate(container_cpu_usage_seconds_total{
  namespace="rook-ceph",
  pod=~"rook-ceph-osd-.*"
}[5m])

# OSD CPU throttling ratio
rate(container_cpu_cfs_throttled_periods_total{
  namespace="rook-ceph",
  pod=~"rook-ceph-osd-.*"
}[5m])
/
rate(container_cpu_cfs_periods_total{
  namespace="rook-ceph",
  pod=~"rook-ceph-osd-.*"
}[5m])
```

## Summary

OSD pod CPU settings require balancing client I/O throughput with background recovery demands. Set requests at 50% of typical peak usage and limits at 150-200% of requests to allow bursting. For NVMe-backed OSDs, be generous with CPU limits as NVMe devices can saturate CPU with high IOPS. Monitor throttling metrics and reduce recovery parallelism to limit CPU spikes during cluster healing operations.
