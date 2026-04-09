# Validation Summary: How to Monitor OSD Health and Replacement Needs in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (OSD monitoring)
- Kubernetes (kubectl, DaemonSet)
- Ceph CLI (`ceph osd stat`, `ceph osd tree`, `ceph osd df`, `ceph osd perf`)
- Prometheus (alerting rules, Ceph MGR Prometheus module)
- Prometheus node_exporter (textfile collector with smartmon scripts)
- SMART disk health monitoring

## Sources Consulted
- Prometheus node_exporter GitHub repository: https://github.com/prometheus/node_exporter
- node-exporter-textfile-collector-scripts (smartmon.sh/smartmon.py): https://github.com/prometheus-community/node-exporter-textfile-collector-scripts
- smartctl_exporter GitHub repository: https://github.com/prometheus-community/smartctl_exporter
- Ceph MGR Prometheus module documentation and metric names
- Prior validated posts in this blog repository confirming Ceph Prometheus metric names (`ceph_osd_up`, `ceph_osd_commit_latency_ms`, `ceph_osd_stat_bytes_used`, `ceph_osd_stat_bytes`)

## Issues Found

1. **`--collector.smartmon` flag does not exist in node_exporter (Step 3):** There is no built-in `smartmon` collector in node_exporter. SMART monitoring requires the textfile collector approach: running the `smartmon.sh` or `smartmon.py` script from the prometheus-community/node-exporter-textfile-collector-scripts repository via cron, writing `.prom` files to a textfile directory, and configuring node_exporter with `--collector.textfile.directory`. Fixed the DaemonSet YAML to use the textfile collector with the correct flag and directory configuration. Added explanatory text about the smartmon script requirement.

2. **Incorrect SMART metric names (Step 3):** The metrics `smartmon_reallocated_sector_count`, `smartmon_uncorrectable_error_count`, and `smartmon_wear_leveling_count` do not exist as standalone metrics. The smartmon scripts expose SMART attributes via `smartmon_attr_raw_value` with `attr_name` labels. Fixed to: `smartmon_attr_raw_value{attr_name="Reallocated_Sector_Ct"}`, `smartmon_attr_raw_value{attr_name="Offline_Uncorrectable"}`, and `smartmon_attr_raw_value{attr_name="Wear_Leveling_Count"}`.

3. **Missing `securityContext` for SMART access (Step 3):** The DaemonSet was missing `securityContext: privileged: true`, which is required for smartctl to access raw block devices. Added the privileged security context.

4. **`ceph_osd_utilization` is not a valid Ceph MGR Prometheus metric (Step 4):** This metric is not exposed by the built-in Ceph MGR Prometheus module. It only exists in the third-party DigitalOcean ceph_exporter. Fixed the CephOSDNearFull alert expression to `(ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) * 100 > 85`.

5. **Incorrect `$7` column reference for `ceph osd df` (Step 5):** The `%USE` column position in `ceph osd df` output varies across Ceph versions and does not reliably map to awk field `$7`. Replaced with `ceph osd df --format json | jq` for version-independent parsing.

## Review Notes
- The `ceph osd perf` awk parsing in Step 5 assumes a plain text table output, which is the default in most Ceph versions. For maximum robustness, JSON output with jq could also be used there, but the current awk approach is functional.
- With modern BlueStore (default since Ceph Luminous), `commit_latency_ms` and `apply_latency_ms` are effectively identical because BlueStore has no separate journal. The distinction was meaningful under legacy FileStore. This is technically accurate but could be noted for reader context.
- The Prometheus alert metrics `ceph_osd_up` and `ceph_osd_commit_latency_ms` are confirmed correct for the built-in Ceph MGR Prometheus module.
