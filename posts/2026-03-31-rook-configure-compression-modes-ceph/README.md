# How to Configure Compression Modes (None, Passive, Aggressive, Force)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compression, BlueStore, Configuration

Description: Learn how to configure BlueStore compression modes in Ceph, understand the difference between none, passive, aggressive, and force modes, and choose the right mode for each pool.

---

## Understanding Compression Modes

Ceph BlueStore supports four compression modes that control when compression is applied to data being written to a pool. The mode interacts with client hints to determine final behavior.

## Compression Mode Reference

| Mode | Behavior | Client Hint Respected |
|------|----------|----------------------|
| none | No compression | N/A |
| passive | Compress if client requests it | Yes |
| aggressive | Compress unless client says no | Yes |
| force | Always compress | No |

## none Mode

Disables compression entirely. All data is stored uncompressed.

```bash
ceph osd pool set mypool compression_mode none
```

**Use when:** Data is already compressed (images, video, encrypted data) or when compression is degrading performance.

## passive Mode

Compresses data only when the client sets a compressible hint via the RADOS allocation hint mechanism (`LIBRADOS_ALLOC_HINT_FLAG_COMPRESSIBLE`). Default behavior is no compression.

```bash
ceph osd pool set mypool compression_mode passive
```

**Use when:** You want clients to opt-in to compression per object, such as in multi-tenant object storage.

## aggressive Mode

Compresses data by default. Only skips compression if the client explicitly requests no compression. This is recommended for most workloads.

```bash
ceph osd pool set mypool compression_mode aggressive
ceph osd pool set mypool compression_algorithm snappy
```

**Use when:** Most data in the pool is compressible and you want savings without full commitment.

## force Mode

Always compresses all data, ignoring client hints. Even pre-compressed data will be passed through the compression algorithm (and may become slightly larger).

```bash
ceph osd pool set mypool compression_mode force
ceph osd pool set mypool compression_algorithm zstd
```

**Use when:** You are certain all data is compressible (text logs, JSON, database dumps) and want guaranteed savings.

## Configuring via Rook CephBlockPool

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: log-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    compression_mode: force
    compression_algorithm: zstd
    compression_min_blob_size: "8192"
```

## Setting Global Default Compression Mode

To set a default compression mode for all new pools:

```bash
ceph config set osd bluestore_compression_mode aggressive
ceph config set osd bluestore_compression_algorithm snappy
```

Existing pools retain their own settings and must be updated individually.

## Checking Current Mode

```bash
ceph osd dump | grep -A 3 "pool 'mypool'"
```

Or:

```bash
ceph osd pool get mypool compression_mode
```

## Verifying Compression is Active

Write compressible data and check storage stats:

```bash
dd if=/dev/zero bs=1M count=100 | rados -p mypool put testobj -
ceph df detail | grep mypool
```

If compression is working, the `USED` column will be much less than 100MB.

## Summary

Ceph compression modes control when BlueStore applies compression: `none` disables it, `passive` requires client opt-in, `aggressive` compresses by default unless clients opt out, and `force` always compresses regardless of client hints. Use `aggressive` with `snappy` as a safe default, and `force` with `zstd` for dedicated archival or log pools where all content is compressible.
