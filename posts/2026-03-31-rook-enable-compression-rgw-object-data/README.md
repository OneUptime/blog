# How to Enable Compression for RGW Object Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Compression, Object Storage, S3

Description: Learn how to enable transparent compression for RADOS Gateway object data in Ceph, configure compression plugins, and measure storage savings for S3-compatible workloads.

---

## RGW Compression Architecture

Ceph RGW supports compression at two levels:

1. **Pool-level compression** - BlueStore compresses all data written to the pool, including RGW objects
2. **RGW-level compression** - RGW compresses objects before storing them, using a configurable plugin

RGW-level compression is more flexible because it can be configured per storage class and integrated with RGW's lifecycle management.

## Method 1: Pool-Level Compression (Simpler)

Enable BlueStore compression on the RGW data pool:

```bash
# Find the RGW data pool
ceph osd lspools | grep "rgw"

# Enable compression
ceph osd pool set default.rgw.buckets.data compression_mode aggressive
ceph osd pool set default.rgw.buckets.data compression_algorithm zstd
```

This transparently compresses all RGW object data without RGW configuration changes.

## Method 1b: Pool-Level Compression via Rook CephObjectStore

For Rook-managed clusters, configure BlueStore pool-level compression via the CephObjectStore CR:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPool:
    failureDomain: host
    replicated:
      size: 3
    parameters:
      compression_mode: aggressive
      compression_algorithm: zstd
```

This sets BlueStore compression on the underlying data pool, the same as Method 1 but configured declaratively through Rook.

## Method 2: RGW-Level Compression Plugin

RGW supports a compression plugin that compresses data at the RGW daemon tier before writing to the pool. This is configured per zone placement target:

```bash
radosgw-admin zone placement modify \
  --rgw-zone default \
  --placement-id default-placement \
  --compression zstd
```

It is typical to enable either pool-level or RGW-level compression, not both. RGW-level compression is preferable when RGW nodes have more available CPU than OSD nodes.

## Configuring Compression per Storage Class

For fine-grained control, use RGW storage classes:

```bash
radosgw-admin zone placement modify \
  --rgw-zone default \
  --placement-id default-placement \
  --storage-class STANDARD \
  --compression zstd
```

Verify the configuration:

```bash
radosgw-admin zonegroup get | jq '.placement_targets[].val.storage_classes'
```

## Testing Compression with AWS CLI

Upload a compressible object:

```bash
cat > /tmp/test.json << 'EOF'
{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}
EOF

aws s3 cp /tmp/test.json s3://mybucket/test.json \
  --endpoint-url https://rgw.example.com

# Check stored size vs original
aws s3api head-object --bucket mybucket --key test.json \
  --endpoint-url https://rgw.example.com
```

## Monitoring RGW Compression Savings

```bash
ceph df detail | grep "rgw.buckets"
```

Compare `UNDER COMPR` vs `USED COMPR` columns for the RGW data pool.

Using radosgw-admin:

```bash
radosgw-admin bucket stats --bucket mybucket
```

## Handling Pre-Compressed Content

If clients upload already-compressed content (zip, gz), disable compression for those object prefixes using lifecycle rules or direct clients to use a COMPRESSED storage class.

## Summary

Enable RGW object compression either at the pool level via `ceph osd pool set` with BlueStore compression settings, or at the RGW tier using `radosgw-admin zone placement modify` with per-storage-class configuration. Pool-level compression with zstd in `aggressive` mode is the simplest approach and works transparently for all RGW object data. Monitor savings with `ceph df detail` on the RGW data pool.
