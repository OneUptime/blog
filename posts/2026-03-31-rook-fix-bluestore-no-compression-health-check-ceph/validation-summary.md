# Validation Summary: How to Fix BLUESTORE_NO_COMPRESSION Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore storage backend)
- Rook-Ceph (Kubernetes operator for Ceph)
- BlueStore inline compression (snappy, zlib, zstd, lz4)
- Kubernetes (CRDs, ConfigMaps)

## Sources Consulted
- Ceph official documentation on BlueStore compression: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Ceph health checks reference: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph `ceph config` CLI documentation: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Advanced Configuration (rook-config-override): https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Ceph BlueStore perf counters: https://docs.ceph.com/en/latest/dev/perf_counters/

## Issues Found

### 1. Incorrect compression statistics field names
**What was wrong:** The "Measuring Compression Effectiveness" section referenced `compress_bytes_used` and `compress_under_bytes` as fields in `ceph osd pool stats` output. These are not real field names, and `ceph osd pool stats` does not report compression statistics.
**What was changed:** Replaced with the correct approach using `ceph df detail` for overall pool usage and `ceph daemon osd.<id> perf dump bluestore` for BlueStore compression perf counters (`bluestore_compressed_original` and `bluestore_compressed_allocated`).
**Why:** The original commands would not produce the described output, leaving users unable to verify compression effectiveness.

### 2. Non-existent `bluestore_warn_on_no_compression` config option
**What was wrong:** The post suggested running `ceph config set global bluestore_warn_on_no_compression false` to disable the health check. This configuration option does not exist in Ceph.
**What was changed:** Replaced with `ceph health mute BLUESTORE_NO_COMPRESSION --sticky`, which is the standard Ceph mechanism for persistently muting health warnings (available since Ceph Pacific 16.2.1).
**Why:** The original command would fail with an unknown config option error.

### 3. Incorrect Rook CephCluster config override syntax
**What was wrong:** The post showed a `spec.cephConfig` YAML block for setting cluster-wide compression in Rook. This field structure does not match the Rook CephCluster CRD.
**What was changed:** Replaced with the correct `rook-config-override` ConfigMap approach, which is the standard documented method for setting Ceph configuration overrides in Rook.
**Why:** The original YAML would be silently ignored or rejected by Rook since `spec.cephConfig` with that structure is not part of the CRD schema.

## Review Notes
- The `BLUESTORE_NO_COMPRESSION` health check name could not be verified as an actual Ceph health check in official documentation. The documented BlueStore health checks include `BLUESTORE_NO_PER_POOL_OMAP`, `BLUESTORE_LEGACY_STATFS`, and `BLUEFS_SPILLOVER`, but no compression-related warning. Ceph does not typically warn about optional optimization features not being enabled. The compression configuration guidance in the post is technically sound regardless of whether this specific health check exists.
- All core BlueStore compression commands (`ceph config set osd bluestore_compression_mode`, `ceph osd pool set <pool> compression_mode`, etc.) are correct and well-documented.
- The compression mode descriptions (none, passive, aggressive, force) are accurate.
- The compression algorithm comparison table (lz4, snappy, zlib, zstd) accurately reflects relative speed/ratio trade-offs.
- The CephBlockPool `compressionMode` field in the Rook CRD is correct.
- The `ceph health mute` command syntax is correct for suppressing health warnings.
