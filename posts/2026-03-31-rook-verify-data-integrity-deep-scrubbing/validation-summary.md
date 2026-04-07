# Validation Summary: How to Verify Data Integrity with Deep Scrubbing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Ceph OSD scrubbing (light and deep)
- Ceph placement groups (PGs)
- Kubernetes (kubectl for log inspection)
- CephBlockPool CRD (Rook custom resource)

## Sources Consulted
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation on placement group repair: https://docs.ceph.com/en/latest/rados/operations/pg-repair/
- Ceph configuration reference for scrub options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/#scrubbing
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found
1. **Incorrect config target for `osd_deep_scrub_interval`**: The post included the line `ceph config set mgr osd_deep_scrub_interval 604800`, which sets an OSD-level configuration option on the manager daemon type. The `osd_deep_scrub_interval` option is an OSD-level setting and has no effect when set on the `mgr` daemon. Removed this incorrect line, keeping only the correct `ceph config set osd osd_deep_scrub_interval 604800` command.

## Review Notes
- All other CLI commands (`ceph pg deep-scrub`, `ceph pg repair`, `ceph osd pool set`, `ceph config set osd`) are syntactically correct and use valid options.
- The default scrub intervals stated (24h light, 7 days deep) match the Ceph defaults for `osd_scrub_min_interval` (86400s) and `osd_deep_scrub_interval` (604800s).
- The Rook CephBlockPool YAML uses the correct API version (`ceph.rook.io/v1`) and valid pool parameters.
- The repair description is accurate for replicated pools; erasure-coded pools use a different repair mechanism, but the post does not claim otherwise.
- The `osd_scrub_chunk_max` default of 25 is version-dependent; some Ceph releases default to 5. The value used in the post is valid but users should verify against their specific Ceph version.
