# Validation Summary: How to Configure BlueStore Settings in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph BlueStore (OSD storage backend)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (CephCluster CRD, ConfigMap, kubectl)
- Ceph compression (snappy, lz4)
- Ceph checksumming (crc32c, xxhash32)

## Sources Consulted
- Ceph official documentation on BlueStore configuration: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Rook documentation on CephCluster CRD storage configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#storage-selection-settings
- Ceph documentation on compression: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Ceph documentation on `ceph tell` vs `ceph daemon`: https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found

### 1. Reversed `metadataDevice` in first YAML example
- **What was wrong:** The first CephCluster YAML example had `metadataDevice: "sda"` configured on the NVMe device (`nvme0n1`). This means the NVMe drive would store its BlueStore DB/WAL metadata on the HDD, which is the opposite of the intended configuration. The `metadataDevice` option should be set on the data device (HDD) and point to the fast device (NVMe).
- **What was changed:** Moved the `metadataDevice: "nvme0n1"` config onto the `sda` device entry and removed the separate `nvme0n1` device entry, so that `sda` is the data device with metadata placed on the NVMe.
- **Why:** In Rook, `metadataDevice` specifies where to place the BlueStore DB/WAL for that OSD's data device. It must be set on the data device pointing to the faster metadata device.

### 2. Incorrect comment for `compression_min_blob_size`
- **What was wrong:** The comment said "Set minimum compression ratio threshold" but the parameter `compression_min_blob_size` controls the minimum object/blob size below which compression is not attempted, not a ratio threshold. The ratio threshold parameter is `compression_required_ratio`.
- **What was changed:** Updated the comment to "Set minimum blob size for compression to be applied".
- **Why:** The original comment was misleading about what the parameter controls.

### 3. `ceph daemon` command won't work from the Rook tools pod
- **What was wrong:** The command `ceph daemon osd.0 perf dump` was run via the `rook-ceph-tools` deployment. `ceph daemon` requires access to the OSD's admin socket (typically at `/var/run/ceph/`), which is only available inside the OSD pod itself, not from the tools pod.
- **What was changed:** Replaced `ceph daemon osd.0 perf dump | grep bluestore` with `ceph tell osd.0 perf dump`, which communicates over the Ceph monitor and works from any pod with Ceph client access including the tools pod.
- **Why:** `ceph tell` sends commands over the network via the monitors, while `ceph daemon` requires a local admin socket. In a Rook/Kubernetes environment, the tools pod does not have access to individual OSD admin sockets.

## Review Notes
- The `bluestore_min_alloc_size_ssd` value of 16384 (16KB) in the ConfigMap example differs from the Ceph default of 4096 (4KB). This is a valid configuration value but readers should be aware it is not the default. Since the post presents this as a configuration example rather than claiming defaults, no change was made.
- The `ceph osd pool stats` command shown for checking compression statistics primarily shows I/O throughput stats, not detailed compression ratios. For compression-specific stats, `ceph osd pool get <pool> compression_ratio` or BlueStore perf counters would be more targeted. However, the command is valid and does provide useful pool statistics, so no change was made.
- The `osd_memory_target` setting (4GB in the example) interacts with BlueStore cache sizing. When `osd_memory_target` is set, BlueStore cache is automatically managed as a portion of the memory target. Readers should be aware that explicitly setting both `bluestore_cache_size_*` and `osd_memory_target` may lead to unexpected behavior if the cache size exceeds the memory target.
