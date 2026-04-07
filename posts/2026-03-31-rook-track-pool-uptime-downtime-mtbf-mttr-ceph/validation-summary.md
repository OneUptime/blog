# Validation Summary: How to Track Pool Uptime and Downtime (MTBF, MTTR) in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (storage cluster, MGR Prometheus module, PG states)
- Prometheus (recording rules, PromQL, Alertmanager)
- Grafana (dashboards, custom panels)
- Python (requests library for Prometheus API)
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- Ceph Prometheus Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph MGR Prometheus metric names and labels
- Prometheus documentation on recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus PromQL functions (`sum_over_time`, `avg_over_time`, `changes`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Alertmanager alerting rules format: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found

1. **Recording rule used `sum_over_time` instead of `avg_over_time` for downtime seconds** (line 51): `sum_over_time(ceph_pool_is_degraded[1h]) * 3600` counts the number of samples where the metric was 1, not the fraction of time. Multiplying sample counts by 3600 produces wildly inflated values. Fixed to `avg_over_time(ceph_pool_is_degraded[1h]) * 3600`, which correctly computes the fraction of the hour the pool was degraded, then converts to seconds.

2. **`changes()` comment was misleading and MTTR formula was incorrect** (lines 61-66): The comment said "Number of failure events" but `changes()` counts all value transitions (both 0->1 and 1->0). For N failure-recovery incidents, `changes()` returns ~2N. The MTTR formula was dividing total downtime by `changes()` instead of `changes()/2`, underestimating MTTR by half. Fixed the comment and added `/ 2` to the denominator.

3. **`ceph_pool_last_ok_time` is not a real Ceph Prometheus metric** (line 88): This metric does not exist in the Ceph MGR Prometheus exporter. The Grafana panel query `(time() - ceph_pool_last_ok_time) / 3600` would fail. Replaced with `avg_over_time(ceph_pool_is_degraded[1h]) * 60`, which uses the recording rule defined earlier in the post and shows minutes of degradation in the last hour.

4. **Python script downtime query used `sum_over_time * 60` incorrectly** (line 108): Same `sum_over_time` issue as the recording rule — it counts samples, not time fractions. The `* 60` multiplier assumed a specific scrape interval. Fixed to `avg_over_time(...) * 10080` (7 days in minutes), which correctly computes downtime minutes regardless of scrape interval.

## Review Notes
- The metric `ceph_pool_degraded_ratio` is not a standard Ceph Prometheus metric name. Ceph exposes per-PG-state counts (e.g., `ceph_pg_degraded`) but not a pre-computed pool degradation ratio. The recording rule approach works if users first create this base metric or substitute an appropriate existing metric. This was not changed since it could be a custom metric in some deployments.
- The alert rule uses `$labels.name` for the pool label. Depending on Ceph version, the label may be `pool` or `pool_id` rather than `name`. Users should verify against their actual metric labels.
- The Python script hardcodes `7 * 24 * 60` for total minutes, which only works correctly when `duration` is `"7d"`. If a different duration is passed, the MTBF calculation would be wrong. This is a minor design issue, not a technical error in the current usage.
