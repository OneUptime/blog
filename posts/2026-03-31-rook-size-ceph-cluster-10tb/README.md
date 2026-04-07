# How to Size a Ceph Cluster for 10TB Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity Planning, Storage, Kubernetes, Infrastructure

Description: A practical guide to sizing a Rook-Ceph cluster to hold 10TB of usable storage, covering OSD count, replication overhead, and hardware requirements.

---

## Overview

Sizing a Ceph cluster requires understanding the difference between raw capacity and usable capacity. Replication and erasure coding add overhead that reduces the space available for actual data. For a 10TB usable target, you need to account for replication factor, write overhead, and a safety buffer. This guide walks through the calculations and hardware recommendations for a 10TB Rook-Ceph deployment.

## Capacity Calculation

For a 3-way replication (the default):

```text
Usable capacity = Raw capacity / replication factor * (1 - safety buffer)
```

To achieve 10TB usable with 3x replication and a 20% safety buffer:

```text
Raw needed = 10TB * 3 (replication) / 0.8 (buffer) = 37.5TB raw
```

Rounding up: provision at least **40TB raw** across your OSDs.

## OSD Sizing Options

### Option A: Larger Drives (fewer nodes)

```yaml
3 nodes * 4 drives * 4TB each = 48TB raw
Usable: 48 / 3 / 1.2 = ~13TB usable
```

This comfortably covers 10TB with some headroom.

### Option B: Smaller Drives (more nodes)

```yaml
5 nodes * 3 drives * 3TB each = 45TB raw
Usable: 45 / 3 / 1.2 = ~12.5TB usable
```

More nodes improves fault tolerance and parallel I/O.

## Minimum Hardware per Node

```yaml
# Recommended node spec for a 10TB cluster
CPU: 8 cores (2 dedicated to Ceph per OSD recommended)
RAM: 32GB (4-8GB per OSD + 2GB per monitor)
Network: 10GbE (dedicated storage network preferred)
OSDs: 3-4 drives per node
OSD type: HDD for cost, SSD for latency-sensitive workloads
```

## Sample Rook CephCluster YAML

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 2
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
    - name: sdb
    - name: sdc
    - name: sdd
    - name: sde
  resources:
    osd:
      limits:
        cpu: "2"
        memory: "4Gi"
      requests:
        cpu: "1"
        memory: "2Gi"
```

## Monitor and Manager Sizing

For a 10TB cluster with 3 nodes:

```yaml
Monitors: 3 (one per node)
Managers: 2 (active + standby)
MDSes: 2 (only if using CephFS)
RGW: 1-2 (only if using object storage)
```

## Storage Pool Configuration

```bash
# Create a replicated pool for 10TB usable target
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool create replicapool 64 64 replicated

kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool size 3

# Verify available capacity
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df
```

## Growth Planning

At 10TB scale, plan your next expansion at 70% utilization (~7TB used):

```bash
# Monitor utilization
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df | grep TOTAL
```

## Summary

Sizing a Ceph cluster for 10TB usable storage requires provisioning roughly 40TB of raw disk capacity when using 3x replication and a 20% safety buffer. A 3-node cluster with 4x 4TB drives per node exceeds this comfortably while maintaining fault tolerance. Monitor utilization and plan expansion before reaching 70% full to avoid performance degradation as Ceph approaches capacity limits.
