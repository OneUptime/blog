# How to Set Up Ceph for Warm Storage Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Warm Storage, SSD, Intermediate, Analytics, Tiering, Storage

Description: Configure Rook/Ceph warm storage using SSD OSDs for workloads that need better-than-HDD performance without the cost of NVMe, ideal for analytics and intermediate data.

---

## What is Warm Storage?

Warm storage sits between hot (NVMe, maximum performance) and cold (HDD, maximum capacity) tiers. It uses SSDs (SATA or SAS SSDs, not NVMe) to provide good throughput and acceptable latency at a moderate cost. Warm storage is ideal for:
- Analytics databases (ClickHouse, Druid)
- Recent log data (last 30-90 days)
- Intermediate pipeline results
- Development and staging environments
- Frequently but not constantly accessed data

## SSD-Backed Pool Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: warm-ssd-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  deviceClass: ssd
  parameters:
    pg_autoscale_mode: "on"
    compression_mode: passive  # Compress only when client sends a compressible hint
    min_size: "2"
```

## Warm Object Storage Pool

For S3 workloads that are accessed daily but not continuously:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: warm-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
    deviceClass: ssd
  dataPool:
    replicated:
      size: 3
    deviceClass: ssd
    parameters:
      compression_mode: passive
  gateway:
    instances: 2
    port: 80
```

## Warm StorageClass for Kubernetes

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-warm
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: warm-ssd-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/fstype: ext4
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Tuning Warm Storage OSD Settings

SSDs (non-NVMe) benefit from slightly different settings than NVMe or HDD:

```bash
# Set moderate BlueStore cache (4 GB per OSD for SSD)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_cache_size_ssd 4294967296  # 4GB

# Enable BlueStore deferred writes for SSDs (helps write performance)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_deferred_batch_ops 16

# Moderate op thread count for SSD parallelism
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_threads_per_shard_ssd 2
```

## Analytics Use Case: ClickHouse on Warm Storage

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: clickhouse
  namespace: analytics
spec:
  replicas: 3
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        storageClassName: rook-ceph-warm
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 5Ti
    - metadata:
        name: logs
      spec:
        storageClassName: rook-ceph-warm
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 500Gi
```

## Automated Tiering with Lifecycle Rules

Automatically move warm data to cold after 60 days:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-warm-store.rook-ceph.svc \
  --bucket analytics-results \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "warm-to-cold",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Transitions": [{"Days": 60, "StorageClass": "COLD"}]
    }]
  }'
```

## Performance Expectations

Warm SSD storage in Ceph typically delivers:
- 10,000-50,000 random read IOPS per node (vs 200,000+ for NVMe)
- 500 MB/s - 2 GB/s sequential throughput per node
- 0.5-5ms average latency (vs 0.1-1ms for NVMe)

Verify with FIO benchmarks after deployment to establish your baseline.

## Summary

Warm SSD storage in Ceph provides a cost-effective middle tier between NVMe and HDD, ideal for analytics workloads, recent log data, and intermediate pipeline results. SSD-backed pools with passive compression balance performance and storage efficiency. Automated lifecycle rules on warm object store buckets ensure data flows smoothly from warm to cold storage as it ages, maintaining the economics of tiered storage without manual data movement.
