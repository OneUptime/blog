# How to Set Up Ceph for Cold Storage Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cold Storage, Archive, HDD, Erasure Coding, Cost, Capacity

Description: Configure Rook/Ceph for cold storage workloads using HDD OSDs, erasure coding, and aggressive compression to maximize storage density and minimize cost for rarely accessed data.

---

## What is Cold Storage?

Cold storage serves data that is accessed infrequently - perhaps monthly or less. The access pattern is write-once-read-rarely. Cost per GB is the primary optimization target, while access latency is a secondary concern. Typical cold storage workloads include compliance archives, backup repositories, historical analytics data, and media archives.

## Hardware Considerations for Cold Storage

Cold storage in Ceph uses HDD (spinning disk) nodes optimized for capacity:
- High-capacity HDDs (16 TB to 24 TB per drive)
- More drives per node (high-density JBOD shelves)
- Fewer but higher-core-count CPUs (erasure coding is CPU-intensive)
- Less RAM per OSD than hot storage (2 GB per OSD minimum)

## Erasure-Coded Pool for Maximum Density

Erasure coding dramatically improves storage efficiency vs. 3-way replication:

| Configuration | Usable Efficiency |
|--------------|-------------------|
| Replicated 3x | 33% |
| EC 4+2 | 67% |
| EC 6+2 | 75% |
| EC 8+3 | 73% |

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: cold-storage-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 6
    codingChunks: 2
  deviceClass: hdd
  parameters:
    compression_mode: aggressive
    bulk: "true"
    allow_ec_overwrites: "true"
```

## RGW Object Store for Cold Data

Configure RGW to use the cold pool for the GLACIER storage class:

```bash
# Add cold storage placement target
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin zone placement add \
  --rgw-zone default \
  --placement-id default-placement \
  --storage-class GLACIER \
  --data-pool cold-storage-pool

# Reload RGW config
kubectl rollout restart deployment -n rook-ceph -l app=rook-ceph-rgw
```

## Uploading Directly to Cold Storage

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://rook-ceph-rgw-cold-store.rook-ceph.svc'
)

# Upload directly to cold storage class
s3.upload_file(
    '/backup/database-2025-01-01.tar.gz',
    'cold-archive',
    'backups/2025/01/database-2025-01-01.tar.gz',
    ExtraArgs={'StorageClass': 'GLACIER'}
)
```

## Tuning OSD for Cold Workloads

Adjust OSD settings for sequential, infrequent access:

```bash
# Increase OSD op threads for EC decode operations
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_threads_per_shard 2

# Reduce OSD memory target for cold nodes (less caching needed)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd.0 osd_memory_target 2147483648  # 2GB

# Enable BlueStore bulk flag for large sequential IO
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set cold-storage-pool bulk true
```

## Setting PG Count for Cold Pools

Cold pools with large capacity need appropriate PG counts:

```bash
# Calculate recommended PGs
# Formula: (OSDs * 100) / pool_size
# For EC 6+2 pool_size is k+m = 8. On 24 OSDs: 24 * 100 / 8 = 300 -> round to 256

kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set cold-storage-pool pg_num 256

kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set cold-storage-pool pgp_num 256
```

## Monitoring Cold Storage Efficiency

```bash
# Check compression savings on cold pool
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df detail | grep cold

# View erasure coding overhead
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool stats cold-storage-pool
```

## Summary

Cold storage in Ceph leverages high-capacity HDD nodes with erasure coding (6+2 or 8+3) and aggressive compression to achieve 70-75% storage efficiency at low cost. By exposing the cold pool as a GLACIER storage class in RGW, applications can write directly to cold storage and lifecycle rules can automatically migrate aging data. Tuning OSD memory targets and BlueStore settings for cold access patterns ensures the cluster doesn't waste RAM on caching data that is accessed only occasionally.
