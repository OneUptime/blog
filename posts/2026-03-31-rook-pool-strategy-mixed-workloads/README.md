# How to Design a Pool Strategy for Mixed Workloads in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Storage, Kubernetes, Performance

Description: Learn how to design a Ceph pool strategy that serves mixed workloads - databases, object storage, and file systems - with appropriate performance and durability settings.

---

## Why Pool Strategy Matters for Mixed Workloads

A single Ceph cluster often needs to serve multiple workload types: latency-sensitive databases, throughput-heavy backups, and archival cold data. Using a single pool for all workloads leads to resource contention and inefficient use of hardware. A well-designed pool strategy isolates workloads while maximizing cluster efficiency.

## Workload Categories and Pool Requirements

Different workloads have distinct storage requirements:

| Workload | Durability | Performance | Recommended Type |
|---|---|---|---|
| Databases | High | High IOPS | Replicated (3x) on SSD |
| Object storage | Medium | High throughput | Erasure coded |
| Backups/archives | Medium | Low | Erasure coded on HDD |
| File system metadata | High | Very high | Replicated (3x) on NVMe |

## Creating Separate Pools Per Workload

Define a high-performance pool for databases:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: db-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: ssd
  parameters:
    compression_mode: "none"
    pg_num: "128"
```

Define a throughput pool for backups using erasure coding. RBD requires a replicated pool for image metadata even when the data pool uses erasure coding, so define both:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: backup-pool-metadata
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: hdd
```

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: backup-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  deviceClass: hdd
  parameters:
    compression_mode: "aggressive"
```

## Assigning Storage Classes to Workloads

Create separate StorageClasses backed by each pool:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd-db
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: db-pool
  imageFormat: "2"
  imageFeatures: layering
reclaimPolicy: Retain
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd-backup
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: backup-pool-metadata
  dataPool: backup-pool
```

## Balancing PG Counts Across Pools

Pool placement groups (PGs) must be distributed thoughtfully. Use the Ceph PG calculator:

```bash
# Check recommended PG count per pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status
```

Enable the autoscaler for dynamic adjustment:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set db-pool pg_autoscale_mode on
```

## Applying CRUSH Rules for Device Class Isolation

Ensure each pool only uses its designated device class:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule create-replicated rule-ssd default host ssd

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set db-pool crush_rule rule-ssd
```

## Summary

Designing a pool strategy for mixed workloads involves matching workload characteristics - IOPS requirements, durability needs, and cost sensitivity - to pool types, device classes, and replication strategies. By creating dedicated pools with appropriate CRUSH rules and storage classes, you can serve diverse applications from a single Ceph cluster without performance interference or resource waste.
