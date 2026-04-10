# Validation Summary: How to Configure Data Deduplication in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Ceph RADOS pool-level deduplication
- radosgw-admin CLI
- Rook CephBlockPool CRD
- Ceph Prometheus metrics
- PromQL

## Sources Consulted
- Ceph official documentation: RGW S3 Objects Dedup (https://docs.ceph.com/en/latest/radosgw/s3_objects_dedup/)
- Ceph source: radosgw-admin help test showing all subcommands (https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t)
- Ceph source: RGW config options (https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in)
- Ceph official documentation: RADOS-level deduplication (https://docs.ceph.com/en/latest/dev/deduplication/)
- Validated blog post on same topic: posts/2026-03-31-rook-full-object-deduplication-ceph-rgw/ (confirmed correct radosgw-admin dedup subcommands)
- Validated blog post on compression monitoring: posts/2026-03-31-rook-monitor-compression-ratios-per-pool-ceph/ (confirmed correct Prometheus metric labels)

## Issues Found

1. **Fabricated `radosgw-admin zone modify` dedup flags**: The post used `radosgw-admin zone modify --rgw-zone default --dedup-chunk-algo fixed --dedup-chunk-size 65536`. These flags (`--dedup-chunk-algo`, `--dedup-chunk-size`) do not exist for `radosgw-admin zone modify`. Replaced with the correct `ceph config set client.rgw rgw_dedup_min_obj_size_for_dedup 65536` command for configuring dedup parameters.

2. **`radosgw-admin dedup start` does not exist**: The correct command to execute dedup is `radosgw-admin dedup exec --yes-i-really-mean-it`. Replaced with the correct command and also added `radosgw-admin dedup estimate` for pre-run estimation.

3. **`rgw_dedup` described as a "module"**: The post referred to "The `rgw_dedup` module." RGW dedup is not a separate module — it is an offline batch process accessed via `radosgw-admin dedup` subcommands. Corrected the description to reference `radosgw-admin dedup` tool instead.

4. **Fabricated `radosgw-admin zone modify --dedup-pool` command**: The command `radosgw-admin zone modify --rgw-zone default --dedup-pool rook-ceph.dedup-chunk-pool.data` uses a non-existent flag. Replaced with the correct `ceph osd pool set` command to configure the dedup tier at the pool level.

5. **Fabricated `radosgw-admin dedup stats` example output**: The example output showing "Processed: 1.2 TiB / Deduplicated: 340 GiB" was fabricated and could mislead readers about the actual output format. Removed the fabricated output and replaced with lifecycle management commands (`pause`, `resume`) which are real and useful for operators.

6. **Pool-level dedup property `dedup_chunk_size` incorrect**: The correct property name for CDC-based chunk size is `dedup_cdc_chunk_size`, not `dedup_chunk_size`. Fixed.

7. **PromQL metrics used wrong label**: The post used `{name="my-pool"}` for compression metrics, but `ceph_pool_compress_under_bytes` and `ceph_pool_compress_bytes_used` use the `pool_id` label, not `name`. Fixed to `{pool_id="2"}`. Also added `> 0` guard on the denominator to prevent division by zero.

## Review Notes
- The "Workloads That Benefit from Dedup" savings estimates table is reasonable and aligns with general industry expectations for deduplication, though actual results vary significantly by workload.
- The CephBlockPool YAML for creating a chunk pool is structurally correct for Rook, including the `compression_mode` parameter.
- Pool-level dedup (the "experimental" section) is genuinely experimental in Ceph Reef/Squid. Users should exercise caution and test thoroughly in non-production environments.
- The blog post covers both RGW-level and RADOS pool-level dedup. These are separate systems in Ceph — the post could benefit from making this distinction clearer, but the current structure is acceptable.
- The compression commands (`ceph osd pool set ... compression_mode aggressive`) are correct.
