# Validation Summary: How to Set pg_num and pgp_num Optimally in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (Placement Groups, PG autoscaler, OSD pools)
- Rook (CephBlockPool CRD)
- Kubernetes (kubectl exec into toolbox)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph PG Autoscaler documentation: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph PG Calculator guidance: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#choosing-the-number-of-placement-groups

## Issues Found
- **Inaccurate memory claim**: The post stated "Each PG consumes memory on every OSD daemon." This is incorrect — each PG consumes memory only on the OSDs that host it (primary + replicas), not on every OSD in the cluster. Changed to "Each PG consumes memory on the OSDs that host it."

## Review Notes
- The formula, example calculation (300 rounded to 256), and 50-100 PGs per OSD target are all consistent with Ceph documentation.
- The advice to always set `pgp_num` to match `pg_num` is safe across all versions. In Ceph Nautilus (14.2+), `pgp_num` automatically follows `pg_num` when increased, making the explicit set redundant but harmless.
- Rounding to the nearest power of 2 is no longer strictly required in modern Ceph (Luminous+), but remains a common best practice and is not incorrect advice.
- The Rook CRD examples use the correct `parameters` field for setting `pg_num`, `pgp_num`, and `pg_autoscale_mode`.
- All CLI commands (`ceph osd pool set`, `ceph osd pool autoscale-status`, `ceph mgr module enable pg_autoscaler`) are correct.
