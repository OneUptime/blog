# How to Enable Compression for Ceph Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compression, Pool, Storage Efficiency

Description: Learn how to enable inline compression for Ceph storage pools using BlueStore, configure compression modes and algorithms, and measure storage savings from compression.

---

## Why Enable Pool Compression?

BlueStore supports inline compression that operates transparently on data before it is written to disk. Enabling compression on the right pools can reduce storage consumption by 30-70% for text, logs, databases, and media content while adding minimal CPU overhead on modern hardware.

## Prerequisites

- Ceph cluster with BlueStore OSDs (default since Luminous)
- Pools already created

## Checking Current Compression Settings

```bash
ceph osd pool get mypool compression_mode
ceph osd pool get mypool compression_algorithm
```

## Enabling Compression on an Existing Pool

```bash
ceph osd pool set mypool compression_mode aggressive
ceph osd pool set mypool compression_algorithm snappy
```

Compression modes:
- `none` - no compression
- `passive` - compress if clients request it
- `aggressive` - compress unless clients request no compression
- `force` - compress all data regardless of client request

## Enabling Compression When Creating a Pool

```bash
ceph osd pool create compressed-logs 32 32 replicated \
  --bulk

ceph osd pool set compressed-logs compression_mode force
ceph osd pool set compressed-logs compression_algorithm zstd
```

## Enabling via Rook CephBlockPool

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: compressed-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  compressionMode: aggressive
  parameters:
    compression_algorithm: snappy
```

Apply:

```bash
kubectl apply -f pool.yaml
```

## Enabling Compression on a CephFS Pool

```bash
# Get CephFS data pool name
ceph fs ls

# Enable compression on the data pool
ceph osd pool set cephfs_data compression_mode aggressive
ceph osd pool set cephfs_data compression_algorithm lz4
```

## Measuring Compression Savings

Check pool statistics before and after enabling compression:

```bash
ceph df detail | grep -A 5 "mypool"
```

Look at:
- `STORED` - logical data stored (reflects compression savings)
- `USED` - raw bytes on disk (includes replication factor)
- `USED COMPR` - size of compressed data on disk
- `UNDER COMPR` - original size of data before compression

Write test data and compare:

```bash
# Write compressible test data for 30 seconds
rados -p mypool bench 30 write --no-cleanup

# Check pool usage
ceph df detail | grep mypool
```

## Disabling Compression

```bash
ceph osd pool set mypool compression_mode none
```

Note: disabling compression does not re-expand already compressed data. New writes will be uncompressed.

## Summary

Enabling BlueStore compression on Ceph pools is as simple as setting `compression_mode` and `compression_algorithm` with `ceph osd pool set`. Use `aggressive` mode with `snappy` or `lz4` for active workloads, and `force` with `zstd` for cold or archival pools. Monitor actual vs raw bytes with `ceph df detail` to quantify savings, and disable compression for already-compressed data like JPEG images or video files.
