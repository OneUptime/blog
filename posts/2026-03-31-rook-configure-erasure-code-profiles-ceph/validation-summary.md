# Validation Summary: How to Configure Erasure Code Profiles in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (erasure code profiles, CRUSH, OSD management)
- Rook (CephBlockPool CRD for Kubernetes)
- Erasure coding plugins: jerasure, isa, lrc, shec
- Kubernetes (Rook operator deployment context)

## Sources Consulted
- [Erasure code profiles — Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- [Erasure code — Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- [Locally repairable erasure code plugin — Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/erasure-code-lrc/)
- [SHEC erasure code plugin — Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/erasure-code-shec/)
- [CephBlockPool CRD — Rook Documentation](https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/)

## Issues Found
- **Default profile `m` value was incorrect**: The post stated the default erasure code profile has `m=1`, but the Ceph documentation confirms the default is `k=2, m=2`. Fixed `m=1` to `m=2` in the example output block under "Listing Existing Profiles."

## Review Notes
- The post uses "parity chunks" to describe the `m` parameter. Ceph's official documentation uses "coding chunks." Both terms are widely understood in the erasure coding context, so this is not an error, but readers consulting the official docs should be aware of the terminology difference.
- The Rook YAML example creates a standalone erasure-coded CephBlockPool. For actual RBD (block device) usage, a separate replicated metadata pool is typically required alongside the EC data pool. This is outside the scope of the post (which focuses on EC profiles), but users following the example for production block storage should consult the Rook documentation for the full setup.
- All CLI commands (`ceph osd erasure-code-profile ls/get/set/rm`, `crushtool`, `ceph osd pool ls detail`) are syntactically correct and use current flags.
- LRC plugin example (`k=4 m=2 l=3`) is valid: (k+m)=6 is divisible by l=3.
- SHEC plugin example (`k=4 m=3 c=2`) is valid: c=2 <= m=3.
