# Validation Summary: How to Configure OSD Recovery Settings in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD recovery subsystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- CephCluster CRD (Rook custom resource)

## Sources Consulted
- Ceph OSD Config Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph Configuration Guide: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Advanced Ceph Configuration: https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Ceph Monitoring a Cluster: https://docs.ceph.com/en/reef/rados/operations/monitoring/

## Issues Found

1. **Incorrect config option name `osd_recovery_priority`**: The post listed `osd_recovery_priority` as a key recovery parameter. The correct Ceph config option name is `osd_recovery_op_priority`. Fixed in the Key Recovery Parameters section.

2. **Incorrect Rook CephCluster CRD key for OSD config**: The YAML snippet used `osd:` as the key under `spec.cephConfig`, but Rook requires `"osd.*":` (quoted, with wildcard) to target all OSDs. Fixed the YAML example to use `"osd.*":`.

## Review Notes
- The `watch -n 5 ceph status` command works but Ceph provides native alternatives: `ceph -w` for real-time streaming of cluster events, and `ceph progress` for recovery progress with ETAs. These are more idiomatic but the current command is not incorrect.
- All `ceph config set` and `ceph config rm` command syntax is correct.
- All config option names (after fixes) are valid in Ceph Reef and Squid releases.
- When the mClock scheduler is active (default in newer Ceph versions), these recovery settings may be overridden unless `osd_mclock_override_recovery_settings` is set to `true`. The post does not mention this caveat.
- Default values for reference: `osd_recovery_max_active_hdd` = 3, `osd_recovery_max_active_ssd` = 10, `osd_max_backfills` = 1, `osd_recovery_sleep_hdd` = 0.
