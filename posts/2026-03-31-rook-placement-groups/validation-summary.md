# Validation Summary: How to Configure Rook-Ceph Placement Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Kubernetes
- CRUSH algorithm
- Ceph Placement Groups (PGs)
- Ceph pg_autoscaler module
- CephBlockPool CRD (ceph.rook.io/v1)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph PG Autoscaler documentation: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph Nautilus (14.x) release notes on PG merging and non-power-of-2 PG counts

## Issues Found

1. **PG count formula missing pool count divisor**: The formula was labeled "Target PGs per pool" but only divided by the replication factor, omitting the number of pools. With the original formula, each pool in a multi-pool cluster would get the total PG budget, leading to significant over-provisioning (e.g., 3 pools × 450 PGs each = 1350 total PGs instead of the targeted 450). Fixed by adding `number of pools` to the denominator and updating the example to use 3 pools, yielding 150 PGs per pool.

2. **"PG counts must be powers of 2"**: This was a hard requirement in older Ceph releases (pre-Nautilus) but is no longer enforced since Ceph Nautilus (14.x), which introduced improved PG splitting/merging for arbitrary counts. Changed "must be" to "are recommended to be" and noted the Nautilus change. This is consistent with the post already referencing Ceph 14+ features (PG merging section).

## Review Notes
- The PG memory overhead figure of "~100KB RAM per PG" is on the low end of commonly cited estimates. Many Ceph resources cite 1-2 MB per PG when including PG log state and peering metadata. The actual number varies by Ceph version, workload, and PG log depth. Left as-is since it uses an approximate qualifier (~) and some sources do cite numbers in this range for basic PG metadata.
- In the "Changing PG Count on Existing Pools" section, the comment notes to set pgp_num after pg_num. Since Ceph Nautilus (14.x), pgp_num automatically follows pg_num, so explicitly setting pgp_num is no longer strictly necessary. The commands still work correctly, so this is not an error, but could be noted as legacy practice.
- The `ceph pg dump | awk '{print $14}'` command for PG distribution is fragile as column numbers in `ceph pg dump` output vary across Ceph versions. This is a common pattern in tutorials but may need adjustment for specific Ceph releases.
- All Rook CRD YAML snippets use the correct `ceph.rook.io/v1` API version and valid field structure for CephBlockPool resources.
- All kubectl exec commands correctly target `deploy/rook-ceph-tools` which is the standard Rook toolbox deployment.
