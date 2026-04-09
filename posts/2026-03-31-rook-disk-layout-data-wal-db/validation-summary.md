# Validation Summary: How to Plan Disk Layout for Ceph (Data, WAL, DB)

## Status
validated

## Post Type
Tutorial / Hardware Planning Guide

## Technologies Covered
- Ceph BlueStore
- Rook (Ceph Operator for Kubernetes)
- RocksDB (BlueStore metadata backend)
- NVMe / HDD disk layout
- Kubernetes (kubectl)

## Sources Consulted
- Rook CephCluster CRD documentation (storage configuration fields: `databaseSizeMB`, `walSizeMB`, `metadataDevice`)
- Ceph BlueStore documentation (WAL/DB sizing recommendations, `bluefs stats` command)
- Ceph OSD metadata field reference (`bluestore_bdev_dev_node`, `bluefs_db_dev_node`)
- Ceph admin socket vs `ceph tell` command routing documentation

## Issues Found

1. **`dbSizeMB` should be `databaseSizeMB`** (Step 2 config): Rook's CephCluster CRD uses `databaseSizeMB` as the config key, not `dbSizeMB`. The incorrect key would be silently ignored, making the DB size configuration ineffective. Fixed to `databaseSizeMB` and updated the value to 98304 (96 GB) to match the sizing table for 12 TB HDDs.

2. **`ceph daemon` commands from tools pod won't work** (Steps 4 and 5): The `ceph daemon` command connects via the OSD's local admin socket, which is not available inside the `rook-ceph-tools` deployment pod. Changed both commands to use `ceph tell osd.0` instead, which routes through the Ceph monitors and works from any pod with Ceph CLI access.

3. **`bluestore bluefs stats` is not a valid command** (Step 4): The correct command is `bluefs stats`, not `bluestore bluefs stats`. The `bluestore` prefix is not part of this command. Fixed to `ceph tell osd.0 bluefs stats`.

4. **Internally inconsistent DB sizing guidance** (Step 1): The post claimed "DB: 64 GB to 4% of OSD data size (whichever is larger)" and then computed `max(64 GB, 491 GB)` for 12 TB, but immediately contradicted this with "Practical DB size: 64-100 GB per HDD OSD." The sizing table uses ~0.8% (8 GB per TB) and the summary says "roughly 1%." Fixed Step 1 to recommend ~8 GB per TB of HDD capacity, consistent with the sizing table. Updated the NVMe sharing example to use a 2 TB NVMe to correctly accommodate 12 HDDs at 96 GB DB each.

5. **Incorrect field names in `ceph osd metadata` example output** (Step 3): `bluestore_bdev_devices` is not a real field; the correct name is `bluestore_bdev_dev_node` with a full device path. Similarly, `bluefs_db_dev` should be `bluefs_db_dev_node`. Fixed both field names and values.

## Review Notes
- The sizing table's ratio of ~0.8% (8 GB per TB) is a reasonable practical recommendation. Ceph upstream documentation recommends up to 4% as a conservative upper bound, but most production workloads operate well within 1%. The post now notes this distinction.
- The WAL sizing recommendation of 1 GB is appropriate for most workloads and aligns with Ceph documentation.
- The `ceph tell` alternative works in Ceph Pacific (v16.2+) and later. For older Ceph versions, users would need to exec into the OSD pod directly.
- The write latency improvement claim of "5-10x" in the summary is a reasonable ballpark for HDD-to-NVMe metadata offload, though actual results vary by workload.
