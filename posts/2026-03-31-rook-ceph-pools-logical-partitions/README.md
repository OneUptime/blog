# How to Understand Ceph Pools and Logical Partitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Storage, Kubernetes, Partition

Description: Learn how Ceph pools act as logical partitions within a cluster, controlling replication, erasure coding, CRUSH rules, and application-level data isolation.

---

## What Is a Ceph Pool

A Ceph pool is a logical namespace within RADOS that groups objects together and applies a consistent set of storage policies. Every object in Ceph lives in exactly one pool. Pools control:

- Replication strategy (replicated or erasure-coded)
- Number of placement groups (PGs)
- CRUSH rule for OSD selection and failure domains
- Quotas (maximum bytes or objects)
- Compression settings
- Application association (rbd, cephfs, rgw)

## Pool Types

### Replicated Pools

Replicated pools store multiple full copies of each object. A pool with `size: 3` stores three identical copies, each on a different OSD (or host, depending on the failure domain).

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicated-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
```

### Erasure-Coded Pools

Erasure-coded pools split objects into data chunks plus coding chunks, trading CPU overhead for storage efficiency. A `4+2` profile stores 4 data chunks and 2 coding chunks, tolerating 2 OSD failures with only 1.5x overhead vs 3x for 3-replica.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  failureDomain: host
```

## Listing and Inspecting Pools

Use the Rook toolbox to inspect pool configuration:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# List all pools
ceph osd lspools

# Detailed pool stats
ceph osd pool ls detail

# Get specific pool parameter
ceph osd pool get replicapool size
ceph osd pool get replicapool pg_num
```

## Pool as a Logical Partition

Different Ceph storage services each use dedicated pools:

| Service | Pool Example | Purpose |
|---------|-------------|---------|
| RBD | replicapool | Block device images |
| CephFS | cephfs-metadata | Filesystem metadata |
| CephFS | cephfs-data | Filesystem data |
| RGW | .rgw.root | Object store index |

This partitioning allows you to apply different CRUSH rules per service - for example, using NVMe OSDs for the CephFS metadata pool and HDD OSDs for data pools.

```bash
# Set CRUSH rule on a pool
ceph osd pool set cephfs-metadata crush_rule nvme-rule
```

## Pool Quotas

Limit the storage consumed by a pool:

```bash
# Set max bytes
ceph osd pool set-quota replicapool max_bytes 10995116277760

# Set max object count
ceph osd pool set-quota replicapool max_objects 1000000

# View quota status
ceph osd pool get-quota replicapool
```

## Pool Application Labels

Each pool should be tagged with its application type. Without this tag, Ceph emits a health warning:

```bash
ceph osd pool application enable replicapool rbd
ceph osd pool application enable cephfs-data cephfs
ceph osd pool application enable .rgw.root rgw
```

## Summary

Ceph pools are the primary mechanism for applying storage policies to groups of objects within a cluster. They act as logical partitions that isolate different workloads, control replication or erasure coding settings, target specific hardware tiers via CRUSH rules, and enforce capacity quotas. In Rook, pools are defined as CRDs and managed declaratively, making it straightforward to create isolated storage namespaces for different applications and teams.
