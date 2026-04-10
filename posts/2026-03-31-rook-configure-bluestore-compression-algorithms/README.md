# How to Configure BlueStore Compression Algorithms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, Compression, Storage Efficiency

Description: Learn how to configure BlueStore compression algorithms in Ceph, choose between snappy, zlib, lz4, and zstd, and apply them at the pool or global level.

---

## BlueStore Compression Overview

BlueStore supports inline compression, compressing data before writing it to disk. This can reduce storage consumption by 30-70% for compressible workloads. The algorithm is configured independently from the compression mode.

## Supported Algorithms

| Algorithm | Speed | Ratio | Best For |
|-----------|-------|-------|----------|
| snappy | Fastest | Moderate | General workloads, NVMe |
| lz4 | Very Fast | Moderate | High-throughput workloads |
| zlib | Moderate | Good | HDD-based cold data |
| zstd | Moderate | Excellent | Cold data, archival |

## Setting the Compression Algorithm Globally

```bash
ceph config set global bluestore_compression_algorithm snappy
```

Or per OSD class:

```bash
ceph config set osd bluestore_compression_algorithm lz4
```

## Setting the Algorithm Per Pool

```bash
ceph osd pool set mypool compression_algorithm zstd
```

Verify:

```bash
ceph osd pool get mypool compression_algorithm
```

## Applying via Rook CephBlockPool

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: mypool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    compression_mode: aggressive
    compression_algorithm: zstd
```

Apply:

```bash
kubectl apply -f pool.yaml
```

## Testing Algorithm Performance

Run a quick benchmark comparing algorithms. First, set snappy and write data:

```bash
ceph osd pool set testpool compression_algorithm snappy
rados -p testpool bench 30 write --no-cleanup
```

Then switch to zstd and compare:

```bash
ceph osd pool set testpool compression_algorithm zstd
rados -p testpool bench 30 write --no-cleanup
```

Check pool stats for raw vs stored bytes:

```bash
ceph df detail | grep testpool
```

## Choosing the Right Algorithm

Use `snappy` for Kubernetes block storage where latency matters. Use `zstd` for object storage or archival pools where compression ratio is more important than speed. Use `lz4` as a middle ground for mixed workloads.

## Summary

BlueStore compression algorithm selection balances speed against compression ratio. Snappy and lz4 are best for latency-sensitive block workloads, while zstd delivers higher ratios for cold or archival data. Configure the algorithm globally with `ceph config set` or per pool using `ceph osd pool set`, and validate with `ceph df detail` to measure storage savings.
