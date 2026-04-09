# Validation Summary: How to Use Erasure Coding with RBD in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS Block Device / RBD)
- Ceph Erasure Coding (jerasure plugin, reed_sol_van technique)
- Rook (Ceph operator for Kubernetes)
- Kubernetes StorageClass and CSI provisioner
- CephBlockPool CRD

## Sources Consulted
- Ceph official documentation on erasure code profiles: https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/
- Ceph official documentation on erasure coded pools: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph RBD documentation on data pool support: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph pool operations documentation (allow_ec_overwrites): https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Block Storage StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/

## Issues Found
No technical issues found.

## Review Notes
- The `crush_failure_domain` parameter uses underscores while Ceph canonical documentation typically uses hyphens (`crush-failure-domain`). Both forms are accepted by Ceph, so this is not an error, but readers consulting official docs may see the hyphenated form.
- The pool creation commands specify explicit pg_num and pgp_num values (e.g., `32 32`). Modern Ceph clusters (Nautilus+) support pg autoscaling, so the explicit PG counts may not be necessary in newer deployments. However, specifying them is not incorrect and provides deterministic behavior.
- The 50% storage savings claim is mathematically verified: EC k=4,m=2 yields 1.5x raw overhead vs 3.0x for 3-way replication, a 50% reduction in raw storage consumption.
- The RBD object count of 25600 for a 100 GiB image is correct based on the default 4 MiB object size.
