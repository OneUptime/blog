# Validation Summary: How to Fix TOO_FEW_OSDS Health Check in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph OSDs (Object Storage Daemons)
- Kubernetes (kubectl commands)

## Sources Consulted
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph official documentation on OSD management: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph `health mute` documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/#muting-health-checks
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph configuration reference for `mon_osd_min_in_ratio`: https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/

## Issues Found
- **Fix 4 - Incorrect suppression command**: The post used `ceph config set mon mon_osd_min_in_ratio 0.5` to suppress the `TOO_FEW_OSDS` warning. This is incorrect because `mon_osd_min_in_ratio` controls the minimum ratio of "in" OSDs before automatic OSD mark-out is disabled — it has no effect on the `TOO_FEW_OSDS` health check. Changed to `ceph health mute TOO_FEW_OSDS`, which is the correct Ceph mechanism for temporarily suppressing a specific health warning.

## Review Notes
- The `ceph osd in` command in Fix 3 is correct for the described scenario (OSD auto-marked out after being down), though readers should note that this command changes the in/out state, not the up/down state. The accompanying deployment restart handles bringing the daemon back up.
- Setting `min_size 1` in Fix 2 is technically correct but carries significant risk of data loss. The post appropriately frames this as a workaround, not a recommended solution.
- The Minimum OSD Recommendations table provides reasonable guidance, though exact recommendations can vary based on failure domain layout and workload.
