# Validation Summary: How to Fix Undersized PGs in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster, PG management, OSD operations)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands, pod management)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on health checks (PG_DEGRADED): https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph official documentation on OSD management (`set noout`, `osd tree`): https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph `pg dump_stuck` command reference: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/#stuck-placement-groups
- Rook documentation on the CephCluster CRD and toolbox: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- Setting `min_size=1` (shown in the structural fix section) is technically correct but carries significant risk in production — it allows I/O to continue with only a single replica, meaning a second OSD failure would result in data loss. The post could benefit from a warning about this in the future, but this is a best-practice suggestion rather than a technical error.
- The `watch` command inside the toolbox container works because the rook-ceph-tools image includes common Linux utilities. This is a reasonable approach for monitoring recovery.
- All `kubectl` commands correctly reference the default Rook namespace (`rook-ceph`) and the standard Rook deployment names. Users with custom namespaces would need to adjust accordingly, but this is standard practice for Rook documentation.
