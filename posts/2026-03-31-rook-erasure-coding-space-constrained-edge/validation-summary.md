# Validation Summary: How to Configure Ceph Erasure Coding for Space-Constrained Edge

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (erasure coding, OSD pools, RBD, RGW)
- Rook (CephBlockPool CRD, CephObjectStore CRD)
- Kubernetes (custom resource definitions)

## Sources Consulted
- Ceph Erasure Code documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph Jerasure Erasure Code Plugin documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/
- Ceph Erasure Code Profiles: https://docs.ceph.com/en/reef/rados/operations/erasure-code-profile/
- Ceph blog — "Erasure Coding Overhead in a Nutshell": https://ceph.io/en/news/blog/2015/ceph-erasure-coding-overhead-in-a-nutshell/
- Ceph blog — "New in Luminous: Erasure Coding for RBD and CephFS": https://ceph.io/en/news/blog/2017/new-luminous-erasure-coding-rbd-cephfs/
- Ceph Cache Tiering documentation: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CephObjectStore CRD: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/

## Issues Found

### 1. CephBlockPool YAML used incorrect parameters (fixed)
**What was wrong:** The Rook `CephBlockPool` YAML included a `parameters` block with `pg_num` and `crush_rule: edge-ec-profile`. The `crush_rule` field is not the correct way to specify failure domain in Rook — `edge-ec-profile` is an erasure code profile name, not a CRUSH rule name. Additionally, PG numbers are auto-tuned by the PG autoscaler in modern Ceph/Rook.
**What was changed:** Replaced the `parameters` block with `failureDomain: host` at the spec level, which is the correct Rook CRD field for specifying CRUSH failure domain.

### 2. "EC pools do not support RBD" claim was outdated (fixed)
**What was wrong:** The post stated "Erasure-coded pools do not support RBD block devices" and recommended cache tiering as the workaround. Since Ceph Luminous (12.2.x, released 2017), EC pools fully support RBD via `allow_ec_overwrites true` with BlueStore OSDs. The two-pool model (replicated metadata pool + EC data pool) is the recommended modern approach.
**What was changed:** Updated the EC Pool Limitations section to reflect that RBD is supported on EC pools. Replaced the deprecated cache tiering commands with the modern `allow_ec_overwrites` + data-pool approach using `rbd create --data-pool`.

### 3. Cache tiering commands were deprecated (fixed)
**What was wrong:** The post recommended `ceph osd tier add/cache-mode/set-overlay` commands. Cache tiering has been officially deprecated as of Ceph Reef (v18.2.0) and the Ceph documentation explicitly warns against deploying new cache tiers.
**What was changed:** Removed the cache tiering commands entirely and replaced with the modern approach described above. Updated the summary paragraph accordingly.

## Review Notes
- The `metadataPool.replicated.size: 2` in the CephObjectStore YAML means only 2-way replication for RGW metadata, tolerating only 1 failure. For production deployments, `size: 3` is generally recommended. However, for a 3-node edge deployment with limited resources, this is an acceptable tradeoff and the post is specifically targeting edge scenarios.
- The CephObjectStore YAML does not explicitly specify `failureDomain`. The default is `host`, which is correct for the multi-node edge scenario described, but could be made explicit for clarity.
- The erasure coding math, EC profile commands, and pool creation CLI syntax are all correct.
- The `reed_sol_van` technique for the jerasure plugin is valid and is the most flexible technique available.
