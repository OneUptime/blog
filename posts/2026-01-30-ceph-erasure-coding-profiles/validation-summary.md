# Validation Summary: How to Implement Ceph Erasure Coding Profiles

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Ceph RADOS erasure-coded pools
- Ceph erasure-code profiles and CRUSH failure domains
- Ceph Object Gateway (RGW) placement
- Ceph RBD with erasure-coded data pools
- CephFS with erasure-coded data pools
- Ceph Prometheus monitoring metrics

## Sources Consulted
- Ceph Erasure Code documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph Erasure Code Profiles documentation: https://docs.ceph.com/en/squid/rados/operations/erasure-code-profile/
- Ceph Pool, PG and CRUSH configuration reference: https://docs.ceph.com/en/latest/rados/configuration/pool-pg-config-ref/
- CephFS create filesystem documentation: https://docs.ceph.com/en/latest/cephfs/createfs/
- Ceph RGW Pool Placement and Storage Classes documentation: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph RBD basic block device commands: https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/

## Issues Found
- The profile parameter table stated that the `plugin` default is always `jerasure`. Stable and development Ceph docs differ on the default, so the wording was updated to avoid an inaccurate version-independent claim.
- The `allow_ec_overwrites` example omitted the BlueStore requirement. Ceph documents EC overwrites as BlueStore-only, so the command comment now calls that out.
- The RBD section described a cache-tiering pattern, but the commands actually used the supported RBD pattern of a replicated metadata pool plus an erasure-coded data pool. The heading and description were corrected. This also avoids recommending new cache tiers, which Ceph now deprecates.
- The RBD example did not enable the `rbd` application on the EC data pool and did not initialize the replicated metadata pool with `rbd pool init`, which Ceph documents as part of creating an RBD pool. Added both steps.

## Review Notes
The EC sizing math, k/m explanations, CRUSH failure-domain guidance, pool creation syntax, RGW placement command shape, CephFS EC data-pool usage, and `min_size` guidance are consistent with Ceph documentation. The examples remain topology-dependent: profiles such as k=8 m=3 or k=10 m=4 require enough OSDs and CRUSH failure domains to place all chunks as intended.
