# Validation Summary: How to Monitor QoS Metrics in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD, RBD, mClock scheduler)
- Rook (Ceph operator for Kubernetes)
- Prometheus (metrics scraping and alerting)
- Grafana (dashboard queries / PromQL)
- Ceph admin socket commands
- Ceph mgr Prometheus module

## Sources Consulted
- Ceph Prometheus Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph mClock Config Reference: https://docs.ceph.com/en/reef/rados/configuration/mclock-config-ref/
- Ceph Monitoring overview: https://docs.ceph.com/en/reef/monitoring/
- Ceph OSD admin socket command reference
- rbd man page: https://docs.ceph.com/en/reef/man/8/rbd/
- Prometheus alerting best practices for counter/histogram metrics

## Issues Found

1. **`dump_mclock_queue` admin socket command does not exist** (line 31): The command `ceph daemon osd.0 dump_mclock_queue` is not a documented or verifiable Ceph admin socket command. Replaced with `ceph daemon osd.0 perf dump | python3 -m json.tool | grep -A5 "mclock"` which achieves the same goal of inspecting mClock queue state through documented perf counters.

2. **`rbd status` described as showing throttle counters** (line 51): The text claimed `rbd status mypool/vm-disk` shows "per-image statistics including throttle counters". In reality, `rbd status` shows image watchers and lock status, not throttle counters. Fixed the description to accurately say "per-image watchers and lock status".

3. **Incorrect sort column in `ceph osd perf` pipeline** (lines 139, 146): The command used `sort -k4 -rn` but `ceph osd perf` outputs only 3 columns (osd, commit_latency, apply_latency). Column 4 does not exist. Fixed to `sort -k3 -rn` to sort by apply_latency, which is the most relevant metric for client-perceived latency.

4. **Alert expression missing `rate()` function** (line 117): The alert `CephHighOSDLatency` used `ceph_osd_op_latency_sum / ceph_osd_op_latency_count > 0.05`, which computes the all-time average latency from monotonically increasing counters. This would rarely trigger because the all-time average gets diluted over time. Fixed to `rate(ceph_osd_op_latency_sum[5m]) / rate(ceph_osd_op_latency_count[5m]) > 0.05` to compute the 5-minute moving average, which correctly detects recent latency spikes.

5. **Non-existent `ceph_osd_op` Prometheus metric** (lines 77, 96, 102): The metric `ceph_osd_op` is not a standard Ceph Prometheus metric. Ceph exports separate read and write operation counters: `ceph_osd_op_r` and `ceph_osd_op_w`. Fixed the Prometheus metrics list and all Grafana queries to use `ceph_osd_op_r` and `ceph_osd_op_w` instead.

## Review Notes
- The `ceph_osd_recovery_ops` metric name follows Ceph's naming convention (from native perf counter `osd.recovery_ops`) but is not explicitly listed in all versions of the official monitoring documentation. It is plausible and left as-is.
- The `ceph_osd_op_wip` metric is a valid native perf counter (`osd.op_wip`) but in recent Ceph versions (Reef+), it may be exposed via `ceph-exporter` rather than the mgr Prometheus module, depending on the `exclude_perf_counters` setting. This is noted as a version-specific caveat.
- Metric names can vary across Ceph releases (Pacific, Quincy, Reef). Readers should verify metric availability against their specific Ceph version.
- The `CephRecoveryThrottled` alert fires when recovery ops rate is below 10/s, but a low recovery rate could also mean recovery is complete (not just throttled). The alert logic is a design choice rather than a technical error, so it was left unchanged.
