# How to Set Pool Compression Mode in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compression, Storage, Kubernetes

Description: Configure pool-level compression in Rook using None, Passive, Aggressive, or Force modes to optimize storage capacity and I/O performance.

---

## Overview

Ceph BlueStore supports inline data compression at the pool level. Rook exposes this capability through the `CephBlockPool` CRD. By setting a compression mode, you can reduce the physical space consumed by compressible data while trading some CPU cycles for compression and decompression.

## Compression Modes Explained

Ceph supports four compression modes:

- `none` - Compression is disabled (default). Data is stored as-is.
- `passive` - Compress data only if the client requests it via a hint.
- `aggressive` - Compress data unless the client explicitly hints not to.
- `force` - Always compress all data regardless of client hints.

## Setting Compression Mode in a CephBlockPool

Define the compression mode in the `spec.parameters` section of a `CephBlockPool`:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: compressed-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    compression_mode: aggressive
    compression_algorithm: lz4
```

Apply the manifest:

```bash
kubectl apply -f compressed-pool.yaml
```

## Choosing a Compression Algorithm

BlueStore supports multiple compression algorithms. Common options include:

| Algorithm | Speed | Ratio |
|-----------|-------|-------|
| lz4       | Fast  | Moderate |
| snappy    | Fast  | Low-Moderate |
| zlib      | Slow  | High |
| zstd      | Medium | High |

For most workloads, `lz4` offers a good balance of speed and compression ratio:

```yaml
parameters:
  compression_mode: aggressive
  compression_algorithm: lz4
```

For archival workloads where space matters more than latency:

```yaml
parameters:
  compression_mode: force
  compression_algorithm: zstd
```

Note that the Ceph documentation warns zstd is not recommended for BlueStore due to high CPU overhead when compressing small amounts of data. Consider `zlib` as an alternative if CPU usage is a concern.

## Verifying Compression is Active

Check the pool configuration using the Ceph toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get compressed-pool compression_mode
```

To see compression statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool stats compressed-pool
```

Check BlueStore compression statistics on an OSD:

```bash
kubectl -n rook-ceph exec -it rook-ceph-osd-0-<hash> -- \
  ceph daemon osd.0 perf dump | grep compress
```

## Updating Compression on an Existing Pool

You can change the compression mode on an existing pool by updating the `CephBlockPool` spec:

```yaml
spec:
  parameters:
    compression_mode: none
```

Apply the change:

```bash
kubectl apply -f compressed-pool.yaml
```

Note that changing compression mode affects only new writes; existing data is not retroactively compressed or decompressed.

## Summary

Rook exposes Ceph BlueStore compression through the `parameters` field of `CephBlockPool`. Choose `aggressive` or `force` for general workloads with compressible data, and pair it with `lz4` for low-latency environments or `zstd` for maximum compression. Changes to compression mode are applied immediately to new writes and take effect without restarting OSDs.
