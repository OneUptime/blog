# Validation Summary: How to Target Specific Device Classes in CRUSH Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH algorithm, OSD management, pool configuration)
- Ceph CRUSH shadow hierarchies and device classes
- Rook (CephBlockPool CRD)
- crushtool (CRUSH map compilation/decompilation)

## Sources Consulted
- Ceph official documentation: CRUSH map rules and device classes (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: Pool operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph CLI reference for `ceph osd crush rule create-replicated` (https://docs.ceph.com/en/latest/man/8/ceph/)
- Rook CephBlockPool CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph CRUSH rule DSL syntax for `step take <root> class <class>` directive

## Issues Found
No technical issues found.

## Review Notes
- The pool creation commands specify explicit pg_num and pgp_num values (e.g., `128 128`). In Ceph Nautilus (14.x) and later, pgp_num automatically follows pg_num, and PG autoscaling is enabled by default. The explicit values are not incorrect but may be unnecessary in modern clusters.
- The `grep "osd.$osd"` in the verification loop treats the dot as a regex wildcard rather than a literal dot. In practice this works fine since `ceph osd tree` output follows the `osd.N` format, but a more precise pattern would escape the dot (`osd\.$osd`). This is a minor style point, not a functional error.
- The manual CRUSH rule section mentions erasure coded pools as a use case for manual editing, but the example shows a `type replicated` rule. This is not incorrect — the point is that manual editing provides more control — but an erasure coded example could complement the section in a future update.
