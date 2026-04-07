# Validation Summary: How to Track ceph_pg_active Metric

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (Placement Groups / PG states)
- Prometheus (metrics and alerting rules)
- PromQL (metric queries)
- Grafana (dashboard panel configuration)
- Kubernetes (kubectl exec into rook-ceph-tools)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on PG states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph CLI reference for `ceph pg` commands: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Prometheus alerting rules format: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Incorrect comment on `ceph pg query` command**: The comment on line 112 stated "Force a specific PG to peer" but `ceph pg <pg-id> query` only queries the PG's state — it does not force peering. Fixed by correcting the comment to "Query a specific PG's state" and adding the actual force re-peering command `ceph pg repeer <pg-id>` as a separate entry.

## Review Notes
- The PG states table is accurate and covers the most important states, though Ceph has additional states (e.g., `remapped`, `undersized`, `incomplete`) that could be mentioned in a more comprehensive guide.
- The Prometheus metric names (`ceph_pg_active`, `ceph_pg_clean`, `ceph_pg_degraded`, `ceph_pg_total`, `ceph_pg_scrubbing`, `ceph_pg_deep_scrubbing`) are consistent with the Ceph MGR Prometheus module output.
- The alert rules use correct Prometheus alerting rule YAML syntax and valid PromQL expressions.
- The `CephPGsNotActive` alert with `for: 5m` is reasonable — brief transient inactive states can occur during normal operations (e.g., OSD restarts), so a short delay avoids false alarms while still catching real issues.
