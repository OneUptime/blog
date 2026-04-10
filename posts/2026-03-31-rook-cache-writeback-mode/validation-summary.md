# Validation Summary: How to Set Up Writeback Cache Mode in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (cache tiering / writeback mode)
- CRUSH rules and device classes (HDD, SSD)
- BlueStore OSDs
- Ceph CLI (`ceph osd` commands)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph official documentation on CRUSH rules: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph release notes for Reef (deprecation of cache tiering)

## Issues Found
1. **Incorrect comment on `cache_target_dirty_ratio`** (line 61): The comment stated "60% dirty triggers flush" but the configured value `0.4` corresponds to 40%, not 60%. Fixed the comment to say "40% dirty triggers flush."

## Review Notes
- The post tags include "Rook" and "Kubernetes" but the tutorial covers pure Ceph CLI commands with no Rook or Kubernetes-specific content. This is a tagging mismatch, not a technical error in the content itself.
- Cache tiering has been discouraged by the Ceph project since Luminous and was still technically available through Quincy (17.x). The post states "Ceph Octopus or earlier" as a prerequisite, which is conservative but reasonable guidance. The deprecation note about Reef is accurate.
- The `ceph osd pool create` commands specify pg_num/pgp_num manually (128, 64). In Nautilus and later, the pg_autoscaler manager module is enabled by default and may override these values. This is not incorrect but worth noting for readers on newer Ceph versions.
- The example monitoring output (1000 MiB/s write, 800 MiB/s flush, etc.) is illustrative rather than realistic for most deployments, but this is acceptable for a tutorial.
