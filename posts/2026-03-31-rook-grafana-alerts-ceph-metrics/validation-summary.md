# Validation Summary: How to Set Up Grafana Alerts for Ceph Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Unified Alerting (9+)
- Prometheus
- Ceph (metrics exported by MGR Prometheus module)
- Rook (Ceph operator for Kubernetes)
- Alertmanager API (via Grafana)

## Sources Consulted
- Ceph Prometheus Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph monitoring documentation: https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph upstream alert rules: https://github.com/ceph/ceph/blob/main/monitoring/ceph-mixin/prometheus_alerts.yml
- Ceph MGR Prometheus module source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph dashboard pool usage fix (PR #35768): https://github.com/ceph/ceph/pull/35768
- Grafana silence API documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-silence/
- Grafana annotation/label template reference: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/reference/
- Grafana notification policies documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-notification-policy/

## Issues Found

### 1. Pool capacity formula was incorrect (line 57)
**What was wrong:** The PromQL formula `(ceph_pool_bytes_used / ceph_pool_max_avail) * 100 > 75` is mathematically incorrect. `ceph_pool_max_avail` represents the *remaining available space*, not the total pool capacity. Dividing used bytes by remaining bytes produces a ratio that exceeds 100% as the pool fills (e.g., a pool 75% full would yield 300%, not 75%).

**What was changed:** Fixed the formula to `(ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail)) * 100 > 75`, which correctly computes the percentage of total capacity in use.

**Why:** This is the same bug that was fixed in Ceph's own dashboard (PR #35768, tracker #45185). The denominator must be total effective capacity (used + available), not just available.

### 2. Annotation template used incorrect $values syntax (line 65)
**What was wrong:** The annotation `{{ $values.A }}% full` references the query result object, not its numeric value. In Grafana Unified Alerting templates, `$values.A` is an object — using it in a string would not produce the clean numeric value.

**What was changed:** Updated to `{{ $values.A.Value }}% full` to correctly access the numeric result.

**Why:** Per Grafana's template reference documentation, the `.Value` property must be used to extract the numeric value from a query result reference.

## Review Notes
- The silence API curl command omits an authentication header (`Authorization: Bearer <api-key>` or basic auth). The command structure is correct but will return 401 without auth. This is a common tutorial convention and was not changed.
- The `isEqual` field is omitted from the silence matcher payload. It defaults to `true` (positive match), which is the intended behavior here, so this is not an error.
- Newer Ceph versions (Pacific/v16+) expose a `ceph_pool_percent_used` metric that provides pool utilization directly, avoiding manual calculation. The post's approach using the formula is still valid for older versions.
- The `ceph_pool_bytes_used` metric includes replication overhead in some Ceph versions. For logical usage, `ceph_pool_stored` may be more appropriate, but the post's usage is acceptable for alerting purposes since the threshold is relative.
