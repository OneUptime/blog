# Validation Summary: How to Tune osd_recovery_max_active for Faster Recovery in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (storage cluster recovery tuning)
- Rook (Ceph operator for Kubernetes)
- OSD recovery configuration parameters
- Bash scripting for dynamic recovery mode switching

## Sources Consulted
- Ceph official documentation for OSD configuration options (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph Nautilus (14.2.0) release notes for device-class-specific recovery options
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph CLI reference for `ceph config`, `ceph status`, `ceph daemon` commands

## Issues Found

1. **Incorrect version for device-class-specific options**: The post stated "Ceph 15+" introduced `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd`. These were actually introduced in Ceph Nautilus (14.2.0). Changed to "Ceph Nautilus (14.2.0)+".

2. **Conflation of recovery and backfill**: The original text stated `osd_recovery_max_active` "includes both incoming (backfill) and outgoing (primary) recovery work." In Ceph, recovery and backfill are distinct operations — backfill is controlled by `osd_max_backfills`, not `osd_recovery_max_active`. Clarified the description to distinguish between the two.

3. **Incorrect monitoring command**: `ceph osd perf | grep recovering` would produce no output because `ceph osd perf` only shows `commit_latency_ms` and `apply_latency_ms`, not recovery metrics. Replaced with `ceph status | grep recovery`, which actually displays recovery progress information.

4. **Inconsistent recovery time example**: The text claimed "4 TB OSD at 100 MB/s takes approximately 11 hours" with 3 ops. Using the post's own formula with single_op_speed=100 MB/s gives ~3.9 hours, not 11. The 11-hour figure is correct if 100 MB/s is total disk throughput (~33 MB/s per op). Clarified the text to specify per-op speed of ~33 MB/s to be consistent with the formula and the 11-hour result.

## Review Notes
- The `ceph daemon osd.$i perf dump` command in the monitoring section requires running on the OSD host directly. In a Rook/Kubernetes environment, users would need to `kubectl exec` into the OSD pod first. The post could mention this but it's not technically incorrect.
- The dynamic adjustment script's "normal" mode sets `osd_recovery_sleep_hdd` but the "fast" mode sets `osd_recovery_sleep` (the generic variant). This is functional but slightly inconsistent — the generic setting acts as a fallback, so setting it to 0 effectively disables sleep for both HDD and SSD.
- The Rook CephCluster YAML configuration section uses `spec.cephConfig` which is the correct field for setting Ceph configuration options via the Rook CRD.
