# Validation Summary: How to Monitor Ceph Cluster Health and Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ceph
- Ceph Manager Prometheus module
- Ceph Dashboard
- Prometheus
- Prometheus Operator ServiceMonitor
- Rook Ceph
- Kubernetes
- Bash
- jq

## Sources Consulted
- Ceph Prometheus module documentation: https://docs.ceph.com/en/tentacle/mgr/prometheus/
- Ceph monitoring overview and Prometheus metric examples: https://docs.ceph.com/en/latest/monitoring/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph placement group monitoring and troubleshooting documentation: https://docs.ceph.com/en/quincy/rados/operations/monitoring-osd-pg/
- Ceph health checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Rook Ceph Prometheus monitoring documentation: https://rook.io/docs/rook/v1.20/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook Ceph dashboard documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook ServiceMonitor example manifest: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/service-monitor.yaml
- Rook Prometheus alert rules example: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/localrules.yaml

## Issues Found
- The Rook ServiceMonitor example omitted `honorLabels: true`, which is present in Rook's current example ServiceMonitor for the Ceph manager metrics endpoint. Added it to match the official manifest.
- The `CephPGsUnhealthy` alert used `ceph_pg_active_clean`, which is not shown in current official Ceph/Rook alert examples. Replaced it with `ceph_health_detail{name=~"PG_AVAILABILITY|PG_DEGRADED|PG_DAMAGED"} > 0`, matching Ceph's documented health-detail metric model and Rook's current alerting approach.
- The health-check script comment listed only exit codes 0, 1, and 2, but the script can exit 3 for unknown status. Updated the comment to include exit code 3.

## Review Notes
The post is generally accurate for modern Ceph and Rook deployments. Current Ceph documentation notes that daemon performance counters may be exposed via `ceph_exporter` as well as the manager Prometheus module, while the post focuses on the manager module for a concise monitoring setup.
