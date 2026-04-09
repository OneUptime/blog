# How to Enable Compression for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Compression, Storage, Optimization

Description: Learn how to enable and configure transparent compression for Ceph RGW object storage to reduce storage capacity usage for compressible data.

---

## Overview

Ceph RGW supports transparent server-side compression of stored objects. When enabled, objects are compressed before being written to RADOS and decompressed on retrieval. This is transparent to S3 clients and can significantly reduce storage usage for log files, text data, and other compressible content.

## Supported Compression Algorithms

Ceph RGW supports these compression algorithms:
- `zlib` - good compression ratio, moderate CPU usage
- `snappy` - fast compression/decompression, lower ratio
- `zstd` - excellent ratio and speed, best overall choice

## Enabling Compression Zone-Wide

Configure compression at the zone placement level so it applies to all objects:

```bash
# Enable zstd compression on the default placement
radosgw-admin zone placement modify \
  --rgw-zone=us-east \
  --placement-id=default-placement \
  --compression=zstd

# Commit the change
radosgw-admin period update --commit

# Verify the configuration
radosgw-admin zone placement list \
  --rgw-zone=us-east | jq '.[] | select(.key=="default-placement") | .val.storage_classes.STANDARD.compression_type'
```

## Enabling Compression on a Specific Placement

If you have multiple placements, configure compression per target:

```bash
# Enable snappy on a "fast" placement for real-time data
radosgw-admin zone placement modify \
  --rgw-zone=us-east \
  --placement-id=fast-storage \
  --compression=snappy

# Enable zstd on "cold" placement for archival
radosgw-admin zone placement modify \
  --rgw-zone=us-east \
  --placement-id=cold-storage \
  --compression=zstd

radosgw-admin period update --commit
```

## Disabling Compression

```bash
# Set compression type to empty string to disable
radosgw-admin zone placement modify \
  --rgw-zone=us-east \
  --placement-id=default-placement \
  --compression=""

radosgw-admin period update --commit
```

Note: existing compressed objects remain compressed; only new uploads are affected.

## Verifying Compression Savings

Check compression statistics:

```bash
# Get bucket stats including compressed size
radosgw-admin bucket stats --bucket=mybucket

# Output shows:
# "rgw.main": {
#   "size": 1073741824,       <- actual stored (compressed)
#   "size_rounded": ...,
#   "num_objects": 1000
# }
```

Compare with raw file sizes to calculate savings. You can also enable RGW object stats logging to capture per-object compression metadata.

## Rook: Enabling Compression in CephObjectStore

In Rook, configure compression at the storage pool level using Ceph pool compression settings:

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
    replicated:
      size: 3
    parameters:
      compression_mode: aggressive
      compression_algorithm: zstd
  gateway:
    port: 80
    instances: 2
```

Alternatively, use the toolbox to set zone-level compression:

```bash
TOOLBOX=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n rook-ceph exec -it $TOOLBOX -- \
  radosgw-admin zone placement modify \
    --rgw-zone=us-east \
    --placement-id=default-placement \
    --compression=zstd

kubectl -n rook-ceph exec -it $TOOLBOX -- \
  radosgw-admin period update --commit
```

## Choosing the Right Algorithm

| Algorithm | Ratio | Speed | Best For |
|-----------|-------|-------|---------|
| zstd | High | Fast | General purpose, archival |
| snappy | Medium | Very fast | Real-time, latency-sensitive |
| zlib | High | Moderate | Maximum compression, cold data |

## Summary

Ceph RGW transparent compression reduces storage costs for compressible data without requiring client-side changes. Enable compression at the zone placement level using `radosgw-admin zone placement modify`, choosing between zstd, snappy, or zlib based on your CPU and compression ratio requirements. In Rook, configure compression through the CephObjectStore data pool parameters. Monitor bucket stats to measure actual savings.
