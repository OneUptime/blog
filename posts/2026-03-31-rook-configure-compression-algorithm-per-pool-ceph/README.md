# How to Configure compression_algorithm Per Pool in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compression, Pool, BlueStore

Description: Learn how to configure compression algorithms per Ceph pool including snappy, zlib, zstd, and lz4, and how to choose the right algorithm based on your data type and performance requirements.

---

## Compression in BlueStore

Ceph BlueStore (the default OSD backend) supports inline compression at the pool level. Compression can significantly reduce storage usage for compressible data like logs, backups, and text files, with minimal impact on incompressible data like JPEG images or already-compressed archives.

Supported algorithms:

| Algorithm | Speed | Ratio | Best For |
|-----------|-------|-------|---------|
| snappy | Fastest | Moderate | General purpose, low latency workloads |
| lz4 | Very fast | Moderate | High IOPS workloads |
| zlib | Slow | Best | Archival, cold storage |
| zstd | Balanced | Good | Balanced workloads |

## Configure via Rook CRD

Set compression algorithm in the CephBlockPool spec:

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
  parameters:
    compression_algorithm: snappy
    compression_mode: aggressive
```

For CephFilesystem data pools:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  dataPools:
    - name: data0
      replicated:
        size: 3
      parameters:
        compression_algorithm: zstd
        compression_mode: passive
```

## Set Compression via CLI

For existing pools, change the algorithm without downtime:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Set compression algorithm for a pool
  ceph osd pool set my-pool compression_algorithm snappy

  # View current compression settings
  ceph osd pool get my-pool compression_algorithm
  ceph osd pool get my-pool compression_mode
"
```

## Algorithm Benchmarks

Before choosing an algorithm, benchmark compression ratio and speed on your data. Note that `zstd` and `lz4` have CLI tools, while `zlib` compression can be tested via `gzip` (which uses zlib internally) and `snappy` has no standard CLI tool:

```bash
# Compare compression ratio for a sample file using available CLI tools
echo -n "zstd: " && zstd -c /var/log/syslog | wc -c
echo -n "lz4:  " && lz4 -c /var/log/syslog | wc -c
echo -n "zlib: " && gzip -c /var/log/syslog | wc -c
echo -n "orig: " && wc -c < /var/log/syslog
```

For a real-world comparison across all algorithms including snappy, use `rados bench` on pools configured with each algorithm:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Write benchmark with snappy compression
  rados bench -p compressed-pool 30 write --no-cleanup

  # Compare with an uncompressed pool
  rados bench -p uncompressed-pool 30 write --no-cleanup
"
```

## Choose Algorithm by Use Case

**snappy** - good default for most Kubernetes workloads (databases, application logs):

```yaml
parameters:
  compression_algorithm: snappy
  compression_mode: passive
```

**zstd** - better ratio for backup and archival pools where CPU trade-off is acceptable:

```yaml
parameters:
  compression_algorithm: zstd
  compression_mode: aggressive
```

**lz4** - when you need maximum throughput with minimal CPU overhead:

```yaml
parameters:
  compression_algorithm: lz4
  compression_mode: passive
```

## Monitor Compression Effectiveness

Check compression savings per pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool stats my-pool
  ceph df detail
"
```

Look for the `COMPRESS_BYTES_USED` and `COMPRESS_UNDER_BYTES` fields in `ceph df detail` to calculate actual savings.

## Summary

Configuring compression algorithms per Ceph pool in Rook uses the `compression_algorithm` parameter in CephBlockPool and CephFilesystem CRDs. Snappy provides the best latency for general workloads, lz4 suits high-IOPS scenarios, and zstd or zlib are appropriate for cold storage or backup pools where higher compression ratios justify additional CPU usage. Monitor actual compression savings with `ceph df detail` to validate the effectiveness of your chosen algorithm.
