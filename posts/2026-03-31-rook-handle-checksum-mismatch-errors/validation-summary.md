# Validation Summary: How to Handle Checksum Mismatch Errors in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore)
- Rook (Ceph operator for Kubernetes)
- kubectl
- SMART disk monitoring (smartctl)
- RocksDB (as used within BlueStore)

## Sources Consulted
- Ceph official documentation — Adding/Removing OSDs: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph official documentation — Troubleshooting PGs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/
- Ceph official documentation — Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- ceph(8) man page: https://docs.ceph.com/en/reef/man/8/ceph/
- rados(8) man page: https://docs.ceph.com/en/latest/man/8/rados/
- Red Hat Ceph Storage 7 — BlueStore configuration options: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/7/html/configuration_guide/bluestore-configuration-options_conf
- RocksDB options.h (GitHub): https://github.com/facebook/rocksdb/blob/main/include/rocksdb/options.h
- Ceph RocksDB Tuning Deep-Dive: https://ceph.io/en/news/blog/2022/rocksdb-tuning-deep-dive/

## Issues Found

### 1. Incorrect command for finding inconsistent PGs
- **What was wrong:** The post used `ceph pg dump_stuck | grep -E "inconsistent|repair"` to list affected PGs. However, `ceph pg dump_stuck` only supports the states `inactive`, `unclean`, `stale`, `undersized`, and `degraded` — it does not surface PGs in an "inconsistent" state.
- **What was changed:** Replaced with `ceph health detail | grep -E "inconsistent|repair"`, which correctly shows inconsistent PGs in its output.
- **Why:** `ceph health detail` is the standard command for identifying PGs with inconsistency issues. The original command would not reliably find the PGs the reader needs.

### 2. Redundant commands after `ceph osd purge`
- **What was wrong:** After `ceph osd purge 5 --yes-i-really-mean-it`, the post also ran `ceph auth del osd.5` and `ceph osd crush remove osd.5`. The `ceph osd purge` command already removes the OSD from the CRUSH map and deletes the auth key in a single operation (introduced in Ceph Luminous). The extra commands are redundant and would fail since those entries no longer exist.
- **What was changed:** Removed the two redundant commands, keeping only `ceph osd purge 5 --yes-i-really-mean-it`.
- **Why:** Running commands that are guaranteed to fail is confusing for readers and suggests a misunderstanding of the `purge` subcommand.

### 3. Invalid RocksDB option `sync_log_period_micros`
- **What was wrong:** The post recommended `ceph config set osd bluestore_rocksdb_options "sync_log_period_micros=0"` to "enable fsync after every write." The option `sync_log_period_micros` does not exist in RocksDB. It is not present in `options.h`, the RocksDB wiki, or any RocksDB binding documentation. Setting `bluestore_rocksdb_options` to only this value would also override all default RocksDB options, which could degrade performance or stability.
- **What was changed:** Replaced with `ceph config set global osd_deep_scrub_interval 604800`, which schedules regular deep scrubs (weekly) to detect silent data corruption early. This is a well-documented and verifiable Ceph configuration.
- **Why:** The original command used a fabricated option name that would be silently ignored or cause an error, providing a false sense of security. Regular deep scrubs are an established best practice for detecting checksum mismatches and silent corruption.

## Review Notes
- The example `ceph health detail` output (`HEALTH_ERR 1 osds have slow ops; 1 pgs are damaged; 2 bluestore_csum_errors`) is illustrative but not an exact match for real output format. In practice, checksum mismatch health checks appear as `BLUESTORE_CSUM_MISMATCH` warnings. This is acceptable for a guide since it conveys the right idea.
- The Rook OSD removal step (`kubectl -n rook-ceph delete pod`) is a simplification. In production Rook environments, the recommended approach is to use the Rook OSD purge job or scale down the OSD deployment. The simplified approach shown works but the pod will restart if the deployment still exists.
- The `bluestore_sync_submit_transaction` option is valid but its description could note that it controls whether KV transactions are submitted synchronously in the queueing thread rather than the kv_sync_thread, which is subtly different from "write safety" in general.
