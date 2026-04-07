# Validation Summary: How to Track Client IO Distribution in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (kubectl, PVCs, PVs)
- Prometheus (Ceph manager exporter)
- RBD (RADOS Block Device)

## Sources Consulted
- Ceph official documentation: `ceph -s` command output format (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph official documentation: `ceph osd pool stats` (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Ceph official documentation: `ceph osd perf` output fields (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Ceph official documentation: `rados df` output (https://docs.ceph.com/en/latest/man/8/rados/)
- Rook documentation: Ceph manager Prometheus metrics (https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/)
- Kubernetes documentation: kubelet volume stats metrics (https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/)

## Issues Found

1. **Prometheus metrics section referenced wrong metric source and wrong metrics**: The post instructed readers to port-forward to a CSI RBD plugin pod on port 9091 and grep for `kubelet_volume_stats_*` metrics. This was incorrect on two levels: (a) `kubelet_volume_stats_*` metrics are served by the kubelet, not by CSI plugin pods, and (b) those metrics measure storage capacity/usage, not IO rates. Fixed to use the Ceph manager Prometheus endpoint (`rook-ceph-mgr` service on port 9283) with the correct per-pool IO metrics (`ceph_pool_rd`, `ceph_pool_wr`, `ceph_pool_rd_bytes`, `ceph_pool_wr_bytes`).

2. **`ceph osd perf` output fields incorrectly described**: The post stated to compare `op_r` and `op_w` counters, but `ceph osd perf` outputs `commit_latency_ms` and `apply_latency_ms` (latency values), not operation counts. Fixed the description to reference the correct fields.

3. **Section title mismatch**: The section was titled "Use rados list to Find Heavy Objects" but used the `rados df` command, which shows pool-level storage statistics, not per-object IO activity. Renamed the section to "Use rados df to View Pool Usage" and adjusted the description to match what the command actually shows.

## Review Notes
- The `ceph osd pool stats` command and its sample output are accurate and well-formatted.
- The PVC-to-RBD image mapping jq command is correct for Rook CSI-provisioned volumes.
- For true per-client (per-IP) IO tracking, `ceph daemon osd.N perf dump` or the `ceph client perf` commands could be mentioned in a future update, but what is present is correct after fixes.
