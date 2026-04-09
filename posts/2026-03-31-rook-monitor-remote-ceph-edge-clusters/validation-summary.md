# Validation Summary: How to Monitor Remote Ceph Edge Clusters Centrally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (MGR Prometheus module, health metrics)
- Rook (Ceph operator for Kubernetes)
- Prometheus (federation, remote write, scrape configs, alerting rules)
- Alertmanager (routing by labels)
- Grafana (dashboard templating variables)
- Kubernetes (Service, NodePort)

## Sources Consulted
- Ceph documentation: MGR Prometheus module configuration (`mgr/prometheus/server_addr`, `server_port`, default port 9283) — https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus documentation: Federation endpoint `/federate`, `honor_labels`, `match[]` params — https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus documentation: Configuration reference for `remote_write`, `write_relabel_configs`, and `global.external_labels` — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus documentation: Remote write API endpoint `/api/v1/write` — https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations
- Alertmanager documentation: Route tree configuration with `match` — https://prometheus.io/docs/alerting/latest/configuration/
- Grafana documentation: Dashboard templating with `label_values()` query — https://grafana.com/docs/grafana/latest/dashboards/variables/
- Rook documentation: Ceph MGR pod labels (`app: rook-ceph-mgr`) — https://rook.io/docs/rook/latest/

## Issues Found
1. **`external_labels` incorrectly placed under `remote_write`**: In the "Push-Based Alternative with Prometheus Remote Write" section, `external_labels` was nested under the `remote_write` list entry. In Prometheus configuration, `external_labels` is only valid under the `global` section — it is not a recognized field under `remote_write` and would cause a config validation error. Fixed by moving `external_labels` under a `global:` section above the `remote_write` block. The global external labels are automatically appended to all time series sent via remote write, so the intended behavior is preserved.

## Review Notes
- The Alertmanager snippet shows only the `routes` sub-key, not a full config. This is acceptable in context since the text says "Route alerts based on site label," but readers should know this goes under the `route:` top-level key in a complete Alertmanager configuration.
- The `ceph_health_status` metric values (0 = HEALTH_OK, >0 = unhealthy) are used correctly in both the PromQL query and alert rule.
- The Rook MGR pod selector `app: rook-ceph-mgr` is correct for standard Rook deployments.
- The federation `match[]` parameters correctly combine a job selector with specific metric names.
