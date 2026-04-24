# Validation Summary: How to Create a Node Metrics Dashboard in Grafana via Portainer - Dashboard

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana
- Prometheus
- PromQL
- Prometheus Node Exporter
- Portainer

## Sources Consulted
- Grafana documentation: Import dashboards - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana documentation: Annotate visualizations - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- Grafana documentation: Link alert rules to panels - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/link-alert-rules-to-panels/
- Grafana documentation: Create Grafana-managed alert rules - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/
- Grafana dashboard library: Node Exporter Full (ID 1860) - https://grafana.com/grafana/dashboards/1860-node-exporter-full/
- Grafana dashboard JSON for dashboard 1860 revision download - https://grafana.com/api/dashboards/1860/revisions/latest/download
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Query operators - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus node_exporter source: Linux meminfo collector - https://github.com/prometheus/node_exporter/blob/master/collector/meminfo_linux.go
- Prometheus node_exporter fixture metrics - https://raw.githubusercontent.com/prometheus/node_exporter/master/collector/fixtures/e2e-output.txt

## Issues Found
- The memory "Buffer/Cache" query omitted `node_memory_SReclaimable_bytes`, so it undercounted reclaimable cache. I updated the expression to include it.
- The swap usage query could divide by zero on hosts with no swap configured. I guarded the query so the panel only returns a value when `node_memory_SwapTotal_bytes > 0`.
- The alert-annotation section described Grafana-managed alerts but used a custom Prometheus `ALERTS` query. I replaced it with Grafana's built-in `Annotations & Alerts` flow and panel linking, which matches current Grafana behavior.
- The dashboard import section used an undocumented `/api/dashboards/import` endpoint. I replaced it with the documented Grafana UI import flow using dashboard ID `1860`.
- The alerting section assumed a generic "Disk Usage" panel and older panel flow. I corrected it to use a time series panel, current alert-rule concepts, and dashboard/panel linkage.
- I removed inline comments from the PromQL examples so the snippets are copy-pasteable as plain queries.
- I updated the disk-write display note from legacy "series override" wording to the current field override/transform terminology used by Grafana time series panels.

## Review Notes
- The PromQL examples are technically valid, but upstream Grafana dashboards commonly use `$__rate_interval` instead of a fixed `[5m]` window so rates adapt better to different dashboard time ranges.
- Several metrics in the post, including memory and systemd metrics, are Linux-specific Node Exporter metrics.
