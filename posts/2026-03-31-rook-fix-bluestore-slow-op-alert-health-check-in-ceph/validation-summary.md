# Validation Summary: How to Fix BLUESTORE_SLOW_OPS Health Check in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore storage backend)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl commands)
- Prometheus (alerting rules)
- Linux kernel I/O schedulers

## Sources Consulted
- [Health Checks — Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- [ceph/doc/rados/operations/health-checks.rst (GitHub)](https://github.com/ceph/ceph/blob/main/doc/rados/operations/health-checks.rst)
- [BlueStore Configuration Reference — Ceph Documentation](https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/)
- [Troubleshooting OSDs — Ceph Documentation](https://docs.ceph.com/en/quincy/rados/troubleshooting/troubleshooting-osd/)
- [Prometheus Module — Ceph Documentation](https://docs.ceph.com/en/latest/mgr/prometheus/)
- [OSD(s) experiencing slow operations in BlueStore — rook/rook Discussion #15403](https://github.com/rook/rook/discussions/15403)
- [Ceph Prometheus Monitoring Mixins](https://monitoring.mixins.dev/ceph/)

## Issues Found

1. **Incorrect health check name**: The post used `BLUESTORE_SLOW_OP_ALERT` throughout, but the actual Ceph health check code is `BLUESTORE_SLOW_OPS`. Changed all occurrences to the correct name.

2. **Wrong default threshold value**: The post claimed the default threshold is "2 seconds." This is incorrect. The BLUESTORE_SLOW_OPS health check is controlled by `bluestore_slow_ops_warn_lifetime` (default 86400 seconds / 24 hours) and `bluestore_slow_ops_warn_threshold` (default 1). The underlying slow op detection uses `osd_op_complaint_time` which defaults to 30 seconds. Corrected the explanation to describe how the health check actually works.

3. **Wrong config option name**: The post used `bluestore_slow_ops_warn_count` which is not a valid Ceph config option. The correct option is `bluestore_slow_ops_warn_threshold`. Fixed the config command.

4. **Unreasonable config value for lifetime**: The post set `bluestore_slow_ops_warn_lifetime` to 10 (seconds), which is far too aggressive and would effectively suppress all warnings. Changed to 300 (5 minutes), which is a commonly recommended tuning value per community discussions.

5. **Incorrect health detail output format**: The example `ceph health detail` output did not match actual Ceph output. Updated to use the real format: `BLUESTORE_SLOW_OPS: 1 OSD(s) experiencing slow operations in BlueStore`.

6. **Imprecise Prometheus alert expression**: The post used `ceph_health_status == 1` which triggers on any HEALTH_WARN, not specifically BlueStore slow ops. Changed to `ceph_health_detail{name="BLUESTORE_SLOW_OPS"} == 1` which targets this specific health check using the `ceph_health_detail` metric exposed by the Ceph Prometheus module.

## Review Notes
- The Rook CephCluster YAML for separating data/WAL/DB onto different storage classes is correct and follows the documented `storageClassDeviceSets` pattern.
- The I/O scheduler recommendations (`none` for NVMe, `mq-deadline` for SSD/HDD) are standard and correct.
- The OSD recovery throttling options (`osd_max_backfills`, `osd_recovery_max_active`) are valid Ceph config options. Note that newer Ceph versions (Pacific+) also provide `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd` for per-device-type tuning.
- The `iostat` command via the rook-ceph-tools pod is a valid diagnostic approach.
