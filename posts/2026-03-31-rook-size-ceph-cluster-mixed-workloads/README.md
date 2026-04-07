# How to Size a Ceph Cluster for Mixed Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity Planning, Storage, Mixed Workload, Tiering

Description: Learn how to size and architect a Rook-Ceph cluster that serves mixed workloads including databases, file storage, and object storage simultaneously.

---

## Overview

Most production Ceph clusters serve mixed workloads - databases requiring low-latency random I/O, file systems needing high throughput, and object storage demanding large capacity at low cost. Ceph's CRUSH map and storage class system allows you to isolate these workloads onto separate OSD pools and storage tiers, each optimized for its access pattern.

## Identifying Your Workload Mix

Start by categorizing your applications:

```yaml
IOPS-intensive:  databases (PostgreSQL, MySQL), key-value stores
Throughput-heavy: ML training, backups, video ingest
Capacity-heavy:  object storage, archives, cold data
```

Build a matrix:

| Workload | Size | IOPS Target | Throughput Target | Drive Type |
|----------|------|-------------|-------------------|------------|
| Databases | 5TB | 200K | Low | NVMe |
| File Storage | 20TB | Medium | 5GB/s | SSD |
| Object Archive | 75TB | Low | 1GB/s | HDD |

## Hardware Architecture

For a mixed cluster serving all three tiers:

```yaml
# Node types
NVMe nodes (2-3): 8 x NVMe 2TB per node
SSD nodes (2-3):  12 x SSD 4TB per node
HDD nodes (4-6):  16 x HDD 16TB per node
```

## Defining OSD Device Classes

Rook automatically assigns device classes based on drive type:

```bash
# Verify OSD classes
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd tree | grep -E "nvme|ssd|hdd"
```

## Creating Tiered CRUSH Rules

```bash
# Create a CRUSH rule that places data only on NVMe OSDs
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd crush rule create-replicated nvme-rule default host nvme

# Create SSD CRUSH rule
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd crush rule create-replicated ssd-rule default host ssd

# Create HDD CRUSH rule
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd crush rule create-replicated hdd-rule default host hdd
```

## Creating Per-Tier Pools

```yaml
# NVMe pool for databases
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: db-pool-nvme
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  deviceClass: nvme

---
# SSD pool for file storage
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: fs-pool-ssd
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  deviceClass: ssd

---
# HDD pool for object archive
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: archive-pool-hdd
  namespace: rook-ceph
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  deviceClass: hdd
```

## StorageClasses for Each Tier

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-nvme-db
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  pool: db-pool-nvme
  clusterID: rook-ceph
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-ssd-files
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  pool: fs-pool-ssd
  clusterID: rook-ceph
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Monitoring Per-Tier Utilization

```bash
# Check utilization by pool
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- ceph df

# Check per-device-class usage
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd df tree class nvme
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd df tree class hdd
```

## Summary

Sizing a Ceph cluster for mixed workloads involves defining distinct storage tiers based on drive type (NVMe/SSD/HDD), creating per-tier CRUSH rules and pools, and exposing separate Kubernetes StorageClasses for each tier. This lets database workloads land on NVMe for low latency while archive workloads use cost-effective HDD with erasure coding. Device class labels in CRUSH ensure data placement respects tier boundaries automatically.
