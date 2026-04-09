# How to Configure Pool Compression Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Compression, BlueStore, Storage Efficiency

Description: Configure Ceph BlueStore pool compression settings including algorithms, modes, and blob size thresholds to reduce storage usage for compressible data.

---

## How Ceph Compression Works

Ceph BlueStore supports inline compression at the storage level. When enabled, data is compressed before being written to disk. This is transparent to clients - they read and write uncompressed data, while BlueStore handles compression internally.

Compression is configured per-pool and applies to all objects in that pool.

## Compression Algorithms

Ceph BlueStore supports several compression algorithms:

```text
Algorithm  | Speed    | Ratio    | Notes
snappy     | Fastest  | Moderate | Default, good for general use
zlib       | Slow     | High     | Better compression, more CPU
zstd       | Moderate | High     | Good balance of speed and ratio
lz4        | Very fast| Low-Mod  | Minimal CPU overhead
```

Set the algorithm globally or per-pool:

```bash
# Set global default algorithm
ceph config set osd bluestore_compression_algorithm snappy

# Override for a specific pool
ceph osd pool set mypool compression_algorithm zstd
```

## Compression Modes

The compression mode controls when compression is applied:

```text
Mode        | Behavior
none        | No compression (default)
passive     | Compress only if client requests it (via hint)
aggressive  | Compress unless client requests no compression
force       | Always compress, regardless of client hints
```

```bash
# Enable aggressive compression on a pool
ceph osd pool set mypool compression_mode aggressive

# Use force mode for maximum compression
ceph osd pool set mypool compression_mode force

# Disable compression
ceph osd pool set mypool compression_mode none
```

## Compression Ratio Threshold

Only compress data that actually benefits from compression. The `compression_required_ratio` sets the minimum compression ratio before Ceph stores compressed data. If compression does not achieve this ratio, data is stored uncompressed:

```bash
# Only compress if compression ratio < 0.875 (saves at least 12.5%)
ceph osd pool set mypool compression_required_ratio 0.875

# More aggressive: only compress if ratio < 0.5 (saves at least 50%)
ceph osd pool set mypool compression_required_ratio 0.5
```

A ratio of 0.875 means: only keep the compressed version if compressed_size / original_size <= 0.875.

## Blob Size Settings

BlueStore stores data in "blobs." Compression blob size settings control the granularity of compression:

```bash
# Minimum blob size for compression (default 128 KiB for HDD)
ceph config set osd bluestore_compression_min_blob_size_hdd 131072

# Maximum blob size for compression (default 512 KiB for HDD)
ceph config set osd bluestore_compression_max_blob_size_hdd 524288

# For SSD (smaller blobs for better random access performance)
ceph config set osd bluestore_compression_min_blob_size_ssd 65536
ceph config set osd bluestore_compression_max_blob_size_ssd 131072
```

Larger blobs compress better but increase read amplification for small random reads.

## Complete Compression Configuration

```bash
# Configure a pool with zstd compression
ceph osd pool create compressed-pool 128 128 replicated

ceph osd pool set compressed-pool compression_algorithm zstd
ceph osd pool set compressed-pool compression_mode aggressive
ceph osd pool set compressed-pool compression_required_ratio 0.875
ceph osd pool set compressed-pool compression_min_blob_size 65536
ceph osd pool set compressed-pool compression_max_blob_size 524288
```

## Viewing Compression Settings

```bash
# View all compression settings for a pool
ceph osd pool get compressed-pool compression_algorithm
ceph osd pool get compressed-pool compression_mode
ceph osd pool get compressed-pool compression_required_ratio

# View all pool settings
ceph osd pool get compressed-pool all
```

## Measuring Compression Savings

```bash
# Compare logical vs raw bytes
ceph df detail | grep compressed-pool

# View compression statistics from OSD
ceph daemon osd.0 perf dump | grep compress

# View pool I/O statistics
ceph osd pool stats compressed-pool
```

## Best Practices for Compression

```text
Data Type              | Recommended Setting
Text, JSON, logs       | force + zstd (high compressibility)
VM disk images         | aggressive + snappy (mixed data)
Compressed files       | none (already compressed)
Video/audio            | none (not compressible)
Backup data            | aggressive + zstd
Database files         | passive + snappy (DB handles compression)
```

## Rook Configuration

In Rook, enable compression in the CephBlockPool spec:

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
```

## Summary

Ceph BlueStore pool compression is configured via `compression_algorithm` (snappy, zstd, zlib, lz4), `compression_mode` (none, passive, aggressive, force), and `compression_required_ratio` (minimum compression ratio to accept compressed data). For most workloads with compressible data, `zstd` in `aggressive` mode with a 0.875 ratio provides good space savings with acceptable CPU overhead. Data that is already compressed (images, video, pre-compressed archives) should use `none` mode to avoid wasting CPU cycles.
