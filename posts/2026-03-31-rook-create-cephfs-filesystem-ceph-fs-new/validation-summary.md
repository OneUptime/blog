# Validation Summary: How to Create a CephFS Filesystem with ceph fs new

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CephFS filesystem management)
- Rook (Kubernetes Ceph operator)
- CephFS (POSIX-compliant distributed filesystem)
- Kubernetes (kubectl CLI)
- Ceph MDS (Metadata Server) daemons
- Erasure coding for Ceph pools

## Sources Consulted
- Ceph official documentation: `ceph fs new` command reference (https://docs.ceph.com/en/latest/cephfs/createfs/)
- Ceph official documentation: OSD pool management (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph official documentation: Erasure code profiles (https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- Rook documentation: CephFilesystem CRD (https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Ceph official documentation: CephFS with erasure-coded pools (https://docs.ceph.com/en/latest/cephfs/createfs/#adding-a-data-pool-to-the-filesystem)

## Issues Found
No technical issues found.

## Review Notes
- The pool creation commands use explicit PG numbers (e.g., `16`, `64`), which is the legacy syntax. Since Ceph Nautilus (14.x), the PG autoscaler is enabled by default and explicit PG counts are generally unnecessary. However, the syntax is still valid and functional, so this is not an error.
- The `allow_ec_overwrites true` setting is correctly noted as required for using erasure-coded pools with CephFS — this is an important detail that is often missed.
- The Rook CephFilesystem CRD spec matches the current `ceph.rook.io/v1` API and includes all essential fields (`metadataPool`, `dataPools`, `metadataServer`, `preserveFilesystemOnDelete`).
