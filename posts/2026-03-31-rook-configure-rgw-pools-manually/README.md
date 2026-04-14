# How to Configure RGW Pools Manually

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Pool, Configuration, Object Storage

Description: Learn how to manually configure and initialize Ceph RGW pools to customize replication, placement groups, and pool names for production deployments.

---

## Overview

By default, Ceph RGW automatically creates a standard set of pools when first initialized. In production environments, you may want to pre-create these pools with custom settings - specific placement group counts, replication factors, or erasure coding. This guide covers the required pools, their purposes, and how to configure them manually.

## Default RGW Pools

When initialized, RGW creates the following pools:

| Pool Name | Purpose |
|-----------|---------|
| `.rgw.root` | Zone and realm metadata |
| `default.rgw.control` | Notify/control objects |
| `default.rgw.meta` | User metadata |
| `default.rgw.log` | Operation log |
| `default.rgw.buckets.index` | Bucket object index |
| `default.rgw.buckets.data` | Object data |
| `default.rgw.buckets.non-ec` | Multipart upload metadata (data_extra_pool) |
| `default.rgw.otp` | MFA/TOTP token storage |

## Pre-Creating Pools

Create and configure pools before initializing RGW:

```bash
# Create index pool (replicated for performance)
ceph osd pool create default.rgw.buckets.index replicated
ceph osd pool set default.rgw.buckets.index size 3
ceph osd pool set default.rgw.buckets.index min_size 2

# Create data pool (optionally erasure coded for capacity)
ceph osd pool create default.rgw.buckets.data erasure my-ec-profile
ceph osd pool set default.rgw.buckets.data allow_ec_overwrites true

# Create remaining replicated pools
for pool in .rgw.root default.rgw.control default.rgw.meta \
            default.rgw.log default.rgw.buckets.non-ec default.rgw.otp; do
  ceph osd pool create $pool replicated
  ceph osd pool set $pool size 3
done

# Tag all pools for RGW application
for pool in .rgw.root default.rgw.control default.rgw.meta \
            default.rgw.log default.rgw.buckets.index \
            default.rgw.buckets.data default.rgw.buckets.non-ec \
            default.rgw.otp; do
  ceph osd pool application enable $pool rgw
done
```

## Using Pre-Created Pools with RGW

RGW automatically detects and uses pools that already exist. If you pre-create the pools listed above before starting the RGW daemon, it will use them without attempting to recreate them. No additional configuration is needed - simply ensure all required pools exist before RGW initialization.

## Customizing Pool Names in Zone Configuration

If you use non-default pool names, update the zone to reference them:

```bash
# Edit zone to use custom pool names
radosgw-admin zone modify \
  --rgw-zone=us-east \
  --access-key=sync-user-key \
  --secret=sync-user-secret

# Or use a zone JSON file for full customization
radosgw-admin zone get --rgw-zone=us-east > zone.json
# Edit zone.json to update pool names
radosgw-admin zone set --infile=zone.json
radosgw-admin period update --commit
```

## Rook: Custom Pool Configuration in CephObjectStore

In Rook, customize metadata and data pools in the `CephObjectStore`:

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
    parameters:
      compression_mode: aggressive
  dataPool:
    erasureCoded:
      dataChunks: 4
      codingChunks: 2
    parameters:
      allow_ec_overwrites: "true"
  preservePoolsOnDelete: false
  gateway:
    port: 80
    instances: 2
```

## Verifying Pool Configuration

```bash
# List all RGW pools
ceph osd pool ls | grep rgw

# Check pool replication and PG count
ceph osd pool get default.rgw.buckets.data size
ceph osd pool get default.rgw.buckets.data pg_num

# Verify application tag
ceph osd pool application get default.rgw.buckets.data
```

## Summary

Manual RGW pool configuration gives you full control over replication factors, erasure coding profiles, and placement group counts. Pre-create pools with `ceph osd pool create` before RGW initialization, tag them with the `rgw` application, and optionally disable auto pool creation. In Rook, the `CephObjectStore` spec handles pool creation with custom parameters via the metadata and data pool sections.
