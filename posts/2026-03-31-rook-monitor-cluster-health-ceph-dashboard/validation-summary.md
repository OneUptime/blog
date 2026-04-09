# Validation Summary: How to Monitor Cluster Health from the Ceph Dashboard

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph Dashboard (built-in mgr module)
- Prometheus Alertmanager
- Grafana
- kubectl

## Sources Consulted
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Rook documentation on the Ceph Dashboard: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph PG states documentation: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
1. **Incorrect health check code `OSD_NEAR_FULL`**: The post used `OSD_NEAR_FULL` but the correct Ceph health check code is `OSD_NEARFULL` (no underscore between NEAR and FULL). Fixed in the warnings table.
2. **Incorrect description for `OSD_NEARFULL`**: The meaning column said "Pool approaching capacity" but this health check is about individual OSD disk usage approaching the nearfull ratio, not pool-level capacity. Changed to "OSD approaching full ratio".
3. **Incorrect health check code `AUTH_INSECURE_GLOBAL_ID`**: The correct Ceph health check code is `AUTH_INSECURE_GLOBAL_ID_RECLAIM` (missing `_RECLAIM` suffix). Fixed in the warnings table.

## Review Notes
- The Alertmanager configuration uses the `match` directive, which is deprecated in newer Alertmanager versions in favor of `matchers`. The config still works but users on recent Alertmanager versions may want to use the newer syntax.
- The Grafana dashboard ID 2842 refers to a community-contributed Ceph cluster dashboard. Users should verify the dashboard is compatible with their Ceph version when importing.
- All kubectl commands correctly use `deploy/rook-ceph-tools` as the exec target, which is the standard Rook toolbox deployment.
- All Ceph CLI commands (`ceph health detail`, `ceph status`, `ceph df`, `ceph df detail`, `ceph pg stat`) are correct and current.
