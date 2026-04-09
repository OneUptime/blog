# Validation Summary: How to Plan Cost-Effective Ceph Cluster Expansion

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (CLI commands: `ceph df`, `ceph osd`, `ceph config`)
- Rook (CephCluster CRD for storage node/device management)
- Prometheus (Ceph MGR Prometheus module metrics)
- Python 3 (CSV parsing, capacity trend analysis)
- Bash (cron-based utilization logging)

## Sources Consulted
- Ceph Reef OSD Config Reference — https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph Reef Monitoring a Cluster — https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph Reef Monitoring OSDs and PGs — https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph Quincy Monitor Config Reference — https://docs.ceph.com/en/quincy/rados/configuration/mon-config-ref/
- Ceph Prometheus Module Source — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph Reef mClock Config Reference — https://docs.ceph.com/en/reef/rados/configuration/mclock-config-ref/
- Rook CephCluster CRD Documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found
No technical errors requiring fixes were found. All commands, YAML configurations, calculations, and Prometheus metric names are correct.

## Review Notes
- **Full/nearfull/backfillfull ratios are defaults**: The commands `ceph osd set-full-ratio 0.95`, `set-backfillfull-ratio 0.90`, and `set-nearfull-ratio 0.85` set values that are already the Ceph defaults. This is not incorrect (explicitly setting defaults can be intentional for documentation or infrastructure-as-code purposes), but readers should understand these are not custom thresholds — the custom 70% procurement alert is the Prometheus rule below them.
- **`osd_recovery_max_active` split in Nautilus+**: Starting from Ceph Nautilus, `osd_recovery_max_active` was split into `osd_recovery_max_active_hdd` (default 3) and `osd_recovery_max_active_ssd` (default 10). Setting `osd_recovery_max_active` to a non-zero value still works and overrides the device-specific variants, but modern best practice is to use the HDD/SSD-specific settings.
- **`osd_max_backfills` default is already 1**: The command `ceph config set osd osd_max_backfills 1` sets the value to its default. The command is valid, but it may not actually throttle anything beyond the default behavior.
- **mClock scheduler in Reef**: In Ceph Reef, the mClock scheduler is enabled by default and may override `osd_max_backfills` and `osd_recovery_max_active` unless `osd_mclock_override_recovery_settings` is set to `true`.
- **TB vs TiB**: The growth rate calculation uses `1024**4` (binary) for conversion but labels the result as "TB/month" (which conventionally implies decimal/SI). In the Ceph/storage world this conflation is near-universal, but strictly speaking the output is TiB/month.
- **Device naming stability**: The Rook YAML uses bare device names (`sdb`, `sdc`, etc.) which can change across reboots. For production, stable identifiers via `/dev/disk/by-id/` or `devicePathFilter` are recommended.
- **`ceph df` JSON field**: The script uses `stats.total_used_bytes` which is valid. For capacity planning with replication overhead, `total_used_raw_bytes` may be more appropriate, but both fields exist in the JSON output.
