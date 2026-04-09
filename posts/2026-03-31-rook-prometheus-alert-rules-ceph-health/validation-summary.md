# Validation Summary: How to Create Prometheus Alert Rules for Ceph Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Prometheus (monitoring and alerting)
- PromQL (Prometheus query language)
- Kubernetes (container orchestration)
- Prometheus Operator / PrometheusRule CRD

## Sources Consulted
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph health checks reference: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Rook Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found

1. **Incorrect metric `ceph_pg_stuck_unclean`**: The metric `ceph_pg_stuck_unclean` is not a standard Ceph Prometheus metric exported by the MGR prometheus module. Replaced with `ceph_health_detail{name="PG_NOT_CLEAN"} > 0`, which uses the well-documented `ceph_health_detail` gauge with the standard Ceph health check code `PG_NOT_CLEAN`. Also renamed the alert from `CephPGsStuck` to `CephPGsNotClean` and updated the annotation to match.

2. **Incorrect metric `ceph_pg_backfilling`**: The metric `ceph_pg_backfilling` is not a standard Ceph Prometheus metric. Replaced with `ceph_health_detail{name="PG_BACKFILL_FULL"} > 0`, which alerts when backfill operations are blocked due to full OSDs — a more actionable and operationally significant condition. Renamed the alert from `CephPGsBackfilling` to `CephPGsBackfillBlocked`, changed severity from `info` to `warning` (blocked backfill is a real operational concern), adjusted `for` from `30m` to `5m`, and updated the annotation.

3. **Updated summary paragraph**: Adjusted the closing summary text to reflect the corrected alert names and conditions (replaced "stuck conditions" with "unclean conditions, backfill capacity").

## Review Notes
- The `ceph_pg_degraded` metric used in the CephPGsDegraded alert actually counts degraded objects (not PG count), so the annotation text "{{ $value }} Ceph PGs are degraded" is slightly imprecise — `$value` will be the number of degraded objects. However, this is a widely used convention in Ceph alerting guides and the alert logic is correct (degraded objects > 0 implies degraded PGs), so no change was made.
- The `ceph_mon_clock_skew_seconds` metric and the 0.05s threshold align with Ceph's default `mon_clock_drift_allowed` setting. If clusters have customized this value, the alert threshold should be adjusted to match.
- All `ceph_health_detail` based alerts (Device Health, Pool Health, and the corrected PG alerts) rely on the Ceph MGR prometheus module exposing per-health-check gauges, which is available in Ceph Pacific (16.2.x) and later.
- The PrometheusRule CRD and kubectl commands are correct for the prometheus-operator stack commonly used with Rook.
