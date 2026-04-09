# Validation Summary: How to Optimize Ceph for Small Object Workloads

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph (BlueStore, CRUSH, RocksDB)
- Rook (Ceph operator for Kubernetes)
- RADOS Gateway (RGW) / S3-compatible object storage
- Python / boto3 (AWS SDK)
- BlueStore OSD backend

## Sources Consulted
- Ceph RGW Configuration Reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph Dynamic Bucket Index Resharding: https://docs.ceph.com/en/latest/radosgw/dynamicresharding/
- Ceph Pool, PG and CRUSH Config Reference: https://docs.ceph.com/en/latest/rados/configuration/pool-pg-config-ref/
- Ceph GitHub PR #27684 — removal of `rgw_num_rados_handles` in Nautilus
- Ceph GitHub PR #27859 — BlueStore cache ratio clarification
- Ceph Tracker #50309 — `bluestore_min_alloc_size_hdd` default change
- boto3 S3 client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html

## Issues Found

### 1. `rgw_num_rados_handles` removed since Nautilus
- **What was wrong:** The post recommended `ceph config set client.rgw rgw_num_rados_handles 8`. This config option was removed in Ceph Nautilus (14.x, 2019) via PR #27684. It does not exist in any currently supported Ceph release.
- **What was changed:** Removed the `rgw_num_rados_handles` line from the RGW configuration section.
- **Why:** Setting a non-existent option would either silently fail or produce a warning, and could confuse readers.

### 2. `bluestore_max_inline_data_size` does not exist
- **What was wrong:** The post recommended `ceph config set osd bluestore_max_inline_data_size 4096` for storing very small objects inline. This is not a real Ceph configuration option in any release.
- **What was changed:** Replaced the fabricated option with a note that `bluestore_min_alloc_size` is set at OSD creation time and requires OSD recreation to change.
- **Why:** BlueStore automatically stores objects smaller than `min_alloc_size` in RocksDB. There is no separate user-tunable "inline data size" knob.

### 3. `bluestore_cache_data_ratio` is not a real config option
- **What was wrong:** The post set `bluestore_cache_data_ratio 0.1` as if it were a tunable parameter. Only `bluestore_cache_kv_ratio` and `bluestore_cache_meta_ratio` are user-settable; the data fraction is implicitly computed as `1.0 - kv_ratio - meta_ratio`.
- **What was changed:** Replaced the `bluestore_cache_data_ratio` command with a comment explaining the remaining 10% is automatically allocated to data cache.
- **Why:** Running `ceph config set` with this non-existent option would fail or be ignored.

### 4. Section title "S3 Multipart" was misleading
- **What was wrong:** The section was titled "S3 Multipart for Small Objects" but the code uses concurrent `put_object` calls via ThreadPoolExecutor, not S3 multipart upload (`create_multipart_upload`/`upload_part`/`complete_multipart_upload`). Multipart upload is for large objects and has a minimum 5 MiB part size — it is inappropriate for 4 KB objects.
- **What was changed:** Renamed section to "Concurrent S3 Uploads for Small Objects" and updated the description to say "concurrent uploads" instead of "batch operations."
- **Why:** Using incorrect terminology could mislead readers into actually implementing multipart uploads for small objects, which would be counterproductive.

### 5. `osd_pool_default_pg_num` set on wrong config section
- **What was wrong:** The post used `ceph config set osd osd_pool_default_pg_num 64`. This option is read by monitors (not OSDs) when creating new pools. Setting it in the `osd` section means monitors won't see the value.
- **What was changed:** Changed to `ceph config set global osd_pool_default_pg_num 64`.
- **Why:** The `global` section is the canonical location for this option and ensures monitors apply it during pool creation.

## Review Notes
- `rgw_thread_pool_size` defaults to 512 in modern Ceph, so setting it to 512 is a no-op. However, including it documents the recommended value, which is acceptable.
- `bluestore_min_alloc_size_ssd` and `bluestore_min_alloc_size_hdd` both default to 4096 in Ceph Pacific and later. The post's recommendation of 4096 matches the current defaults, so this is only useful guidance for pre-Pacific clusters or as documentation.
- The `ceph pg ls | awk` command uses column `$20` which is version-dependent. The actual column for object count varies across Ceph releases. Readers should verify the column index for their version.
- `ceph daemon client.rgw perf dump` requires the exact daemon name (e.g., `client.rgw.store1`), which varies by deployment. The post uses a simplified name.
- The post doesn't specify which Ceph version(s) these recommendations target. Most options are valid for Reef/Squid, but readers on older versions should verify compatibility.
