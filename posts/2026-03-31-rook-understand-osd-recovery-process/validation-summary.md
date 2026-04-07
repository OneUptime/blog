# Validation Summary: How to Understand OSD Recovery Process in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD recovery, PG states, backfill)
- Rook (CephCluster CRD configuration)
- Kubernetes (toolbox pod, kubectl)

## Sources Consulted
- Ceph official documentation on OSD recovery: https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph documentation on placement group states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph configuration reference for OSD recovery parameters: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

1. **Incorrect claim about stale reads on degraded PGs (line 109):** The post stated "Degraded PGs may return stale reads if `min_size` is still met." This is incorrect. Degraded PGs with at least `min_size` available replicas continue to serve normal reads and writes. "Stale" is a distinct PG state in Ceph that indicates no OSD has reported to the monitor for that PG — it is unrelated to the `degraded` state. Fixed to state that degraded PGs serve normal I/O as long as `min_size` is met.

2. **Inaccurate description of `min_size` blocking condition (line 110):** The post stated "If PG count drops below `min_size`, reads and writes are blocked." The `min_size` threshold applies to the number of available replicas (acting set members) for a given PG, not to a "PG count." Fixed to clarify that it is the number of available replicas for a PG that must meet `min_size`.

## Review Notes
- The `osd_recovery_max_active` default of 3 is correct for HDD-backed OSDs, but modern Ceph versions (Nautilus+) also support `osd_recovery_max_active_hdd` (default 3) and `osd_recovery_max_active_ssd` (default 10) for device-type-specific tuning. The post could mention this distinction in a future update.
- The `spec.cephConfig` field shown in the Rook CephCluster YAML is a relatively newer addition. Operators using older Rook versions may need to use the `rook-config-override` ConfigMap instead.
- The `ceph -s` example output uses a `yaml` code fence but is not strictly YAML — this is a minor formatting choice and does not affect technical accuracy.
