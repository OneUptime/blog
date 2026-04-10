# How to Configure Ceph Storage for Media and Entertainment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Media, Entertainment, Video, Streaming, Object Storage, S3

Description: Configure Rook/Ceph storage for media and entertainment workloads including video ingest, transcoding pipelines, asset management, and content distribution.

---

## Media and Entertainment Storage Challenges

Media workloads are among the most demanding for storage:
- **Large files**: Raw video files range from GBs to TBs per asset
- **High throughput**: 4K/8K video ingest requires 500+ MB/s sustained
- **Sequential IO**: Video is predominantly sequential read/write
- **Multi-protocol**: NFS for editing suites, S3 for cloud workflows, block for databases
- **Tiering**: Hot production assets vs. cold archival footage

## High-Throughput Pool Configuration

For video ingest and transcoding, optimize for sequential throughput with HDD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: video-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: hdd
  parameters:
    pg_num: "128"
    compression_mode: none   # Video is already compressed
    min_size: "2"
```

## CephFS for Shared Editing Storage

NLE (Non-Linear Editing) workstations need shared POSIX storage with high throughput:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: media-fs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
    deviceClass: ssd
  dataPools:
    - name: data0
      replicated:
        size: 3
      deviceClass: hdd
  metadataServer:
    activeCount: 2
    activeStandby: true
    resources:
      requests:
        cpu: "4"
        memory: 8Gi
      limits:
        cpu: "8"
        memory: 16Gi
```

The SSD metadata pool ensures fast directory traversal for large media libraries.

## S3 Object Store for MAM Integration

Media Asset Management (MAM) systems use S3-compatible APIs:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: media-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
    parameters:
      compression_mode: none
  gateway:
    port: 80
    instances: 4  # Multiple gateways for parallel ingest throughput
```

## Transcoding Pipeline PVC Configuration

Transcoding jobs need fast scratch space:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: transcode-scratch
  namespace: media-pipeline
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rook-ceph-block
  resources:
    requests:
      storage: 2Ti
```

## Configuring S3 Multipart Upload for Large Files

Media files benefit from multipart upload. Multipart thresholds are configured on the client side via the AWS CLI:

```bash
# Upload a large video file with multipart
aws s3 cp /media/rawfootage.mov s3://media-archive/ \
  --endpoint-url http://rook-ceph-rgw-media-store:80 \
  --multipart-threshold 100MB \
  --multipart-chunksize 100MB
```

## Lifecycle Policy for Archive Management

Move assets older than 90 days to a cold storage pool:

```json
{
  "Rules": [
    {
      "ID": "archive-old-assets",
      "Status": "Enabled",
      "Filter": {"Prefix": "raw/"},
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## Summary

Ceph's multi-protocol capabilities make it ideal for media and entertainment storage: CephFS serves shared editing workloads via NFS/POSIX, RBD provides high-throughput block storage for transcoding pipelines, and RGW S3 integrates with MAM systems and cloud workflows. Separate pools for hot production assets and cold archival footage, with lifecycle policies to automate tiering, keep storage costs manageable while meeting throughput requirements.
