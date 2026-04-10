# Validation Summary: How to Configure Pool, PG, and CRUSH Settings in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- CRUSH (Controlled Replication Under Scalable Hashing) algorithm
- Ceph Placement Groups (PGs)
- Ceph Pools (replicated)
- CephBlockPool CRD (Rook Kubernetes API)
- kubectl

## Sources Consulted
- Ceph official documentation: Pool creation and management (`ceph osd pool create` syntax, `ceph osd pool set` parameters)
- Ceph official documentation: Placement Group calculation recommendations
- Ceph official documentation: CRUSH rule management (`ceph osd crush rule create-replicated` syntax)
- Ceph official documentation: PG autoscaler module (`pg_autoscaler`, `pg_autoscale_mode`)
- Rook documentation: CephBlockPool CRD API reference (`spec.parameters`, `spec.crushRoot`, `spec.deviceClass`, `spec.replicated.requireSafeReplicaSize`)

## Issues Found
1. **pg_num/pgp_num equality scope was too narrow**: The post stated "They should be equal for replicated pools," implying this requirement is specific to replicated pools. In fact, pg_num and pgp_num should always be equal regardless of pool type (replicated or erasure-coded). Changed to "They should always be equal."

## Review Notes
- The PG calculation formula `(OSDs * 100) / replication_factor` is the standard single-pool formula. In multi-pool clusters, this value should be divided by the number of pools to avoid over-provisioning PGs. The post doesn't mention this, but since the example uses a single pool, the formula is correct in context.
- The PG calculator URL (`https://old.ceph.com/pgcalc/`) points to the legacy Ceph domain. This tool may no longer be maintained or accessible. Modern Ceph clusters (Nautilus and later) should prefer the built-in `pg_autoscaler` module, which the post does cover.
- In modern Ceph (Nautilus+), the `pg_autoscaler` module is enabled by default, so the `ceph mgr module enable pg_autoscaler` command may not be necessary on newer clusters. The command is still valid and harmless to run.
- In modern Ceph, pgp_num automatically follows pg_num when pg_num is changed, so specifying both explicitly in the `pool create` command is optional but not incorrect.
