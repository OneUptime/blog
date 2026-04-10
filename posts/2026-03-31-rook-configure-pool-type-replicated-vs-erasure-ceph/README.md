# How to Configure pool_type (Replicated vs Erasure) in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Erasure Coding, Replication

Description: Learn how to choose and configure Ceph pool types - replicated and erasure coded - through Rook CRDs, including tradeoffs in performance, overhead, and use case suitability.

---

## Pool Type Overview

Ceph supports two pool types for data storage:

- **Replicated**: Data is copied N times across OSDs. Simple, low latency, higher overhead.
- **Erasure Coded**: Data is split into k data chunks and m parity chunks. Lower overhead, higher CPU usage, suitable for large sequential workloads.

Choosing the right pool type depends on your workload's latency requirements, capacity efficiency goals, and recovery tolerance.

## Replicated Pool Configuration

Replicated pools are the default and are required for RBD, CephFS metadata, and RGW indexes. Configure them via the CephBlockPool CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicated-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3           # Total copies (write to all 3)
    requireSafeReplicaSize: true  # Prevent writes if min_size can't be met
```

For CephFS data and metadata pools:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: data0
      replicated:
        size: 3
```

## Erasure Coded Pool Configuration

Erasure coded pools are ideal for object storage (RGW data) and large-file workloads where capacity efficiency matters more than latency:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool
  namespace: rook-ceph
spec:
  failureDomain: osd
  erasureCoded:
    dataChunks: 4     # k - number of data chunks
    codingChunks: 2   # m - number of parity chunks
```

This 4+2 configuration requires 6 OSDs and tolerates 2 OSD failures. Effective capacity = k/(k+m) = 4/6 = 67%.

## Applying EC to Object Storage

For RGW with erasure coding, use a replicated metadata pool and EC data pool:

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
    erasureCoded:
      dataChunks: 4
      codingChunks: 2
  gateway:
    port: 80
    instances: 2
```

## Overhead Comparison

| Configuration | Raw Space Needed per 1TB usable | Fault Tolerance |
|--------------|--------------------------------|-----------------|
| 3x replication | 3TB | 2 OSD failures |
| 4+2 erasure | ~1.5TB | 2 OSD failures |
| 8+3 erasure | ~1.375TB | 3 OSD failures |

## Performance Tradeoffs

Check that your workload suits the pool type:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # List pools with their types
  ceph osd pool ls detail | grep -E 'pool|type|erasure'

  # Get erasure code profile for a pool
  ceph osd pool get ec-pool erasure_code_profile
  ceph osd erasure-code-profile get jerasure-k4-m2
"
```

Erasure coded pools have (k+m)/k write amplification (e.g., 1.5x for 4+2) and require additional CPU for encoding/decoding. They are not suitable for small random IO workloads like RBD or CephFS metadata.

## Verify Pool Type After Creation

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool ls detail | grep -A3 'pool.*replicated-pool'
  ceph osd pool ls detail | grep -A3 'pool.*ec-pool'
"
```

## Summary

Ceph pool type selection requires balancing capacity efficiency against performance requirements. Replicated pools suit all workloads but consume 3x raw capacity for 3-replica configurations. Erasure coded pools provide 50-70% storage efficiency at the cost of higher CPU usage and write amplification, making them ideal for object storage and large sequential workloads but unsuitable for small random IO. Configure pool types in Rook via the `replicated` or `erasureCoded` fields in CephBlockPool, CephFilesystem, and CephObjectStore CRDs.
