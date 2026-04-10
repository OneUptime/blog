# Validation Summary: How to Create Dedicated CRUSH Rules for Cache Pool Drives in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH maps, device classes, OSD management, pool management)
- Rook Ceph Operator (CephBlockPool CRD)
- Kubernetes
- BlueStore OSD backend

## Sources Consulted
- [Ceph CRUSH Maps Documentation](https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- [Ceph Pools Documentation](https://docs.ceph.com/en/latest/rados/operations/pools/)
- [Ceph Cache Tiering Documentation](https://docs.ceph.com/en/latest/rados/operations/cache-tiering/)
- [Ceph CLI Man Page (Reef)](https://docs.ceph.com/en/reef/man/8/ceph/)
- [Monitoring OSDs and PGs - Ceph Documentation](https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/)
- [Rook CephBlockPool CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- [Rook GitHub Issue #12263 - deviceClass CRUSH rule naming](https://github.com/rook/rook/issues/12263)

## Issues Found
- **Incorrect Rook CRUSH rule name**: The post claimed Rook auto-generates a rule named `replicated_ruleset_ssd`. In current Rook versions, the auto-generated CRUSH rule name follows the pattern `<pool-name>-<device-class>` (e.g., `ssd-cache-pool-ssd`). Updated the text to reflect the correct naming convention.

## Review Notes
- **Cache tiering is deprecated**: Ceph cache tiering has been deprecated since Reef (v18.x) and lacks an active maintainer. The Ceph project advises against new cache tiering deployments. However, the CRUSH rule techniques shown in this post (device-class-based rules, `ceph osd crush rule create-replicated`) remain fully valid and widely used for directing pools to specific storage tiers, independent of cache tiering.
- All Ceph CLI commands (`ceph osd crush tree --show-shadow`, `ceph osd crush rule create-replicated`, `ceph osd pool set crush_rule`, etc.) have correct syntax and parameter ordering.
- The `ceph osd pool create ssd-cache-pool 64 64 replicated` command uses explicit PG counts, which is an older style. Modern Ceph (Nautilus+) has a PG autoscaler that manages PG counts automatically, but explicit specification is still valid.
- The verification scripts use `2>/dev/null` to suppress errors from header lines in `ceph pg ls-by-pool` output, which works but is slightly fragile. Functionally correct.
- The CRUSH tree example output includes "TiB" suffixes on weights, while actual Ceph output shows plain decimal numbers. This is a cosmetic simplification for readability.
