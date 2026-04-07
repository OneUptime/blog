# Validation Summary: How to Understand Placement Groups in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (Placement Groups, CRUSH algorithm, OSD management)
- Rook (CephBlockPool CRD, rook-ceph-tools pod)
- Kubernetes (kubectl exec)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on PG states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on PG autoscaler: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph CRUSH algorithm documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/

## Issues Found
No technical issues found.

## Review Notes
- The PG sizing formula, example calculation, and power-of-2 rounding recommendation are all consistent with official Ceph documentation.
- Since Ceph Nautilus, `pg_num` no longer strictly needs to be a power of 2 (PG splitting/merging is supported), but rounding to a power of 2 remains recommended practice and is not incorrect.
- The ~150 KB per-PG memory overhead figure is a commonly cited approximation. Actual overhead varies by version and workload but the figure is reasonable for planning purposes.
- The PG autoscaler is enabled by default in newer Ceph releases (Pacific+). The post correctly shows how to enable it manually, which is useful for clusters where it may be disabled.
- All `kubectl exec` commands correctly target the `rook-ceph-tools` pod in the `rook-ceph` namespace, consistent with standard Rook deployments.
