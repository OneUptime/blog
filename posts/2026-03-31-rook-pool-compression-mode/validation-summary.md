# Validation Summary: How to Set Pool Compression Mode in Rook-Ceph

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph BlueStore inline compression
- Kubernetes (kubectl, CRD manifests)
- CephBlockPool and CephFilesystem custom resources
- Compression algorithms: snappy, lz4, zlib, zstd

## Sources Consulted
- Ceph documentation on BlueStore compression: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Ceph CLI reference for `ceph osd pool set/get`: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CLI reference for `ceph tell` vs `ceph daemon`: https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found

### Issue 1: `ceph daemon` used instead of `ceph tell` in monitoring section
- **What was wrong:** The post used `ceph daemon osd.0 perf dump` to check OSD-level compression stats from inside the rook-ceph-tools pod. The `ceph daemon` command connects to a local admin socket (e.g., `/var/run/ceph/*/ceph-osd.0.asok`), which is only available on the host where that OSD process runs. The tools pod does not have access to these sockets.
- **What was changed:** Replaced `ceph daemon osd.0` with `ceph tell osd.0`, which sends the command to the OSD via the Ceph monitor channel and works from any pod with monitor connectivity.

### Issue 2: `ceph osd df` misrepresented as showing compression ratio
- **What was wrong:** The command `ceph osd df | awk '{print $1, $6, $7}'` was described as showing "Overall cluster compression ratio," but `ceph osd df` displays OSD-level disk usage (ID, CLASS, WEIGHT, SIZE, RAW USE, DATA, etc.) and does not include compression statistics.
- **What was changed:** Replaced with `ceph df detail`, which outputs per-pool storage stats including `COMPRESS_BYTES_USED` and `COMPRESS_UNDER_BYTES` columns that actually show compression data.

### Issue 3: Incorrect interpretation of example `ceph df detail` output
- **What was wrong:** The post stated "This shows 12 GiB of logical data compressed from 16 GiB to 8 GiB (50% savings)." The `STORED` value (12 GiB) is the physical data on disk after compression, not the logical data size. The actual total logical data is 20 GiB (16 GiB of compressible data + 4 GiB of uncompressed data), stored as 12 GiB.
- **What was changed:** Corrected the explanation to: "This shows the pool stores 12 GiB on disk. Of that, 8 GiB is compressed data that was originally 16 GiB before compression (50% compression ratio on the compressed portion)."

## Review Notes
- The compression mode descriptions (none, passive, aggressive, force) are accurate per Ceph documentation.
- The four compression algorithms listed (snappy, lz4, zlib, zstd) are all supported by Ceph BlueStore. The speed/ratio comparison table is a reasonable generalization, though in some benchmarks lz4 can be slightly faster than snappy.
- The CephBlockPool and CephFilesystem YAML manifests use correct `ceph.rook.io/v1` API and valid field structures matching current Rook CRD specifications.
- The `compression_min_blob_size` (8192) and `compression_max_blob_size` (65536) values are valid and match the BlueStore SSD defaults.
- The guidance on when to use/avoid compression is sound: compressible data like logs and text benefits, while already-compressed or encrypted data does not.
