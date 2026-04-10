# Validation Summary: How to Analyze Storage Capacity with ceph df

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (storage cluster) - `ceph df` and `ceph df detail` commands
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Python 3 (JSON parsing script)
- Bash scripting

## Sources Consulted
- Ceph Prometheus module source code (ceph/ceph on GitHub) - confirms `ceph df --format json` keys: `total_bytes`, `total_avail_bytes`, `total_used_raw_bytes` under `stats`
- Ceph Monitor Config Reference (Quincy): https://docs.ceph.com/en/quincy/rados/configuration/mon-config-ref/
- Ceph Troubleshooting OSDs (Reef): https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-osd/
- Red Hat ODF 4.17 - Setting Ceph OSD full thresholds: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/4.17/html/managing_and_allocating_storage_resources/setting-ceph-osd-full-thresholds__rhodf

## Issues Found
1. **Incorrect commands for setting full/nearfull ratios**: The post used `ceph config set global mon_osd_nearfull_ratio 0.75` and `ceph config set global mon_osd_full_ratio 0.85`. These `mon_osd_*` config keys only take effect during initial cluster creation; on a running cluster, the effective ratios live in the OSDMap, not the central config store. The correct runtime commands are `ceph osd set-nearfull-ratio 0.75` and `ceph osd set-full-ratio 0.85`. Fixed both commands in the "Set Capacity Alerts" section.

## Review Notes
- The `ceph df detail` description mentions "dirty (unflushed) bytes" which relates to the DIRTY column from cache tiering. Cache tiering has been deprecated since Ceph Luminous/Mimic. The column still appears in output but is not meaningful in modern deployments. This is not technically wrong but is somewhat outdated context.
- The `MAX AVAIL` formula `(total raw available) / replication_factor` is presented as a simplification. The actual calculation is more complex and accounts for CRUSH rules, OSD weight distribution, and the fullest OSD. The approximation is reasonable for a blog post.
- The JSON field names (`total_bytes`, `total_avail_bytes`, `total_used_raw_bytes`) were confirmed correct via Ceph source code.
- The Python arithmetic (1024**4 for TiB, 1024**3 for GiB) is correct.
- The sample output numbers are internally consistent (e.g., all pools show a 3x replication factor between STORED and USED).
