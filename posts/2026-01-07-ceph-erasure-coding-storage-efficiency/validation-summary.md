# Validation Summary: How to Implement Ceph Erasure Coding for Storage Efficiency

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Ceph RADOS
- Ceph erasure-coded pools
- Ceph erasure code profiles and plugins
- RADOS Gateway (RGW)
- RADOS Block Device (RBD)
- CephFS
- BlueStore compression
- Ceph CLI, rados, rbd, and radosgw-admin

## Sources Consulted
- Ceph Documentation - Erasure Code: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph Documentation - Erasure Code Profiles: https://docs.ceph.com/en/umbrella/rados/operations/erasure-code-profile/
- Ceph Documentation - Tentacle Release Notes: https://docs.ceph.com/en/latest/releases/tentacle/
- Ceph Documentation - Pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Documentation - Locally Repairable Erasure Code Plugin: https://docs.ceph.com/en/reef/rados/operations/erasure-code-lrc/
- Ceph Documentation - CLAY Code Plugin: https://docs.ceph.com/en/reef/rados/operations/erasure-code-clay/
- Ceph Documentation - SHEC Erasure Code Plugin: https://docs.ceph.com/en/mimic/rados/operations/erasure-code-shec/
- Ceph Documentation - RGW Pool Placement and Storage Classes: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph Documentation - CephFS Create File System / EC Pools: https://docs.ceph.com/en/latest/cephfs/createfs/
- Ceph Documentation - BlueStore Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph Documentation - RBD Live Migration: https://docs.ceph.com/en/reef/rbd/rbd-live-migration/
- Ceph rbd Man Page: https://docs.ceph.com/en/reef/man/8/rbd/

## Issues Found
- The production and workload examples used Jerasure even though current Ceph documentation says ISA-L is the default for new Tentacle-or-later clusters and recommends ISA-L for new pools. Updated production, stripe, video archive, and backup examples to use `plugin=isa` while leaving the Jerasure section as a legacy plugin example.
- The LRC example used `l=2` and described groups of two data chunks, which did not match Ceph's documented `k=4 m=2 l=3` locality example. Updated the diagram label, command, and comment to use `l=3`.
- The SHEC and Clay sections did not mention current deprecation status. Added concise warnings that they are deprecated in the Umbrella release and scheduled for removal in a future Ceph release.
- The SHEC `c` comment described local parity calculation incorrectly. Updated it to describe `c` as a durability estimator.
- The PG configuration guidance recommended manually setting `pgp_num`; current Ceph documentation says modern releases generally adjust `pgp_num` automatically to match `pg_num`. Removed the explicit `pgp_num` command and updated the guidance to prefer the PG autoscaler.
- The RGW example used `ceph config set client.rgw rgw_override_bucket_index_max_shards 16` as if it configured EC data placement. Replaced it with documented `radosgw-admin zone placement modify` usage and added the replicated `data_extra_pool`.
- The RGW JSON snippet was updated to match the documented zone placement fields, including `data_extra_pool` and `inline_data`.
- The RBD and CephFS sections described metadata limitations as overwrite-only limitations. Updated the comments to mention OMAP metadata and the BlueStore requirement for `allow_ec_overwrites`.
- The video archive example used `target_max_bytes 100TB`, but the pool property is an integer. Replaced it with a byte value.
- The RBD migration example used unsupported `--source-pool`, `--dest-pool`, and `--dest-data-pool` flags. Replaced it with documented `rbd migration prepare --data-pool ... source destination` syntax.
- The generic `rados cppool` migration note did not warn that it is only suitable for raw RADOS object copies. Added that limitation.
- The RGW/AI dataset example enabled `allow_ec_overwrites` unnecessarily for an RGW pool. Removed that command.

## Review Notes
The remaining Jerasure example is intentionally retained in the legacy plugin section. The post still uses broad performance guidance, so production users should benchmark their own workload and confirm Ceph release-specific defaults before applying tuning values.
