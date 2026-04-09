# How to Fix BLUESTORE_NO_COMPRESSION Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, Compression, Configuration

Description: Learn how to resolve the BLUESTORE_NO_COMPRESSION health warning in Ceph by enabling BlueStore inline compression for improved storage efficiency.

---

## Understanding BLUESTORE_NO_COMPRESSION

`BLUESTORE_NO_COMPRESSION` is an informational health check that fires when BlueStore compression is not configured on pools or cluster-wide. This is not a critical warning - it is a reminder that compression is available and can reduce storage usage. On clusters with compressible data workloads, enabling compression can reduce disk usage by 20-60%.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN bluestore compression is not enabled
[WRN] BLUESTORE_NO_COMPRESSION: compression is not enabled on any pool
```

## Checking Current Compression Settings

Check global compression settings:

```bash
ceph config get osd bluestore_compression_mode
```

Check per-pool compression settings:

```bash
ceph osd pool get <pool-name> compression_mode
ceph osd pool get <pool-name> compression_algorithm
```

## Enabling Compression Cluster-Wide

Set compression globally for all OSDs and pools:

```bash
# Mode: none, passive, aggressive, or force
ceph config set osd bluestore_compression_mode aggressive

# Algorithm: snappy, zlib, zstd, lz4
ceph config set osd bluestore_compression_algorithm snappy

# Minimum size to compress (bytes)
ceph config set osd bluestore_compression_min_blob_size 8192
```

Verify settings:

```bash
ceph config get osd bluestore_compression_mode
```

## Enabling Compression Per-Pool

Target specific pools with compression:

```bash
# For general-purpose pools (good balance of speed and ratio)
ceph osd pool set rbd compression_mode passive
ceph osd pool set rbd compression_algorithm snappy

# For archive/cold storage pools (maximize compression ratio)
ceph osd pool set cold-data compression_mode force
ceph osd pool set cold-data compression_algorithm zstd

# Disable compression on a specific pool
ceph osd pool set hot-data compression_mode none
```

## Choosing Compression Algorithms

| Algorithm | Speed | Ratio | Best For |
|-----------|-------|-------|----------|
| lz4 | Fastest | Low | Hot NVMe storage |
| snappy | Fast | Medium | General purpose |
| zlib | Medium | Good | Balanced workloads |
| zstd | Slower | Best | Cold/archive data |

For most Kubernetes workloads with mixed data:

```bash
ceph config set osd bluestore_compression_mode aggressive
ceph config set osd bluestore_compression_algorithm snappy
```

## Understanding Compression Modes

- `none`: No compression
- `passive`: Compress only if the client hints that data is compressible
- `aggressive`: Compress unless the client hints data is incompressible
- `force`: Always compress regardless of hints

## In Rook-Ceph

Configure compression in the CephCluster or per-pool via CephBlockPool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  compressionMode: aggressive
```

Apply:

```bash
kubectl -n rook-ceph apply -f pool.yaml
```

Or set cluster-wide via the `rook-config-override` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    bluestore_compression_mode = aggressive
    bluestore_compression_algorithm = snappy
```

## Measuring Compression Effectiveness

After enabling compression, check overall pool usage:

```bash
ceph df detail
```

To view BlueStore compression statistics on a specific OSD, use the perf counters:

```bash
ceph daemon osd.<id> perf dump bluestore | grep compress
```

Look for `bluestore_compressed_original` (original data size) and `bluestore_compressed_allocated` (size after compression) to calculate the compression ratio.

## Muting the Warning Without Enabling Compression

If your data is incompressible (encrypted, already compressed images):

```bash
ceph health mute BLUESTORE_NO_COMPRESSION
```

To persist the mute across Ceph restarts (Ceph Pacific 16.2.1+):

```bash
ceph health mute BLUESTORE_NO_COMPRESSION --sticky
```

## Summary

`BLUESTORE_NO_COMPRESSION` is an advisory warning that BlueStore compression is not enabled. Enable it globally with `ceph config set osd bluestore_compression_mode aggressive` or per-pool for targeted efficiency gains. Choose `snappy` for speed-sensitive workloads or `zstd` for maximum compression on cold data. In Rook, set compression via the CephBlockPool spec or the `rook-config-override` ConfigMap. If your data is incompressible, mute the warning.
