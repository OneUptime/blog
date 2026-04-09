# How to Use Erasure Coding with RGW in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, ErasureCoding, RGW, ObjectStorage

Description: Learn how to configure Ceph RGW (RADOS Gateway) to use erasure coded pools for S3-compatible object storage, reducing storage overhead without sacrificing fault tolerance.

---

Ceph's RADOS Gateway (RGW) is the most natural fit for erasure coding because object storage workloads are predominantly write-once/read-many. EC pools work natively with RGW without requiring the `allow_ec_overwrites` flag, making RGW the recommended use case for EC in production Ceph clusters.

## RGW Pool Architecture

By default, an RGW zone creates many pools. The ones that benefit most from EC are the data pools:

```text
.rgw.root                  - Zone metadata (replicated)
<zone>.rgw.control          - Control plane (replicated)
<zone>.rgw.meta             - Metadata buckets (replicated)
<zone>.rgw.log              - Logging (replicated)
<zone>.rgw.buckets.index    - Bucket indices (replicated, high IOPS)
<zone>.rgw.buckets.data     - Object data (EC recommended)
<zone>.rgw.buckets.non-ec   - Small objects, HEAD requests (replicated)
```

Only `.rgw.buckets.data` should use EC. All other pools should remain replicated.

## Creating the EC Profile and Data Pool

```bash
# Create erasure code profile
ceph osd erasure-code-profile set rgw-ec-profile \
  plugin=jerasure \
  technique=reed_sol_van \
  k=4 \
  m=2 \
  crush_failure_domain=host

# Create EC data pool
ceph osd pool create .rgw.buckets.data 128 128 erasure rgw-ec-profile
ceph osd pool application enable .rgw.buckets.data rgw
```

Note: No `allow_ec_overwrites` needed for RGW data pools since objects are written once.

## Rook CephObjectStore with EC Data Pool

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
    parameters:
      compression_mode: none
  preservePoolsOnDelete: false
  gateway:
    port: 80
    instances: 1
```

## Configuring Small Object Threshold

RGW has a concept of small objects that are stored differently. Objects below a threshold are stored in the metadata pool to avoid the overhead of EC for tiny objects:

```bash
ceph config set client.rgw rgw_max_chunk_size 1048576
```

Objects smaller than `rgw_max_chunk_size` fit entirely in the head object, which is stored in a replicated pool rather than the EC data pool. Larger objects are split: the first chunk (head object) stays in the replicated pool, while remaining tail chunks are written to the EC data pool.

## Multipart Upload Alignment

For optimal EC performance, align S3 multipart upload part sizes to the EC stripe width:

```text
EC Profile    Logical Stripe   Recommended Part Size
k=4, su=64K   256 KiB          >=256 KiB (ideally 8 MiB+)
k=8, su=64K   512 KiB          >=512 KiB (ideally 16 MiB+)
```

Example S3 CLI with aligned multipart:

```bash
# Configure multipart chunk size (64 MiB)
aws configure set default.s3.multipart_chunksize 64MB

# Upload with aligned multipart parts
aws s3 cp large-file.tar s3://my-bucket/large-file.tar \
  --endpoint-url http://rook-rgw-service:80
```

## Verifying Pool Usage

```bash
ceph df | grep buckets
```

```text
POOL                        ID   PGS   STORED   OBJECTS   USED
.rgw.buckets.data           8    128   1.2 TiB   120000   1.8 TiB
```

The `USED / STORED` ratio should be approximately your overhead factor (1.5x for k=4,m=2).

## Summary

RGW is the best fit for erasure coding in Ceph because object data pools are write-once. Configure only the `.rgw.buckets.data` pool as EC and keep all other RGW pools replicated. Rook's CephObjectStore CRD supports this natively via the `dataPool.erasureCoded` spec. Align multipart upload sizes to the EC stripe width for optimal write throughput.
