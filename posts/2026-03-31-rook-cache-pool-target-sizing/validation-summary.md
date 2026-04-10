# Validation Summary: How to Set Target Sizing for Cache Pools in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RADOS cache tiering)
- Rook (Ceph operator for Kubernetes)
- Kubernetes

## Sources Consulted
- Ceph official documentation — Cache Tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph source documentation on GitHub: https://github.com/ceph/ceph/blob/main/doc/rados/operations/cache-tiering.rst
- Ceph Reef (v18.2.0) release notes: https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/

## Issues Found
No technical issues found. All commands, parameters, byte calculations, ratio behavior, formulas, and recommendations are accurate per official Ceph documentation.

Specific verifications performed:
- `target_max_bytes` and `target_max_objects` are valid pool parameters confirmed in official docs.
- All `ceph osd pool set` and `ceph osd pool get` commands use correct syntax.
- 536870912000 bytes = 500 GiB (500 * 1024^3) — correct.
- 134217728000 bytes = 125 GiB (125 * 1024^3) — correct.
- `cache_target_dirty_ratio` and `cache_target_full_ratio` behavior as fractions of the target — correct.
- "Whichever threshold is reached first triggers flush and eviction" — confirmed by official docs.
- `min_read_recency_for_promote` is a valid parameter; raising it does reduce promotion aggressiveness — correct.
- The formula `cache_target = hot_set_size / cache_target_full_ratio` is logically sound.

## Review Notes
- **Cache tiering deprecation**: Ceph cache tiering was officially deprecated in the Reef release (v18.2.0, 2023). The upstream Ceph community strongly advises against deploying new cache tiers. The post does not mention this deprecation. While the technical content remains accurate for existing deployments, readers should be aware that cache tiering is no longer actively maintained and new deployments are discouraged.
- The `%USED` column from `ceph df` reflects usage relative to total cluster capacity, not relative to `target_max_bytes`. Readers should be careful interpreting this value as "cache fullness" — for precise cache-target-relative utilization, additional calculation is needed.
- The dirty/full ratio settings apply against both `target_max_bytes` and `target_max_objects` (whichever triggers first), not exclusively against bytes. The post's examples focus on bytes, which is the most common use case but could be slightly misleading for object-count-heavy workloads.
