# Validation Summary: How to Set osd_recovery_op_priority in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD recovery configuration)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl toolbox access)

## Sources Consulted
- Ceph official documentation on OSD configuration options (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph recovery configuration reference (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/#recovery)
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph `ceph config` CLI reference (https://docs.ceph.com/en/latest/man/8/ceph/)

## Issues Found
No technical issues found.

## Review Notes
- The `osd_recovery_op_priority` default of 3 and `osd_client_op_priority` default of 63 are accurate for current Ceph releases.
- All CLI commands (`ceph config get/set`, `ceph tell osd.* injectargs`, `ceph osd pool set`, `ceph osd perf`, `ceph osd dump`, `ceph config dump`) use correct syntax.
- The `injectargs` flag format correctly uses dashes (`--osd-recovery-op-priority`) rather than underscores.
- The `recovery_priority` pool-level property is a valid pool attribute for relative recovery ordering between pools.
- The companion throttle parameters (`osd_recovery_max_active`, `osd_recovery_sleep_hdd`) are valid and the suggested values are reasonable.
- In newer Ceph releases, `osd_recovery_max_active` has been split into `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd` for per-device-type tuning, but the unified parameter still works as a fallback. This is a minor version-specific nuance, not an error.
- The Rook CephCluster YAML using `spec.cephConfig` is supported in recent Rook versions. The post also provides the toolbox CLI alternative, which works across all Rook versions.
