# Validation Summary: How to Track ceph_osd_up and ceph_osd_in Metrics

## Status
validated

## Post Type
Tutorial / Monitoring Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Prometheus (metrics and alerting)
- PromQL (Prometheus query language)
- Kubernetes (container orchestration)
- Grafana (dashboards)

## Sources Consulted
- Ceph documentation on OSD states: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph MGR Prometheus module metrics: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook documentation on monitoring: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Rook OSD pod labeling conventions: https://rook.io/docs/rook/latest/Troubleshooting/kubernetes-common-issues/

## Issues Found

1. **Misleading alert name "CephOSDNearFull"**: The alert checked OSD availability ratio (percentage of OSDs running), not storage capacity. In Ceph, "NearFull" is a well-known term referring to storage capacity approaching limits (`nearfull_ratio`). Using this name for an availability alert would cause confusion. Renamed to `CephOSDAvailabilityLow`.

2. **Incorrect PromQL comment "Bytes available per up OSD"**: The query `ceph_osd_stat_bytes * on(ceph_daemon) group_left() ceph_osd_up` multiplies total OSD capacity by the up status (0 or 1), effectively filtering to show only up OSDs. The comment implied it showed free/available bytes (which would require `ceph_osd_stat_bytes_avail`). Corrected the comment to "Total bytes for up OSDs only (filtered by up status)".

3. **Incorrect Kubernetes label selector**: `ceph_daemon_type=osd` is not the standard label used by Rook for OSD pods. Rook uses `app=rook-ceph-osd`. Corrected the label selector in the `kubectl get pods` command.

## Review Notes
- The Grafana panel section uses `sum(ceph_osd_up) by (ceph_daemon)` which is technically redundant since `ceph_osd_up` already has one value per OSD daemon. It works correctly but a plain `ceph_osd_up` would suffice. Left as-is since it is not incorrect.
- The four OSD states (up/in, down/in, up/out, down/out) are accurately described and are a useful reference.
- All PromQL queries use correct syntax and valid metric names from the Ceph MGR Prometheus module.
