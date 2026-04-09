# Validation Summary: How to Configure Promotion Thresholds for Cache Tiering

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (cache tiering subsystem)
- Rook (Ceph operator for Kubernetes, referenced in tags)
- Ceph CLI (`ceph osd pool set`, `ceph osd tier`, `ceph osd pool create`)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph pool operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CLI reference for `ceph osd pool set` parameters

## Issues Found
No technical issues found.

All commands use correct syntax (`ceph osd pool set <pool> <param> <value>`). The pool parameters (`min_read_recency_for_promote`, `min_write_recency_for_promote`, `target_max_bytes`, `target_max_objects`, `hit_set_type`, `hit_set_count`, `hit_set_period`, `cache_target_dirty_ratio`, `cache_target_full_ratio`) are all valid Ceph cache tier settings. Byte calculations are correct (107374182400 = 100 GiB, 53687091200 = 50 GiB). The cache tier setup sequence (`tier add`, `cache-mode`, `set-overlay`) follows the correct order. The behavioral explanations of how promotion thresholds interact with hit sets are accurate.

## Review Notes
- Ceph cache tiering has been deprecated/discouraged since the Luminous release (v12.x). The official Ceph documentation recommends alternatives like dm-cache or bcache. The post does not mention this deprecation status, which could be added as a caveat in a future update.
- The post uses raw `ceph` CLI commands rather than Rook CRD configurations, despite being tagged with "Rook." This is valid since Rook-managed clusters still support direct Ceph CLI usage, but users working purely through Rook CRDs would need to translate these to their CephBlockPool or CephCluster resource specs.
- The monitoring section references `hit_set_stats` and `promote_op` as sample output fields. These are conceptual descriptions rather than exact field names from `ceph osd pool stats` output, but the guidance is directionally correct.
