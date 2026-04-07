# How to Choose Between Replication and Erasure Coding for Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Erasure Coding, Replication

Description: Compare Ceph replication and erasure coding pool types to choose the right storage efficiency and durability tradeoff for your Rook workloads.

---

Choosing between replication and erasure coding (EC) is one of the most important decisions when designing a Ceph storage cluster. Each approach has distinct tradeoffs in storage efficiency, performance, and operational complexity.

## Replication

Replicated pools store `N` full copies of every object. The default is `size=3`, meaning every byte you write consumes 3x raw storage.

**Advantages:**
- Simple to configure and understand
- Low read latency (any replica can serve reads)
- Full random read/write support
- Compatible with RBD, CephFS, and RGW

**Disadvantages:**
- Low storage efficiency (3x overhead for 3-replica)
- Not cost-effective for large data at scale

## Erasure Coding

EC pools split each object into `k` data chunks and `m` parity chunks. Only `k+m` shards are stored, and the system can tolerate up to `m` OSD failures.

Common profiles:
| Profile | Overhead | Fault Tolerance |
|---|---|---|
| k=2, m=1 | 1.5x | 1 OSD |
| k=4, m=2 | 1.5x | 2 OSDs |
| k=8, m=3 | 1.375x | 3 OSDs |
| k=6, m=3 | 1.5x | 3 OSDs |

Compare: 3-replica = 3.0x overhead vs k=4,m=2 EC = 1.5x overhead.

**Advantages:**
- Much better storage efficiency (1.3-1.5x vs 3x)
- Strong durability at lower cost

**Disadvantages:**
- Higher write amplification (all `k+m` shards must be written)
- Higher CPU overhead for encoding/decoding
- Requires partial object reads for small reads
- RBD requires an EC override pool for metadata

## Create a Replicated Pool in Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
```

## Create an Erasure Coded Pool in Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
```

Note: EC pools for RBD require a replicated metadata pool. Create a `CephBlockPool` StorageClass with both an EC data pool and a replicated metadata pool:

```yaml
parameters:
  pool: replicapool
  dataPool: ec-pool
  # pool is the replicated metadata pool; dataPool is the EC data pool
```

## Decision Framework

| Criteria | Use Replication | Use Erasure Coding |
|---|---|---|
| Workload | Random I/O, RBD, CephFS | Sequential, cold data, object storage |
| Storage budget | Smaller clusters | Large clusters, cost-sensitive |
| Latency requirement | Low latency | Moderate latency acceptable |
| OSD count | Any | At least k+m OSDs per failure domain |

## Summary

Use replicated pools (3x) for latency-sensitive RBD block storage and CephFS metadata pools. Use erasure coded pools (1.5x) for large-scale object storage, cold data, or backup pools where storage efficiency matters more than raw IOPS. In Rook, both pool types are configured through the `CephBlockPool` CRD with either the `replicated` or `erasureCoded` spec field.
