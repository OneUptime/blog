# Validation Summary: How to Configure Compression Modes (None, Passive, Aggressive, Force)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph BlueStore compression
- Rook CephBlockPool CRD
- RADOS CLI tools
- Ceph configuration management

## Sources Consulted
- [Ceph BlueStore Configuration Reference (Reef)](https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/) -- authoritative reference for compression modes, algorithms, and bluestore config options
- [Rook CephBlockPool CRD Documentation](https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/) -- CRD spec for CephBlockPool including compression parameters
- [Rook CephBlockPool types.go source](https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go) -- confirms `compressionMode` is deprecated in favor of `parameters`
- [Ceph librados.h ALLOC_HINT_FLAG definitions](https://github.com/ceph/ceph/blob/main/src/include/rados/librados.h) -- defines LIBRADOS_ALLOC_HINT_FLAG_COMPRESSIBLE and INCOMPRESSIBLE
- [Ceph RGW Compression Documentation](https://docs.ceph.com/en/latest/radosgw/compression/) -- confirms RGW compression is server-side, not client-hint driven

## Issues Found

1. **Incorrect client hint reference for passive mode**: The post claimed passive mode is triggered via `RGW_OBJECT_CONTENT_ENCODING: compress`. This header does not exist. The actual mechanism is RADOS allocation hints set via `LIBRADOS_ALLOC_HINT_FLAG_COMPRESSIBLE` (flag value 256) in the `rados_set_alloc_hint2()` API. Fixed the description to reference the correct mechanism.

2. **Deprecated Rook CephBlockPool field**: The post used `compressionMode` as a top-level field in the CephBlockPool spec. This field is deprecated in Rook; the correct approach is to use `parameters.compression_mode` instead. Updated the YAML example to use `parameters` exclusively.

3. **Suboptimal config section target**: The post used `ceph config set global bluestore_compression_mode` and `ceph config set global bluestore_compression_algorithm`. While `global` works, these are OSD-level settings and `osd` is the canonical and more appropriate config section. Changed to `ceph config set osd`.

## Review Notes
- The four compression modes (none, passive, aggressive, force) and their behaviors are accurately described.
- The verification example using `/dev/zero` is valid as a smoke test but produces artificially high compression ratios since all-zero data is extremely compressible. This is acceptable for a quick test but readers should be aware it's not representative of real-world ratios.
- The `ceph df detail` command shows compression-specific columns (`USED COMPR` and `UNDER COMPR`) that are more informative than just the `USED` column mentioned in the post. This is a minor simplification, not an error.
- Algorithm recommendations (snappy for aggressive, zstd for force/archival) align with common Ceph community guidance.
