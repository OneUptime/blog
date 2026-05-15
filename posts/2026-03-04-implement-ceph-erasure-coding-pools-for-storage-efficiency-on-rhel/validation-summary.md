# Validation Summary: How to Implement Ceph Erasure Coding Pools for Storage Efficiency on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ceph Storage
- Ceph erasure-coded pools
- Ceph Object Gateway (RGW)
- RADOS Block Device (RBD)
- CRUSH failure domains

## Sources Consulted
- Red Hat Ceph Storage 9 Storage Strategies Guide, Erasure code pools overview: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/9/html/storage_strategies_guide/erasure-code-pools-overview_strategy
- Ceph documentation, Erasure code: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph documentation, Pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph documentation, Cache Tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph documentation, RGW Pool Placement and Storage Classes: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph documentation, Basic Block Device Commands: https://docs.ceph.com/en/latest/start/quick-rbd/

## Issues Found
- The 4+2 profile note said it required at least 6 OSDs across different failure domains. With `crush-failure-domain=host`, the profile needs enough host failure domains for the six chunks, so the note now says at least 6 host failure domains.
- The RGW example used `radosgw-admin zone modify --data-pool`, but current RGW placement documentation configures placement data pools with `radosgw-admin zone placement modify` or `add`. The command now targets `default-placement` and `STANDARD`.
- The pool application comment said the example enabled the pool for RGW or RBD, but the command only enabled `rgw`. The comment now says RGW usage.
- The RBD section recommended cache tiering. Current Ceph documentation deprecates cache tiering in Reef and strongly advises against new cache tiers. The section now uses the supported RBD pattern: replicated metadata pool, EC data pool, `allow_ec_overwrites`, RBD application enablement, and `rbd create --data-pool`.

## Review Notes
The post is technically valid after fixes. Future improvements could mention PG autoscaling and Red Hat Ceph Storage 9 EC optimizations, but those are not required for correctness of the existing tutorial.
