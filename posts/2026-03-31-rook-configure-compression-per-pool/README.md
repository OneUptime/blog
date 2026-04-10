# How to Configure Different Compression Settings Per Pool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Compression, BlueStore, Kubernetes, Performance

Description: Learn how to configure Ceph BlueStore compression on a per-pool basis, choosing between no compression, passive, aggressive, and force modes to optimize storage efficiency.

---

## Ceph BlueStore Compression

Ceph BlueStore (the default OSD backend) supports transparent data compression. Compression can be configured per pool, allowing you to apply aggressive compression to archival data while keeping it disabled for latency-sensitive workloads.

## Compression Modes

BlueStore supports four compression modes:

| Mode | Behavior |
|---|---|
| `none` | No compression (default) |
| `passive` | Compress only if client hints that data is compressible |
| `aggressive` | Compress unless client hints that data is incompressible |
| `force` | Always compress, ignoring client hints |

## Setting Compression on a Pool

Configure compression when creating the pool via the CephBlockPool spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: archive-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    compression_mode: "aggressive"
    compression_algorithm: "snappy"
    compression_min_blob_size: "128"
    compression_max_blob_size: "65536"
```

## Choosing a Compression Algorithm

Ceph supports multiple algorithms:

```bash
# Available algorithms: snappy, zlib, zstd, lz4
# snappy - fastest, lower compression ratio
# lz4 - fast, good balance
# zstd - best compression ratio, higher CPU usage
# zlib - good compression, moderate CPU
```

Set the algorithm on an existing pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set archive-pool compression_algorithm zstd

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set archive-pool compression_mode aggressive
```

## Disabling Compression for Latency-Sensitive Pools

For database or high-IOPS workloads, disable compression entirely:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set db-pool compression_mode none
```

Or in the CephBlockPool spec:

```yaml
spec:
  replicated:
    size: 3
  parameters:
    compression_mode: "none"
```

## Measuring Compression Effectiveness

Check how much space compression is saving:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail
```

Look at the `USED COMPR` and `UNDER COMPR` columns. The ratio between them indicates compression effectiveness.

For per-OSD compression statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 perf dump | grep compress
```

## Recommended Settings by Workload

```bash
# Database pools - no compression (random data compresses poorly, adds latency)
ceph osd pool set postgres-pool compression_mode none

# Log/metric storage - aggressive snappy (time-series data compresses well)
ceph osd pool set metrics-pool compression_mode aggressive
ceph osd pool set metrics-pool compression_algorithm snappy

# Backup/archive pools - aggressive zstd (maximize space savings)
ceph osd pool set backup-pool compression_mode aggressive
ceph osd pool set backup-pool compression_algorithm zstd
```

## Summary

Per-pool compression in Ceph BlueStore lets you balance storage efficiency against CPU overhead based on each workload's characteristics. Disable compression for latency-sensitive workloads, use snappy or lz4 for streaming/logging use cases, and apply zstd with aggressive mode for archival pools where maximum space savings justify higher CPU usage. Always measure the actual compression ratio achieved to validate your configuration choices.
