# Validation Summary: How to Monitor ceph_rgw_req Metric for RGW Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook-Ceph (Kubernetes operator)
- Prometheus / PromQL
- Grafana
- Kubernetes (kubectl)

## Sources Consulted
- Ceph documentation on RGW metrics exposed by the MGR Prometheus module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph documentation on RGW performance counters: https://docs.ceph.com/en/latest/radosgw/
- Prometheus documentation on `rate()` function and aggregation operators: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference for `humanizePercentage`: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/

## Issues Found

1. **Invalid PromQL `by` clause without aggregation operator (line 109)**: `rate(ceph_rgw_req[5m]) by (ceph_daemon)` is not valid PromQL. The `by` clause can only be used with aggregation operators like `sum`, `avg`, etc. Changed to `sum(rate(ceph_rgw_req[5m])) by (ceph_daemon)`.

2. **Invalid PromQL `* by` syntax in Grafana queries (lines 133, 136)**: `rate(ceph_rgw_put[5m]) * by (ceph_daemon)` and the corresponding GET query used `* by` which is not valid PromQL syntax (`* by` is a binary operation modifier that requires a right-hand operand). Changed both to `sum(rate(...)) by (ceph_daemon)`.

3. **`humanizePercentage` misuse in alert annotation (line 91)**: The alert expression `(rate(ceph_rgw_failed_req[5m]) / rate(ceph_rgw_req[5m])) * 100 > 5` produces values like `6` for 6%, but `humanizePercentage` treats input as a ratio (0-1) and multiplies by 100 internally, so it would display "600%" instead of "6%". Fixed by changing the expression to use ratio form `> 0.05` (without `* 100`), which makes it compatible with `humanizePercentage`.

4. **Non-existent latency metrics (lines 125-126)**: `ceph_rgw_request_duration_seconds_sum` and `ceph_rgw_request_duration_seconds_count` do not exist in the Ceph MGR Prometheus module. The actual RGW latency metrics are `ceph_rgw_get_initial_lat_sum`/`ceph_rgw_get_initial_lat_count` and `ceph_rgw_put_initial_lat_sum`/`ceph_rgw_put_initial_lat_count`. Replaced with the correct metric names and split into separate GET and PUT latency queries.

## Review Notes
- The first CLI command (`ceph status | grep rgw`) pipes through grep on the host side, which is fine since the `--` separates kubectl args from the command. However, if the intent is to run the full pipeline inside the tools pod, wrapping it in `bash -c` would be more explicit. This is a minor style point and not a correctness issue.
- The `CephRGWRequestDropped` alert logic (`rate == 0 and counter > 0`) is a reasonable pattern for detecting a daemon that was previously active but has stopped serving requests.
- The latency metrics (`ceph_rgw_get_initial_lat_*`) measure initial latency (time to first byte), not total request duration. This is a meaningful distinction for large object transfers but is the standard latency metric available from Ceph's MGR Prometheus module.
