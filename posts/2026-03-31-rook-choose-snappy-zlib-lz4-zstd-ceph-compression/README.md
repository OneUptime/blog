# How to Choose Between Snappy, Zlib, LZ4, and Zstd for Ceph Compression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compression, Snappy, LZ4, ZSTD, Performance

Description: Learn how to choose the right compression algorithm for your Ceph workload by comparing snappy, zlib, lz4, and zstd on speed, compression ratio, and CPU usage.

---

## Overview of Ceph Compression Algorithms

Ceph BlueStore supports four compression algorithms, each with different tradeoffs:

| Algorithm | Compress Speed | Decompress Speed | Ratio | CPU Usage |
|-----------|---------------|-----------------|-------|-----------|
| snappy | ~500 MB/s | ~1.7 GB/s | ~2.0x | Low |
| lz4 | ~700 MB/s | ~4.3 GB/s | ~1.8x | Very Low |
| zlib | ~100 MB/s | ~400 MB/s | ~2.7x | High |
| zstd | ~350 MB/s | ~1.2 GB/s | ~2.9x | Medium |

## When to Use Snappy

Snappy is Google's compression format, optimized for speed over ratio. It is the default in Ceph.

**Best for:**
- General-purpose block storage (Kubernetes PVCs)
- Databases and transactional workloads
- NVMe-backed OSDs where CPU is the bottleneck

```bash
ceph osd pool set mypool compression_algorithm snappy
```

## When to Use LZ4

LZ4 is the fastest compression algorithm supported by Ceph. It has a slightly lower ratio than snappy but significantly faster decompression.

**Best for:**
- Read-heavy workloads
- Real-time analytics
- High-throughput streaming data

```bash
ceph osd pool set mypool compression_algorithm lz4
```

## When to Use Zlib

Zlib produces good compression ratios but is the slowest option. It is rarely the best choice for Ceph unless you are severely storage-constrained.

**Best for:**
- Cold storage where write speed does not matter
- Compliance archives accessed rarely
- Small clusters where CPU is abundant

```bash
ceph osd pool set mypool compression_algorithm zlib
```

## When to Use Zstd

Zstd (Zstandard) provides the best compression ratio at acceptable speed. It is the best choice for archival and object storage.

**Best for:**
- Ceph RGW object storage pools
- Log archival
- Backup repositories
- Any workload with highly compressible data (text, JSON, CSV)

```bash
ceph osd pool set mypool compression_algorithm zstd
```

## Benchmarking Your Workload

Test your actual data compressibility with zstd before choosing:

```bash
zstd -b -e9 /tmp/sample-data.bin
```

Write a pool benchmark to compare algorithms:

```bash
for algo in snappy lz4 zlib zstd; do
  ceph osd pool set testpool compression_algorithm $algo
  echo "=== $algo ==="
  rados -p testpool bench 30 write --no-cleanup -b 4096
  ceph df detail | grep testpool
  rados -p testpool cleanup
done
```

## Algorithm Selection by Use Case

```text
Block Storage (Kubernetes PVC)  --> snappy
Object Storage (cold data)      --> zstd
Log archives                    --> zstd
Databases                       --> snappy or lz4
Video/Images (pre-compressed)   --> none
```

## Summary

Choose lz4 for maximum throughput and read-heavy workloads, snappy for general-purpose block storage, zstd for archival and object storage where compression ratio matters, and avoid zlib unless storage costs are extreme. Always benchmark with representative data samples since real-world compression ratios vary significantly by content type.
