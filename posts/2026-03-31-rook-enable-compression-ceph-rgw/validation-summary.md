# Validation Summary: How to Enable Compression for Ceph RGW

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph object storage compression (zstd, snappy, zlib)
- radosgw-admin CLI
- Rook Ceph Operator (CephObjectStore CRD)
- Kubernetes (kubectl, toolbox pod)
- BlueStore pool-level compression

## Sources Consulted
- Ceph official documentation: RGW Compression — https://docs.ceph.com/en/latest/radosgw/compression/
- Ceph official documentation: radosgw-admin CLI reference
- Rook documentation: CephObjectStore CRD — https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/

## Issues Found

### 1. Incorrect CLI flag: `--compression-type` should be `--compression`
**What was wrong:** All `radosgw-admin zone placement modify` commands used `--compression-type=<algo>` as the flag. The correct flag per the official Ceph documentation is `--compression=<algo>`.
**What was changed:** Replaced `--compression-type` with `--compression` in all five occurrences (zone-wide enable, per-placement enable for snappy and zstd, disable, and Rook toolbox example).
**Why:** The `--compression-type` flag is not recognized by `radosgw-admin`. Using it would result in the compression setting not being applied.

### 2. Invalid subcommand: `zone placement get` should be `zone placement list`
**What was wrong:** The verification command used `radosgw-admin zone placement get` which is not a documented subcommand of `radosgw-admin`.
**What was changed:** Replaced with `radosgw-admin zone placement list` with appropriate jq filtering to select the target placement by key.
**Why:** The documented subcommands are `zone placement add`, `zone placement modify`, `zone placement rm`, and `zone placement list`. Using `get` would produce an error.

### 3. Incorrect jq path for compression field
**What was wrong:** The jq filter `.compression_type` assumed compression_type is a top-level field in the placement output. In reality, it is nested inside `.val.storage_classes.STANDARD.compression_type`.
**What was changed:** Updated the jq filter to `.[] | select(.key=="default-placement") | .val.storage_classes.STANDARD.compression_type` to match the actual JSON output structure.
**Why:** The original jq filter would return `null` instead of the configured compression algorithm.

## Review Notes
- The post lists three compression algorithms (zlib, snappy, zstd) but omits `lz4`, which is also supported by Ceph RGW. The three listed are the most commonly used, so this is acceptable but could be noted in a future update.
- The Rook CephObjectStore YAML configures BlueStore pool-level compression (`compression_mode`, `compression_algorithm`), which operates at the OSD layer. This is a different compression layer than RGW-level compression configured via `radosgw-admin`. Both are valid approaches to reduce storage, but they work at different levels. The post could benefit from a brief note distinguishing these two layers in a future revision.
- The official Ceph documentation examples include `--storage-class STANDARD` in the `zone placement modify` command. The blog post omits this flag, which defaults to STANDARD. This is acceptable for most use cases but worth noting for environments with custom storage classes.
- The `bucket stats` output interpretation is a reasonable simplification. The actual output structure varies by Ceph version.
