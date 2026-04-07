# Validation Summary: How to Reshard Large Buckets in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- RADOS (Reliable Autonomic Distributed Object Store)
- radosgw-admin CLI

## Sources Consulted
- Ceph official documentation on RGW bucket resharding: https://docs.ceph.com/en/latest/radosgw/resharding/
- Ceph official documentation on radosgw-admin: https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph configuration reference for RGW dynamic resharding options: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph Luminous release notes (dynamic resharding introduction): https://docs.ceph.com/en/latest/releases/luminous/

## Issues Found

1. **Incorrect version attribution for dynamic resharding**: The post stated "Ceph Nautilus and later support automatic dynamic resharding." Dynamic resharding was actually introduced in Ceph Luminous (12.2.x), not Nautilus. Nautilus brought significant reliability improvements to the feature. Updated to accurately reflect the history.

2. **Broken shell escaping in verification command**: The `rados ls` verification command used `\"` (backslash-escaped double quotes) inside a markdown code block for the `python3 -c` argument. These escaped quotes would be passed literally to the shell and cause a syntax error. Fixed by using single quotes around the Python command and double quotes inside the Python code, which is the standard approach for inline Python in bash.

## Review Notes
- The 100,000–150,000 objects-per-shard guideline is consistent with Ceph community recommendations.
- All `radosgw-admin` subcommands and flags (`bucket reshard`, `reshard status`, `reshard list`, `reshard process`, `reshard cancel`, `bucket stats`) are correct and current.
- The `ceph config set` commands for `rgw_dynamic_resharding` and `rgw_max_objs_per_shard` use the correct config key paths.
- Note that in modern Ceph releases (Reef+), the default value of `rgw_override_bucket_index_max_shards` is 11 (not 1), so new buckets may already have multiple shards. The post's statement about "a single index shard" by default is accurate for older releases but may not apply to Reef and later.
