# Validation Summary: How to Configure BlueStore Block Device Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph BlueStore
- Ceph OSD configuration
- Rook-Ceph Kubernetes operator
- SPDK (Storage Performance Development Kit)
- Ceph performance counters

## Sources Consulted
- Ceph BlueStore Config Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph source code `src/common/options/global.yaml.in` for default values
- Ceph source code `src/os/bluestore/BlueStore.cc` for perf counter registration names
- Ceph source code `src/ceph_osd.cc` for valid ceph-osd CLI flags
- Ceph PR #32043 (bluestore_block_size default change from 1T to 100G)

## Issues Found

1. **`bluestore_block_size` default comment was incorrect**: The comment stated "0 means auto-detect device size". The actual default is 107374182400 (100 GiB), used only for file-backed block devices. For raw block devices, the actual device size is used automatically. Fixed the comment to reflect this.

2. **`bluestore_min_alloc_size_ssd` default was wrong**: The post claimed "Default for SSD: 16384 (16KB) in Ceph Quincy+" but the actual default is 4096 (4KB), changed in Ceph Octopus (not Quincy). Fixed the default value and version reference.

3. **WAL staging explanation was oversimplified**: The post stated "Writes smaller than this are staged in the WAL" for `bluestore_min_alloc_size`. This primarily applies to overwrites of already-allocated regions, not all writes below the threshold. Changed to "Overwrites smaller than this are deferred through the WAL" for accuracy.

4. **Invalid `ceph-osd` CLI flag**: The command `ceph-osd -i 0 --get-or-create-osd-uuid` used a non-existent flag. The valid flag is `--get-osd-fsid` (aliased as `--get-osd-uuid`). Fixed to `--get-osd-fsid`.

5. **SPDK block path format was incorrect**: The post used `/dev/nvme0n1` as the `bluestore_block_path` for SPDK, but SPDK requires a special format with the `spdk:` prefix and PCI transport address (e.g., `"spdk:trtype:PCIe traddr:0000:01:00.0"`). Fixed to use the correct SPDK addressing format.

6. **Perf counter key names were wrong in Python code**: The perf dump Python snippets used keys like `bluestore_alloc_unit` and `bluestore_write_big_bytes`, but the actual keys in the `bluestore` section of `perf dump` output are `alloc_unit`, `write_big_bytes`, `write_small_bytes`, and `write_pad_bytes` (without the `bluestore_` prefix). Fixed all key references.

7. **Misleading label for `alloc_unit` counter**: The code printed "Total allocated" for the `alloc_unit` perf counter, but this counter reports the allocation unit size in bytes, not total allocated space. Changed label to "Allocation unit size".

## Review Notes
- The Rook CephCluster YAML example shows basic storage configuration but does not demonstrate setting BlueStore-specific parameters (like `bluestore_min_alloc_size`). It is technically valid YAML but could be more relevant to the post's topic. Not changed since it provides useful general context.
- The `bluestore_write_pad_bytes` counter has `PRIO_DEBUGONLY` priority and may not appear in default `perf dump` output without adjusting the perf counter priority threshold.
- The `bluestore_prefer_deferred_size_hdd` default is 65536 (64 KiB), not explicitly stated in the post but the example sets it to 32768 which is a valid custom value.
