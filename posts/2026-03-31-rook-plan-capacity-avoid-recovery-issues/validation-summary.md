# Validation Summary: How to Plan Capacity to Avoid Recovery Issues in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Prometheus (alerting rules for Ceph metrics)
- Bash scripting (capacity assessment and forecasting scripts)
- Python 3 (inline calculations)

## Sources Consulted
- Ceph Monitor Config Reference — https://github.com/ceph/ceph/blob/main/doc/rados/configuration/mon-config-ref.rst
- Ceph Pools Documentation — https://github.com/ceph/ceph/blob/main/doc/rados/operations/pools.rst
- Ceph MGR Prometheus Module source — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph Monitoring Documentation — https://github.com/ceph/ceph/blob/main/doc/monitoring/index.rst
- Ceph Mixins Alert Rules — https://github.com/ceph/ceph-mixins/blob/master/extras/manifests/prometheus-ceph-rules.yaml
- Ceph OSD Source (stat_bytes counters) — https://github.com/ceph/ceph/blob/main/src/osd/OSD.cc
- Ceph Troubleshooting OSDs — https://docs.ceph.com/en/quincy/rados/troubleshooting/troubleshooting-osd/

## Issues Found

1. **Incorrect backfillfull threshold description**: The post stated the backfillfull threshold was "90% of 95% full ratio = ~85% capacity", implying it was derived from the full ratio. In reality, `osd_backfillfull_ratio` is an independent absolute threshold defaulting to 0.90 (90% of total OSD capacity). Fixed to: "90% of total OSD capacity".

2. **Incorrect headroom calculation in comment**: The inline comment said "~909 GB" for 10 TB / 11 OSDs, but the accompanying Python code uses 1024 GB per TB, which produces ~931 GB (10240 / 11 = 930.9). The comment used decimal TB (1 TB = 1000 GB) while the code used binary (1 TB = 1024 GB). Fixed the comment to "~931 GB" to match the code output.

3. **Invalid pool quota command**: `ceph osd pool get <pool> quota` is not a valid Ceph command. The correct command for retrieving pool quotas is `ceph osd pool get-quota <pool>` (hyphenated subcommand). Fixed accordingly.

## Review Notes
- The `ceph osd df` column positions used in the awk commands (e.g., `$8` for the %USE column) may vary between Ceph versions. The commands are reasonable for typical Ceph output but readers should verify column positions for their specific version.
- The safe operational zones (Green/Yellow/Orange/Red) are sensible operational recommendations that provide buffer before the actual Ceph hard thresholds kick in.
- All Prometheus metric names (`ceph_osd_stat_bytes_used`, `ceph_osd_stat_bytes`, `ceph_cluster_total_used_raw_bytes`, `ceph_cluster_total_bytes`) are valid metrics from the built-in Ceph MGR Prometheus module (port 9283). Note these differ from the third-party DigitalOcean `ceph_exporter` metric names.
- The `ceph df --format json` JSON paths (`stats.total_used_raw_bytes`, `stats.total_bytes`) are correct.
- The PG autoscaler and balancer commands are correct and current.
