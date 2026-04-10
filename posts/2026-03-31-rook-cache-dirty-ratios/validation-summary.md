# Validation Summary: How to Configure Dirty Ratios for Cache Tiering in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (cache tiering, writeback mode)
- Rook (Ceph operator for Kubernetes)
- Kubernetes

## Sources Consulted
- Ceph official documentation: Cache Tiering (https://docs.ceph.com/en/latest/rados/operations/cache-tiering/)
- Ceph official documentation: Pool parameters (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph source code: osd_types.h for default values
- Real-world `ceph df detail` and `ceph osd pool stats` output examples from production clusters

## Issues Found

1. **Flushing behavior description (line 36)**: The post stated that flushing between `cache_target_dirty_ratio` and `cache_target_dirty_high_ratio` occurs at "normal pace." The official Ceph documentation states flushing begins at a "reduced rate" at the first threshold and becomes aggressive only at the high threshold. Changed "normal pace" to "reduced rate."

2. **`ceph df detail` output format (lines 45-48)**: The example output showed the DIRTY column as a byte size ("160 GiB"). In reality, `ceph df detail` displays DIRTY as an object count (e.g., "40960"), not a byte size. Fixed the example output to show correct column layout and object count, and updated the explanatory text to clarify that DIRTY is an object count.

3. **`ceph osd pool stats` output format (line 91)**: The example output showed promote and evict rates in MiB/s (e.g., "200 MiB/s promote"). In reality, promote and evict rates are shown in op/s, and the output includes a pool header line and client I/O line. Fixed the example to show the realistic multi-line output format with correct units.

## Review Notes
- Cache tiering is marked as deprecated in recent Ceph releases (since Luminous). The post is technically accurate for environments still using cache tiering but readers should be aware that Ceph upstream discourages new cache tiering deployments in favor of other approaches (e.g., dm-cache, bcache, or BlueStore with mixed device classes).
- The default values for `cache_target_dirty_ratio` and `cache_target_dirty_high_ratio` may vary across Ceph versions. Some documentation sources indicate defaults as low as 0.05 for `cache_target_dirty_ratio`. The blog uses 0.4 and 0.6 as example/recommended values, which aligns with the official cache tiering setup guide.
- The workload tuning table provides reasonable guidance but the values are recommendations, not official benchmarks.
