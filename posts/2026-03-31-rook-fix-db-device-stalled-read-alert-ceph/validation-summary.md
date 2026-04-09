# Validation Summary: How to Fix DB_DEVICE_STALLED_READ_ALERT Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore, BlueFS, RocksDB)
- Rook (Kubernetes-based Ceph orchestrator)
- fio (Flexible I/O Tester)
- NVMe (nvme-cli)
- ceph-bluestore-tool
- Prometheus (alerting rules)

## Sources Consulted
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- ceph-bluestore-tool man page: https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/
- Ceph source code - BlueFS.cc admin socket command registration: https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueFS.cc
- Ceph source code - RocksDBStore.cc perf counter registration: https://github.com/ceph/ceph/blob/main/src/kv/RocksDBStore.cc
- Ceph source code - BlueStore.cc cache management: https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueStore.cc
- Ceph PR #15580: Configure RocksDB cache via bluestore_cache_kv_ratio: https://github.com/ceph/ceph/pull/15580
- Ceph PR #28107: OSD metadata field names for device info: https://github.com/ceph/ceph/pull/28107
- fio official documentation: https://github.com/axboe/fio/blob/master/HOWTO.rst
- ArchWiki NVMe APST documentation: https://wiki.archlinux.org/title/Solid_state_drive/NVMe

## Issues Found

1. **Incorrect OSD metadata grep pattern (line 34):** The grep pattern `bluestore_block_db` does not match any actual field in `ceph osd metadata` output. The real field names use the `bluefs_db` prefix (e.g., `bluefs_db_dev_node`, `bluefs_db_partition_path`). Changed to `bluefs_db`.

2. **Misleading `df` command for DB fill level (line 77):** The `df -h /var/lib/ceph/osd/ceph-1/` command was listed to check DB device fill level, but BlueFS operates on raw block devices, not mounted filesystems. `df` would show tmpfs usage of the OSD directory, not BlueFS DB utilization. Removed the `df` command and kept only the correct `bluefs stats` admin socket command.

3. **Wrong admin socket command syntax (line 80):** `ceph daemon osd.1 bluestore bluefs stats` is not valid -- `bluestore` and `bluefs` are separate admin socket command prefixes and cannot be chained. Changed to `ceph daemon osd.1 bluefs stats`.

4. **Invalid `block_cache=512MB` in RocksDB options string (line 90):** `block_cache` is not a string-parseable RocksDB option. BlueStore manages the RocksDB block cache internally via `bluestore_cache_size_ssd`/`bluestore_cache_size_hdd` and `bluestore_cache_kv_ratio`. The `block_cache=512MB` entry would either be silently ignored or cause errors. Removed it from the options string.

5. **Wrong perf counter names (line 70):** `kv_get_latency_sum` / `kv_get_latency_avgcount` are not real Ceph perf counter names. The actual counter for RocksDB read latency is `rocksdb.get_latency` with sub-fields `sum` and `avgcount`. Updated the counter reference.

## Review Notes
- The `DB_DEVICE_STALLED_READ_ALERT` health check name is not a standard Ceph health check found in current documentation. It may be a newer or less-documented check, or it may be hypothetical. The troubleshooting steps themselves are valid for diagnosing DB device performance issues regardless of the specific health check name.
- The Prometheus alerting rule uses `ceph_daemon_health_metrics{type="DB_DEVICE_STALLED_READ_ALERT"}` which is not a standard Ceph exporter metric. It serves as a reasonable example template but would need adaptation for real deployments using actual Ceph exporter metrics.
- The `ceph-bluestore-tool bluefs-bdev-migrate` command and flags (`--devs-source`, `--dev-target`, `--path`) are correct per official documentation.
- The fio commands and options (`--lat_percentiles=1`, `--percentile_list=50:99:99.9`) are valid.
- The NVMe APST disable command using feature 0x0c is correct.
